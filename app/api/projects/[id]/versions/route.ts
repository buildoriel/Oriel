import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { projectAccess } from "@/lib/projects";
import { handle } from "@/lib/http";

/** Published versions, newest first. `live` is the version the site serves now. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const p = await projectAccess(user.id, id);
  const { data } = await admin().from("project_versions").select("version, file_count, bytes, created_at")
    .eq("project_id", id).order("version", { ascending: false }).limit(100);
  return NextResponse.json({ live: p.published_version, versions: data ?? [] });
});
