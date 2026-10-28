import { NextResponse } from "next/server";
import { kickRunnable } from "@/lib/agent/jobs";
import { handle, requireCron } from "@/lib/http";

// Safety net for the agent queue: restarts queued builds and builds whose worker died.
export const GET = handle(async (req: Request) => {
  requireCron(req);
  return NextResponse.json({ kicked: await kickRunnable(25) });
});
