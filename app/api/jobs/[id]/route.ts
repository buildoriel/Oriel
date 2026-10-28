import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

/** Progress of one build: status plus events after ?after=<last event id>. Polled by the workspace. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const runId = Number((await ctx.params).id);
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0);
  const db = admin();
  const { data: run } = await db.from("agent_runs").select("id, status, phase, finished_at, cancel_requested")
    .eq("id", runId).eq("user_id", user.id).maybeSingle();
  if (!run) throw new HttpError(404, "Build not found.");
  const { data: events } = await db.from("agent_run_events").select("id, type, data")
    .eq("run_id", runId).gt("id", Number.isFinite(after) ? after : 0).order("id").limit(200);
  // position in the global queue while waiting for a worker slot
  let ahead = 0;
  if (!run.finished_at && run.phase === "queued") {
    const { data: me } = await db.from("agent_runs").select("started_at").eq("id", runId).single();
    const { count } = await db.from("agent_runs").select("id", { count: "exact", head: true })
      .is("finished_at", null).eq("phase", "queued").lt("started_at", me?.started_at ?? new Date().toISOString());
    ahead = count ?? 0;
  }
  return NextResponse.json({
    status: run.finished_at ? run.status : run.phase, stopping: run.cancel_requested && !run.finished_at, ahead,
    events: (events ?? []).map((e) => ({ id: e.id, type: e.type, ...(e.data as object) })),
  });
});
