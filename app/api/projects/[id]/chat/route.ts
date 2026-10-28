import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { projectAccess } from "@/lib/projects";
import { getBalance } from "@/lib/credits";
import { enqueueRun, kick } from "@/lib/agent/jobs";
import { handle } from "@/lib/http";
import { MAX_ATTACHMENTS, isUploadPath, uploadType, type Attachment } from "@/lib/uploads";

const RUNS_PER_HOUR = Number(process.env.AGENT_RUNS_PER_HOUR ?? 40);

/**
 * Queue a build. The agent runs in the background (lib/agent/jobs.ts); the workspace polls
 * /api/jobs/<runId> for progress, so a closed tab or a long build does not lose work.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await projectAccess(user.id, id);
  const { message, attachments: raw } = await req.json();
  if (typeof message !== "string" || !message.trim() || message.length > 8000)
    throw new HttpError(400, "Message is empty or too long (max 8,000 characters).");
  const attachments = await checkAttachments(id, raw);

  // usage limits: max N requests per hour, and only one build per user at a time
  // (two parallel builds could both pass the balance check and then charge credits twice)
  const db = admin();
  const { count } = await db.from("agent_runs").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("started_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= RUNS_PER_HOUR) throw new HttpError(429, "Too many requests in one hour. Try again shortly.");
  // team projects: one build per project at a time, so two members never write the same files at once
  const { data: busy } = await db.from("agent_runs").select("id").eq("project_id", id).is("finished_at", null)
    .or(`lease_until.gt.${new Date().toISOString()},started_at.gt.${new Date(Date.now() - 30 * 60_000).toISOString()}`).limit(1).maybeSingle();
  if (busy) throw new HttpError(409, "A build is already running on this project. Wait until it finishes.");
  if ((await getBalance(user.id)).total < 1) throw new HttpError(402, "Not enough credits. Top up or upgrade your tier.");

  const runId = await enqueueRun(user.id, id, message.trim());
  if (!runId) throw new HttpError(409, "A build is still running. Wait until it finishes or stop it.");
  if (attachments.length) {
    const { data: msg } = await db.from("messages").select("id").eq("project_id", id).eq("role", "user").order("id", { ascending: false }).limit(1).single();
    if (msg) await db.from("messages").update({ attachments }).eq("id", msg.id);
  }
  await kick(runId);
  return NextResponse.json({ runId });
});

/** Attachments are files uploaded to assets/uploads/ just before sending (see ../upload). Only paths that exist in the project are kept. */
async function checkAttachments(projectId: string, raw: unknown): Promise<Attachment[]> {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_ATTACHMENTS) throw new HttpError(400, `Attach at most ${MAX_ATTACHMENTS} files per message.`);
  const list = raw.map((a: any) => ({ path: String(a?.path ?? ""), name: String(a?.name ?? "").slice(0, 120), size: Math.max(0, Math.floor(Number(a?.size) || 0)) }));
  if (list.some((a) => !isUploadPath(a.path) || !uploadType(a.path))) throw new HttpError(400, "Invalid attachment.");
  const { data } = await admin().from("project_files").select("path").eq("project_id", projectId).in("path", list.map((a) => a.path));
  const found = new Set((data ?? []).map((r) => r.path));
  return list.filter((a) => found.has(a.path)).map((a) => ({ ...a, name: a.name || a.path.split("/").pop()!, type: uploadType(a.path)!.type }));
}
