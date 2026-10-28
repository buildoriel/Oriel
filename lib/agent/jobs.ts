import { admin } from "../supabase/admin";
import type { Json } from "../database.types";
import { finishRun, initState, runSlice, type AgentEvent, type AgentState } from "./loop";
import { notifyBuildDone } from "../email";

/**
 * Durable agent queue on Postgres (table agent_runs).
 *
 *   chat request ──enqueue──▶ agent_runs (phase queued) ──kick──▶ POST /api/jobs/work ──after()──▶ workRun()
 *   workRun: claim lease ▶ run agent steps until SLICE_MS ▶ save state ▶ release + kick again (or finish)
 *   /api/cron/jobs (every minute) re-kicks anything queued or whose worker died (expired lease)
 *
 * The workspace polls agent_run_events, so closing the tab does not stop a build.
 */
export const SLICE_MS = Number(process.env.AGENT_SLICE_SECONDS ?? 150) * 1000;  // stop starting new steps after this
const LEASE_SECONDS = 330;                                                       // > worker maxDuration (300 s)
const MAX_WORKING = Number(process.env.AGENT_MAX_CONCURRENCY ?? 25);
const MAX_ATTEMPTS = 6;                                                          // slices + retries before giving up
const RETRY_BACKOFF_SECONDS = 60;

export async function emitEvent(runId: number, e: AgentEvent) {
  const { type, ...data } = e;
  await admin().from("agent_run_events").insert({ run_id: runId, type, data: data as Json });
}

/** Save the request to the chat and queue it. Returns null when this user already has a build running. */
export async function enqueueRun(userId: string, projectId: string, message: string, attachments?: Json) {
  const db = admin();
  const { data: runId, error } = await db.rpc("enqueue_agent_run", { p_user: userId, p_project: projectId, p_message: message });
  if (error) throw error;
  if (!runId) return null;
  await db.from("messages").insert({ project_id: projectId, role: "user", content: message, attachments: attachments ?? null });
  return runId;
}

/** Ask a worker to process a run. Best effort: if this fails, the cron picks the run up within a minute. */
export async function kick(runId: number) {
  const base = process.env.JOBS_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    await fetch(`${base}/api/jobs/work`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, "content-type": "application/json" },
      body: JSON.stringify({ runId }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error(`kick ${runId} failed; cron will retry`, e);
  }
}

/** Kick queued runs and runs whose worker died. Called by the cron and after each finished run. */
export async function kickRunnable(limit = 10) {
  const db = admin();
  const now = new Date().toISOString();
  const { data } = await db.from("agent_runs").select("id, attempts")
    .is("finished_at", null).or(`lease_until.is.null,lease_until.lt."${now}"`)
    .order("started_at", { ascending: true }).limit(limit);
  for (const r of data ?? []) {
    if (r.attempts >= MAX_ATTEMPTS) await fail(r.id, "Build failed after several attempts. Send your message again.");
    else await kick(r.id);
  }
  return data?.length ?? 0;
}

/** One worker slice for one run. Safe to call for any run id: it does nothing unless it wins the lease. */
export async function workRun(runId: number) {
  const db = admin();
  const { data: claimed } = await db.rpc("claim_agent_run", { p_run: runId, p_lease_seconds: LEASE_SECONDS, p_max_working: MAX_WORKING });
  if (!claimed) return "not_claimed";
  const { data: run } = await db.from("agent_runs").select("*").eq("id", runId).single();
  if (!run) return "missing";
  const emit = (e: AgentEvent) => emitEvent(runId, e);
  const deadline = Date.now() + SLICE_MS;

  try {
    if (run.cancel_requested && !run.state) return await cancelUnstarted(run.id, run.project_id);
    let state = run.state as unknown as AgentState | null;
    if (!state) {
      const { data: msg } = await db.from("messages").select("id").eq("project_id", run.project_id).eq("role", "user")
        .order("id", { ascending: false }).limit(1).single();
      state = await initState({ userId: run.user_id, projectId: run.project_id, message: run.message, userMsgId: msg?.id ?? 0, emit });
      if (!state) {
        await emit({ type: "error", message: "Not enough credits. Top up or upgrade your tier." });
        return await close(runId, "error", "insufficient_credits");
      }
    }
    const res = await runSlice({
      userId: run.user_id, projectId: run.project_id, state, deadline, emit,
      cancelled: async () => !!(await db.from("agent_runs").select("cancel_requested").eq("id", runId).single()).data?.cancel_requested,
      checkpoint: async (s) => { await db.from("agent_runs").update({ state: s as unknown as Json }).eq("id", runId); },
    });
    if (res.finished) {
      await finishRun({ userId: run.user_id, projectId: run.project_id, state: res.state, emit });
      await close(runId, "done", null, res.state);
      await notifyBuildDone({ userId: run.user_id, projectId: run.project_id, startedAt: run.started_at, ok: true });
      await kickRunnable(3);                                   // let the next queued build start right away
      return "done";
    }
    // more work: save state, release the lease, and continue in a fresh function invocation
    await db.from("agent_runs").update({ state: res.state as unknown as Json, phase: "queued", lease_until: null, attempts: 0 }).eq("id", runId);
    await kick(runId);
    return "continued";
  } catch (e: any) {
    console.error(`run ${runId} slice failed`, e);
    if (run.attempts >= MAX_ATTEMPTS) return await fail(runId, "Build failed. Changes so far have been saved; send your message again to continue.");
    // retry after a short backoff (the lease doubles as the backoff timer while queued)
    await db.from("agent_runs").update({ phase: "queued", lease_until: new Date(Date.now() + RETRY_BACKOFF_SECONDS * 1000).toISOString(), error: String(e?.message ?? e).slice(0, 500) }).eq("id", runId);
    return "retry";
  }
}

async function close(runId: number, status: "done" | "error", error: string | null, state?: AgentState) {
  await admin().from("agent_runs").update({
    status, error, finished_at: new Date().toISOString(), lease_until: null, ...(state ? { state: state as unknown as Json } : {}),
  }).eq("id", runId);
  return status;
}

async function fail(runId: number, message: string) {
  const db = admin();
  const { data: run } = await db.from("agent_runs").select("project_id, user_id, started_at").eq("id", runId).single();
  await emitEvent(runId, { type: "error", message });
  if (run) await db.from("messages").insert({ project_id: run.project_id, role: "assistant", content: message });
  const status = await close(runId, "error", "failed");
  if (run) await notifyBuildDone({ userId: run.user_id, projectId: run.project_id, startedAt: run.started_at, ok: false });
  return status;
}

async function cancelUnstarted(runId: number, projectId: string) {
  await emitEvent(runId, { type: "done", summary: "Cancelled before it started.", credits: 0, balance: -1 });
  await admin().from("messages").insert({ project_id: projectId, role: "assistant", content: "Cancelled before it started." });
  return close(runId, "error", "cancelled");
}

/** User pressed Stop. A run that has not started yet is closed now; a working one stops after its current step. */
export async function requestCancel(runId: number) {
  const db = admin();
  await db.from("agent_runs").update({ cancel_requested: true }).eq("id", runId).is("finished_at", null);
  const { data: run } = await db.from("agent_runs").select("id, project_id, state, phase, lease_until, finished_at").eq("id", runId).single();
  const idle = run && !run.finished_at && !run.state && run.phase === "queued";
  if (idle) {
    // claim it so no worker starts it in the meantime
    const { data: claimed } = await db.rpc("claim_agent_run", { p_run: runId, p_lease_seconds: 60, p_max_working: 1_000_000 });
    if (claimed) await cancelUnstarted(run.id, run.project_id);
  }
}
