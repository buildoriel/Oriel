import { after, NextResponse } from "next/server";
import { workRun } from "@/lib/agent/jobs";
import { handle, requireCron } from "@/lib/http";

// One worker slice runs inside this function after the response is sent (see SLICE_MS in lib/agent/jobs.ts).
export const maxDuration = 300;

/** Internal: called by kick() and the jobs cron with the CRON_SECRET bearer token. */
export const POST = handle(async (req: Request) => {
  requireCron(req);
  const { runId } = await req.json();
  if (!Number.isInteger(runId)) return NextResponse.json({ error: "runId required" }, { status: 400 });
  after(async () => {
    try { await workRun(runId); } catch (e) { console.error(`worker ${runId}`, e); }
  });
  return NextResponse.json({ accepted: true }, { status: 202 });
});
