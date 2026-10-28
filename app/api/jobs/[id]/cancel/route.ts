import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { requestCancel } from "@/lib/agent/jobs";
import { handle } from "@/lib/http";

/** Stop a build. Credits are charged only for the work done so far. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const runId = Number((await ctx.params).id);
  const db = admin();
  const { data: run } = await db.from("agent_runs").select("id, user_id, project_id").eq("id", runId).maybeSingle();
  if (!run) throw new HttpError(404, "Build not found.");
  // the run's author or the project owner may stop it
  if (run.user_id !== user.id) {
    const { data: p } = await db.from("projects").select("owner_id").eq("id", run.project_id).maybeSingle();
    if (p?.owner_id !== user.id) throw new HttpError(404, "Build not found.");
  }
  await requestCancel(runId);
  return NextResponse.json({ ok: true });
});
