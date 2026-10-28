import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { ownProject, projectAccess } from "@/lib/projects";
import { admin } from "@/lib/supabase/admin";
import { publishProject } from "@/lib/hosting";
import { handle } from "@/lib/http";
import { ROOT_DOMAIN } from "@/lib/config";

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const p = await projectAccess(user.id, id);
  const { version, review } = await publishProject(id);
  return NextResponse.json({ version, review, url: `https://${p.slug}.${ROOT_DOMAIN}` });
});

// Unpublish (owner only): the site and its custom domains stop serving. Versions stay, so it can be published or restored again.
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const p = await ownProject(user.id, (await ctx.params).id);
  await admin().from("projects").update({ published_version: null, featured_at: null }).eq("id", p.id);
  return NextResponse.json({ ok: true });
});
