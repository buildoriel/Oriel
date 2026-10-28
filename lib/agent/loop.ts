import type Anthropic from "@anthropic-ai/sdk";
import { admin } from "../supabase/admin";
import { getBalance, spend, usdToCredits } from "../credits";
import type { TierId } from "../config";
import type { Json } from "../database.types";
import { KIND_LIMITS, pickModel, usageCostUsd, type ActionKind } from "./models";
import { routeRequest } from "./router";
import { createMessage } from "../llm";
import { AGENT_SYSTEM } from "./prompts";
import { TOOLS, TOOLS_WITH_IMAGES, IMAGE_EXT, MAX_IMAGE_BYTES, MAX_PROJECT_FILES, runTool, snapshotOf, validPath, type FileMap } from "./tools";
import { generateImage, imageEnabled } from "../llm/image";
import { githubPush } from "../connectors/actions";

const MAX_IMAGES_PER_RUN = 4;

export type AgentEvent =
  | { type: "route"; kind: ActionKind; model: string }
  | { type: "text"; text: string }
  | { type: "file"; path: string; op: "write" | "delete" }
  | { type: "cost"; credits: number }
  | { type: "commit"; url: string }
  | { type: "done"; summary: string; credits: number; balance: number }
  | { type: "error"; message: string };

type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number };
const zeroUsage = (): Usage => ({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });

/**
 * Everything needed to resume a run in a later worker slice. Stored as JSON in agent_runs.state.
 * Files are not part of it: they are saved to project_files after every step and reloaded on resume.
 */
export type AgentState = {
  v: 1;
  userMsgId: number;
  tier: TierId; kind: ActionKind; model: string;
  budgetCredits: number; maxSteps: number; maxTokens: number;
  msgs: Anthropic.MessageParam[];
  step: number; images: number; summary: string;
  costUsd: number; chargedUsd: number; chargedCredits: number;
  usage: Usage;               // usage not yet written to ai_usage
  changed: string[]; deleted: string[];
};

export type SliceResult = { state: AgentState; finished: boolean };

/** First slice: route the request, pick the model, build the cached prompt. Returns null when credits are too low. */
export async function initState(a: { userId: string; projectId: string; message: string; userMsgId: number; emit: (e: AgentEvent) => Promise<void> }): Promise<AgentState | null> {
  const db = admin();
  const [{ data: tierRow }, { data: profile }, balance, { data: fileRows }, { data: history }, { data: project }] = await Promise.all([
    db.rpc("effective_tier", { p_user: a.userId }),
    db.from("profiles").select("premium_builds_used").eq("id", a.userId).single(),
    getBalance(a.userId),
    db.from("project_files").select("path, content").eq("project_id", a.projectId),
    // chat before this request (the request itself was saved when it was queued)
    db.from("messages").select("role, content").eq("project_id", a.projectId).lt("id", a.userMsgId).order("id", { ascending: false }).limit(10),
    db.from("projects").select("supabase_url, supabase_anon_key").eq("id", a.projectId).single(),
  ]);
  const tier = (tierRow ?? "free") as TierId;
  if (balance.total < 1) return null;
  const { data: tierCfg } = await db.from("tiers").select("premium_build_quota").eq("id", tier).single();
  const premiumLeft = Number(tierCfg?.premium_build_quota ?? 0) - Number(profile?.premium_builds_used ?? 0);
  const files: FileMap = new Map((fileRows ?? []).map((f) => [f.path, f.content]));

  // Haiku router (if it fails, use a safe guess instead of failing the request)
  const route = await routeRequest(a.message, files.size).catch((e) => {
    console.error("router failed", e);
    return { kind: (files.size ? "edit" : "build") as ActionKind, costUsd: 0, usage: null };
  });
  const kind = route.kind, limits = KIND_LIMITS[kind];
  const model = pickModel(tier, kind, { premiumLeft });
  await a.emit({ type: "route", kind, model });
  if (model === "claude-opus-5-5" && tier === "pro")
    await db.from("profiles").update({ premium_builds_used: Number(profile?.premium_builds_used ?? 0) + 1 }).eq("id", a.userId);

  const supa = project?.supabase_url && project?.supabase_anon_key
    ? `<supabase url="${project.supabase_url}" anon_key="${project.supabase_anon_key}" />\n\n` : "";
  const past = (history ?? []).reverse().map((m) => `${m.role === "user" ? "Person" : "You"}: ${m.content}`).join("\n");
  const usage = zeroUsage();
  if (route.usage) for (const k of Object.keys(usage) as (keyof Usage)[]) usage[k] += Number((route.usage as any)[k] ?? 0);

  return {
    v: 1, userMsgId: a.userMsgId, tier, kind, model,
    budgetCredits: Math.min(balance.total, limits.maxCredits), maxSteps: limits.maxSteps, maxTokens: limits.maxTokens,
    // prompt caching breakpoints: 1 tools (last tool), 2 system, 3 project snapshot, 4 latest turn (moves every step)
    msgs: [{
      role: "user",
      content: [
        { type: "text", text: `<project_files>\n${snapshotOf(files)}\n</project_files>`, cache_control: { type: "ephemeral" } },
        { type: "text", text: `${supa}${past ? `<recent_chat>\n${past}\n</recent_chat>\n\n` : ""}<request kind="${kind}">\n${a.message}\n</request>` },
      ],
    }],
    step: 0, images: 0, summary: "",
    costUsd: route.costUsd, chargedUsd: 0, chargedCredits: 0, usage,
    changed: [], deleted: [],
  };
}

/**
 * Run agent steps until the run finishes, the slice deadline passes, or the user cancels.
 * Files are saved after every step (live preview); credits are charged at the end of every slice.
 */
export async function runSlice(a: {
  userId: string; projectId: string; state: AgentState; deadline: number;
  emit: (e: AgentEvent) => Promise<void>; cancelled: () => Promise<boolean>;
  /** persist the state after every step: a crash then resumes from the last finished step, and its cost is still charged */
  checkpoint: (s: AgentState) => Promise<void>;
}): Promise<SliceResult> {
  const s = a.state, db = admin();
  const { data: fileRows } = await db.from("project_files").select("path, content").eq("project_id", a.projectId);
  const files: FileMap = new Map((fileRows ?? []).map((f) => [f.path, f.content]));
  const changed = new Set(s.changed), deleted = new Set(s.deleted);
  const system: Anthropic.TextBlockParam[] = [{ type: "text", text: AGENT_SYSTEM, cache_control: { type: "ephemeral" } }];
  const tools = imageEnabled() ? TOOLS_WITH_IMAGES : TOOLS;

  if (s.budgetCredits < KIND_LIMITS[s.kind].minCredits) {
    s.summary = "Not enough credits for this request. Top up or upgrade your tier.";
  }

  /** generate_image: the image cost is added to this request's cost. */
  async function imageTool(input: { path?: string; prompt?: string; aspect_ratio?: string }, dirty: Set<string>) {
    const path = String(input?.path ?? "");
    if (!validPath(path) || !IMAGE_EXT.test(path)) return "Error: image path must end in .png, .jpg, or .webp.";
    if (s.images >= MAX_IMAGES_PER_RUN) return `Error: limit of ${MAX_IMAGES_PER_RUN} images per request reached.`;
    if (!files.has(path) && files.size >= MAX_PROJECT_FILES) return "Error: file count limit reached.";
    if (usdToCredits(s.costUsd) >= s.budgetCredits) return "Error: credit limit for this request reached.";
    try {
      const img = await generateImage(String(input?.prompt ?? ""), input?.aspect_ratio);
      s.costUsd += img.costUsd; s.images++;
      if (img.bytes > MAX_IMAGE_BYTES) return "Error: image is too large.";
      files.set(path, img.dataUrl); changed.add(path); deleted.delete(path); dirty.add(path);
      await a.emit({ type: "file", path, op: "write" });
      return `OK saved ${path} (${img.mime}, ${img.bytes} bytes)`;
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }

  // plan -> write -> fix, one model call per step
  while (!s.summary) {
    if (s.step >= s.maxSteps) { s.summary = "Step limit reached. Changes so far have been saved; send a follow-up message to continue."; break; }
    if (Date.now() > a.deadline) break;                       // continue in the next slice
    if (await a.cancelled()) { s.summary = "Stopped. Changes so far have been saved."; break; }

    const res = await createMessage({ model: s.model, max_tokens: s.maxTokens, system, tools, messages: withMovingBreakpoint(s.msgs) });
    s.step++;
    s.costUsd += usageCostUsd(s.model, res.usage);
    for (const k of Object.keys(s.usage) as (keyof Usage)[]) s.usage[k] += Number((res.usage as any)[k] ?? 0);

    s.msgs.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    const dirty = new Set<string>(), removed = new Set<string>();
    for (const b of res.content) {
      if (b.type === "text" && b.text.trim()) await a.emit({ type: "text", text: b.text });
      if (b.type !== "tool_use") continue;
      if (b.name === "generate_image") {
        results.push({ type: "tool_result", tool_use_id: b.id, content: await imageTool(b.input as any, dirty) });
        continue;
      }
      const r = runTool(files, changed, deleted, b.name, b.input);
      const path = String((b.input as any)?.path ?? "");
      if ((b.name === "write_file" || b.name === "str_replace") && r.out.startsWith("OK")) { dirty.add(path); removed.delete(path); await a.emit({ type: "file", path, op: "write" }); }
      if (b.name === "delete_file" && r.out.startsWith("OK")) { removed.add(path); dirty.delete(path); await a.emit({ type: "file", path, op: "delete" }); }
      if (r.done) s.summary = r.done;
      results.push({ type: "tool_result", tool_use_id: b.id, content: r.out.slice(0, 60_000) });
    }
    await saveFiles(a.projectId, files, dirty, removed);
    await a.emit({ type: "cost", credits: usdToCredits(s.costUsd) });

    if (res.stop_reason !== "tool_use") { s.summary ||= textOf(res.content) || "Done."; break; }
    s.msgs.push({ role: "user", content: results });
    s.changed = [...changed]; s.deleted = [...deleted];
    await a.checkpoint(s);
    if (usdToCredits(s.costUsd) >= s.budgetCredits) { s.summary = "Stopped because the credit limit for this request was reached. Changes so far have been saved."; break; }
  }

  s.changed = [...changed]; s.deleted = [...deleted];
  const outOfCredits = await chargeSlice(a.userId, a.projectId, s);
  if (outOfCredits && !s.summary) s.summary = "Your credits ran out. Changes so far have been saved.";
  return { state: s, finished: !!s.summary };
}

/** Last slice: GitHub auto-commit, chat message, done event. */
export async function finishRun(a: { userId: string; projectId: string; state: AgentState; emit: (e: AgentEvent) => Promise<void> }) {
  const s = a.state, db = admin();
  await db.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", a.projectId);
  const { data: project } = await db.from("projects").select("github_repo, github_autocommit").eq("id", a.projectId).single();
  // GitHub: every edit becomes a commit (if the user enabled it on the first push)
  if ((s.changed.length || s.deleted.length) && project?.github_repo && project.github_autocommit) {
    try { await a.emit({ type: "commit", url: (await githubPush(a.userId, a.projectId, s.summary)).url }); }
    catch (e: any) { await a.emit({ type: "text", text: `GitHub commit failed: ${e.message}` }); }
  }
  await db.from("messages").insert({ project_id: a.projectId, role: "assistant", content: s.summary, action_kind: s.kind, model: s.model, credits: s.chargedCredits });
  const balance = await getBalance(a.userId);
  await a.emit({ type: "done", summary: s.summary, credits: s.chargedCredits, balance: balance.total });
}

async function saveFiles(projectId: string, files: FileMap, dirty: Set<string>, removed: Set<string>) {
  const db = admin(), now = new Date().toISOString();
  if (dirty.size) {
    const { error } = await db.from("project_files").upsert(
      [...dirty].filter((p) => files.has(p)).map((path) => ({ project_id: projectId, path, content: files.get(path)!, updated_at: now })),
      { onConflict: "project_id,path" });
    if (error) throw error;
  }
  if (removed.size) await db.from("project_files").delete().eq("project_id", projectId).in("path", [...removed]);
}

/**
 * Charge credits for the cost since the last charge and log it to ai_usage. If the balance cannot cover
 * the full amount (spent elsewhere meanwhile), charge what is left and report that credits ran out.
 */
async function chargeSlice(userId: string, projectId: string, s: AgentState) {
  const db = admin();
  const owedCredits = Math.max(0, usdToCredits(s.costUsd) - s.chargedCredits);
  const deltaUsd = s.costUsd - s.chargedUsd;
  if (owedCredits === 0 && deltaUsd <= 0) return false;
  const balance = await getBalance(userId);
  const credits = Math.min(owedCredits, balance.total);
  // attribute the funding source for the economics calculation
  const { data: p } = await db.from("profiles").select("staked_tier").eq("id", userId).single();
  const fromMonthly = Math.min(balance.monthly, credits) >= credits / 2;
  const funded_by = !fromMonthly ? "paid" : s.tier === "free" ? "free" : p?.staked_tier === s.tier ? "staker" : "paid";
  if (credits > 0) await spend(userId, credits, "ai_usage", projectId, { model: s.model, kind: s.kind } as Json);
  await db.from("ai_usage").insert({
    user_id: userId, project_id: projectId, action_kind: s.kind, model: s.model,
    input_tokens: s.usage.input_tokens, output_tokens: s.usage.output_tokens,
    cache_read_tokens: s.usage.cache_read_input_tokens, cache_write_tokens: s.usage.cache_creation_input_tokens,
    cost_usd: deltaUsd, credits, funded_by,
  });
  s.chargedCredits += credits; s.chargedUsd = s.costUsd; s.usage = zeroUsage();
  return credits < owedCredits;
}

/** Move the cache breakpoint to the last block so earlier turns are read from cache on the next step. */
function withMovingBreakpoint(msgs: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (msgs.length < 2) return msgs;
  const out = msgs.map((m) => ({ ...m, content: Array.isArray(m.content) ? m.content.map((b) => ({ ...b })) : m.content }));
  const last = out[out.length - 1];
  if (Array.isArray(last.content) && last.content.length) {
    (last.content[last.content.length - 1] as any).cache_control = { type: "ephemeral" };
  }
  return out;
}

const textOf = (c: Anthropic.ContentBlock[]) => c.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
