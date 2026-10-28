import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { ownProject } from "@/lib/projects";
import { previewToken } from "@/lib/hosting/preview";
import { handle } from "@/lib/http";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownProject(user.id, id);
  const host = process.env.PREVIEW_ORIGIN ?? `https://preview.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  return NextResponse.json({ url: `${host}/${id}/${previewToken(id)}/` });
});
