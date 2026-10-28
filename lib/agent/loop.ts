import type Anthropic from "@anthropic-ai/sdk";
import { admin } from "../supabase/admin";
import { getBalance, spend, usdToCredits } from "../credits";
import type { TierId } from "../config";
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


export async function runAgent(opts: {
  userId: string; projectId: string; message: string; emit: (e: AgentEvent) => void;
}) {
  const { userId, projectId, message, emit } = opts;
  const db = admin();

  // ---- konteks: tier, saldo, file proyek, riwayat chat ----
  const [{ data: tierRow }, { data: profile }, balance, { data: fileRows }, { data: history }, { data: project }] = await Promise.all([
    db.rpc("effective_tier", { p_user: userId }),
    db.from("profiles").select("premium_builds_used, staked_tier").eq("id", userId).single(),
    getBalance(userId),
    db.from("project_files").select("path, content").eq("project_id", projectId),
    db.from("messages").select("role, content").eq("project_id", projectId).order("id", { ascending: false }).limit(10),
    db.from("projects").select("github_repo, github_autocommit, supabase_url, supabase_anon_key").eq("id", projectId).single(),
  ]);
  const tier = (tierRow ?? "free") as TierId;
  const { data: tierCfg } = await db.from("tiers").select("premium_build_quota").eq("id", tier).single();
  const premiumLeft = Number(tierCfg?.premium_build_quota ?? 0) - Number(profile?.premium_builds_used ?? 0);

  const files: FileMap = new Map((fileRows ?? []).map((f: any) => [f.path, f.content]));
  if (balance.total < 1) throw new Error("INSUFFICIENT_CREDITS");

  // ---- 1. router Haiku (bila router gagal, pakai tebakan aman tanpa menggagalkan permintaan) ----
  const route = await routeRequest(message, files.size).catch((e) => {
    console.error("router gagal", e);
    return { kind: (files.size ? "edit" : "build") as ActionKind, costUsd: 0, usage: null as any };
  });
  let costUsd = route.costUsd;
  const kind = route.kind;
  const limits = KIND_LIMITS[kind];
  const model = pickModel(tier, kind, { premiumLeft });
  emit({ type: "route", kind, model });

  const budgetCredits = Math.min(balance.total, limits.maxCredits);
  if (budgetCredits < limits.minCredits) {
    // tetap tagih biaya router
    await chargeAndLog({ userId, projectId, kind: "edit", model: "claude-haiku-5-5", costUsd, usage: route.usage, balance, tier, actionKind: "route" });
    throw new Error("INSUFFICIENT_CREDITS");
  }

  // ---- 2. susun prompt dengan prompt caching ----
  // breakpoint 1: tools (pada tool terakhir), 2: system, 3: snapshot proyek, 4: giliran terakhir (bergeser tiap langkah)
  const snapshot = snapshotOf(files);
  const tools = imageEnabled() ? TOOLS_WITH_IMAGES : TOOLS;
  const supa = project?.supabase_url && project?.supabase_anon_key
    ? `<supabase url="${project.supabase_url}" anon_key="${project.supabase_anon_key}" />\n\n` : "";
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: AGENT_SYSTEM, cache_control: { type: "ephemeral" } },
  ];
  const past = (history ?? []).reverse().map((m: any) => `${m.role === "user" ? "Person" : "You"}: ${m.content}`).join("\n");
  const msgs: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        { type: "text", text: `<project_files>\n${snapshot}\n</project_files>`, cache_control: { type: "ephemeral" } },
        { type: "text", text: `${supa}${past ? `<recent_chat>\n${past}\n</recent_chat>\n\n` : ""}<request kind="${kind}">\n${message}\n</request>` },
      ],
    },
  ];

  const changed = new Set<string>(), deleted = new Set<string>();
  let images = 0;
  let summary = "", usageAgg = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

  /** generate_image: biaya gambar ikut dihitung ke biaya permintaan ini. */
  async function imageTool(input: { path?: string; prompt?: string; aspect_ratio?: string }) {
    const path = String(input?.path ?? "");
    if (!validPath(path) || !IMAGE_EXT.test(path)) return "Error: path gambar harus berakhiran .png, .jpg, atau .webp.";
    if (images >= MAX_IMAGES_PER_RUN) return `Error: batas ${MAX_IMAGES_PER_RUN} gambar per permintaan tercapai.`;
    if (!files.has(path) && files.size >= MAX_PROJECT_FILES) return "Error: batas jumlah file tercapai.";
    if (usdToCredits(costUsd) >= budgetCredits) return "Error: batas kredit untuk permintaan ini tercapai.";
    try {
      const img = await generateImage(String(input?.prompt ?? ""), input?.aspect_ratio);
      costUsd += img.costUsd; images++;
      if (img.bytes > MAX_IMAGE_BYTES) return "Error: gambar terlalu besar.";
      files.set(path, img.dataUrl); changed.add(path); deleted.delete(path);
      emit({ type: "file", path, op: "write" });
      emit({ type: "cost", credits: usdToCredits(costUsd) });
      return `OK saved ${path} (${img.mime}, ${img.bytes} bytes)`;
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }

  // ---- 3. agent loop: rencanakan -> tulis -> perbaiki ----
  for (let step = 0; step < limits.maxSteps && !summary; step++) {
    const res = await createMessage({
      model, max_tokens: limits.maxTokens, system, tools, messages: withMovingBreakpoint(msgs),
    });
    costUsd += usageCostUsd(model, res.usage);
    for (const k of Object.keys(usageAgg) as (keyof typeof usageAgg)[]) usageAgg[k] += Number((res.usage as any)[k] ?? 0);
    emit({ type: "cost", credits: usdToCredits(costUsd) });

    msgs.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const b of res.content) {
      if (b.type === "text" && b.text.trim()) emit({ type: "text", text: b.text });
      if (b.type !== "tool_use") continue;
      if (b.name === "generate_image") {
        const r = await imageTool(b.input as any);
        results.push({ type: "tool_result", tool_use_id: b.id, content: r });
        continue;
      }
      const r = runTool(files, changed, deleted, b.name, b.input);
      if (b.name === "write_file" || b.name === "str_replace") emit({ type: "file", path: (b.input as any).path, op: "write" });
      if (b.name === "delete_file") emit({ type: "file", path: (b.input as any).path, op: "delete" });
      if (r.done) summary = r.done;
      results.push({ type: "tool_result", tool_use_id: b.id, content: r.out.slice(0, 60_000) });
    }
    if (res.stop_reason !== "tool_use") { summary ||= textOf(res.content) || "Selesai."; break; }
    msgs.push({ role: "user", content: results });

    // hentikan bila biaya berjalan melewati plafon
    if (usdToCredits(costUsd) >= budgetCredits) { summary = "Berhenti karena batas kredit untuk permintaan ini tercapai. Perubahan sejauh ini sudah disimpan."; break; }
  }
  if (!summary) summary = "Batas langkah tercapai. Perubahan sejauh ini sudah disimpan; kirim pesan lanjutan untuk meneruskan.";

  // ---- 4. simpan file ----
  const now = new Date().toISOString();
  if (changed.size) {
    await db.from("project_files").upsert(
      [...changed].map((path) => ({ project_id: projectId, path, content: files.get(path)!, updated_at: now })),
      { onConflict: "project_id,path" });
  }
  if (deleted.size) await db.from("project_files").delete().eq("project_id", projectId).in("path", [...deleted]);
  await db.from("projects").update({ updated_at: now }).eq("id", projectId);

  // GitHub: setiap edit menjadi commit (bila user mengaktifkannya saat push pertama)
  if ((changed.size || deleted.size) && project?.github_repo && project?.github_autocommit) {
    try { emit({ type: "commit", url: (await githubPush(userId, projectId, summary)).url }); }
    catch (e: any) { emit({ type: "text", text: `Commit ke GitHub gagal: ${e.message}` }); }
  }

  // ---- 5. potong kredit sesuai biaya aktual ----
  const credits = Math.min(usdToCredits(costUsd), balance.total);
  const newBalance = await chargeAndLog({ userId, projectId, kind, model, costUsd, usage: usageAgg, balance, tier, actionKind: kind, credits });
  if (model === "claude-opus-5-5" && tier === "pro")
    await db.from("profiles").update({ premium_builds_used: Number(profile?.premium_builds_used ?? 0) + 1 }).eq("id", userId);

  await db.from("messages").insert([
    { project_id: projectId, role: "user", content: message },
    { project_id: projectId, role: "assistant", content: summary, action_kind: kind, model, credits },
  ]);
  emit({ type: "done", summary, credits, balance: newBalance });
}

async function chargeAndLog(a: {
  userId: string; projectId: string; kind: ActionKind; model: string; costUsd: number; usage: any;
  balance: { monthly: number; total: number }; tier: TierId; actionKind: string; credits?: number;
}) {
  const credits = a.credits ?? usdToCredits(a.costUsd);
  // atribusi sumber dana untuk perhitungan ekonomi
  const { data: p } = await admin().from("profiles").select("staked_tier").eq("id", a.userId).single();
  const fromMonthly = Math.min(a.balance.monthly, credits) >= credits / 2;
  const funded_by = !fromMonthly ? "paid" : a.tier === "free" ? "free" : p?.staked_tier === a.tier ? "staker" : "paid";
  const bal = await spend(a.userId, credits, "ai_usage", a.projectId, { model: a.model, kind: a.actionKind });
  await admin().from("ai_usage").insert({
    user_id: a.userId, project_id: a.projectId, action_kind: a.actionKind, model: a.model,
    input_tokens: a.usage?.input_tokens ?? 0, output_tokens: a.usage?.output_tokens ?? 0,
    cache_read_tokens: a.usage?.cache_read_input_tokens ?? 0, cache_write_tokens: a.usage?.cache_creation_input_tokens ?? 0,
    cost_usd: a.costUsd, credits, funded_by,
  });
  return bal;
}

/** Pindahkan breakpoint cache ke blok terakhir agar giliran sebelumnya dibaca dari cache di langkah berikutnya. */
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
