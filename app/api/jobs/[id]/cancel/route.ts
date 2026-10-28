import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { requestCancel } from "@/lib/agent/jobs";
import { handle } from "@/lib/http";

/** Stop a build. Credits are charged only for the work done so far. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const runId = Number((await ctx.params).id);
  const { data: run } = await admin().from("agent_runs").select("id").eq("id", runId).eq("user_id", user.id).maybeSingle();
  if (!run) throw new HttpError(404, "Build not found.");
  await requestCancel(runId);
  return NextResponse.json({ ok: true });
});
