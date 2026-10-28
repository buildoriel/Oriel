import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ownProject } from "@/lib/projects";
import { getBalance } from "@/lib/credits";
import { enqueueRun, kick } from "@/lib/agent/jobs";
import { handle } from "@/lib/http";

const RUNS_PER_HOUR = Number(process.env.AGENT_RUNS_PER_HOUR ?? 40);

/**
 * Queue a build. The agent runs in the background (lib/agent/jobs.ts); the workspace polls
 * /api/jobs/<runId> for progress, so a closed tab or a long build does not lose work.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownProject(user.id, id);
  const { message } = await req.json();
  if (typeof message !== "string" || !message.trim() || message.length > 8000)
    throw new HttpError(400, "Message is empty or too long (max 8,000 characters).");

  // usage limits: max N requests per hour, and only one build per user at a time
  // (two parallel builds could both pass the balance check and then charge credits twice)
  const db = admin();
  const { count } = await db.from("agent_runs").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("started_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= RUNS_PER_HOUR) throw new HttpError(429, "Too many requests in one hour. Try again shortly.");
  if ((await getBalance(user.id)).total < 1) throw new HttpError(402, "Not enough credits. Top up or upgrade your tier.");

  const runId = await enqueueRun(user.id, id, message.trim());
  if (!runId) throw new HttpError(409, "A build is still running. Wait until it finishes or stop it.");
  await kick(runId);
  return NextResponse.json({ runId });
});
