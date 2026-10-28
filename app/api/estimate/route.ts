import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { projectAccess } from "@/lib/projects";
import { estimate } from "@/lib/agent/estimate";
import type { TierId } from "@/lib/config";
import { handle } from "@/lib/http";
import { limitByIp } from "@/lib/ratelimit";

/** Rough credit estimate for a message before it is sent (no AI call). Body: { message, projectId? } */
export const POST = handle(async (req: Request) => {
  await limitByIp(req, "estimate", 90);
  const user = await requireUser();
  const { message, projectId } = await req.json().catch(() => ({}));
  const db = admin();
  let fileCount = 0;
  if (typeof projectId === "string" && projectId) {
    await projectAccess(user.id, projectId);
    const { count } = await db.from("project_files").select("path", { count: "exact", head: true }).eq("project_id", projectId);
    fileCount = count ?? 0;
  }
  const [{ data: tier }, { data: profile }] = await Promise.all([
    db.rpc("effective_tier", { p_user: user.id }),
    db.from("profiles").select("premium_builds_used").eq("id", user.id).single(),
  ]);
  const { data: cfg } = await db.from("tiers").select("premium_build_quota").eq("id", tier ?? "free").single();
  const premiumLeft = Number(cfg?.premium_build_quota ?? 0) - Number(profile?.premium_builds_used ?? 0);
  return NextResponse.json(estimate(String(message ?? "").slice(0, 8000), fileCount, (tier ?? "free") as TierId, premiumLeft));
});
