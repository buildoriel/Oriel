import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ownProject, projectAccess } from "@/lib/projects";
import { handle } from "@/lib/http";
import type { TablesUpdate } from "@/lib/database.types";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const p = await projectAccess(user.id, (await ctx.params).id);
  return NextResponse.json({
    role: p.role,
    showcase_opt_in: p.showcase_opt_in, featured: !!p.featured_at, github_repo: p.github_repo, github_autocommit: p.github_autocommit,
    supabase_ref: p.supabase_ref, netlify_site_id: p.netlify_site_id,
  });
});

const Body = z.object({ showcase_opt_in: z.boolean().optional(), github_autocommit: z.boolean().optional(), name: z.string().min(1).max(80).optional() });

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const p = await ownProject(user.id, (await ctx.params).id);
  const b = Body.safeParse(await req.json());
  if (!b.success) throw new HttpError(400, "Invalid settings.");
  const patch: TablesUpdate<"projects"> = { ...b.data };
  // opting out of the showcase also removes the project from the home page
  if (b.data.showcase_opt_in === false) patch.featured_at = null;
  await admin().from("projects").update(patch).eq("id", p.id);
  return NextResponse.json({ ok: true });
});
