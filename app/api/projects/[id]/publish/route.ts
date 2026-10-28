import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { projectAccess } from "@/lib/projects";
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
