import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { createProject } from "@/lib/projects";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const db = admin();
  const cols = "id, name, slug, published_version, updated_at";
  const [{ data: own }, { data: mem }] = await Promise.all([
    db.from("projects").select(cols).eq("owner_id", user.id).is("deleted_at", null),
    db.from("project_members").select(`projects(${cols}, deleted_at)`).eq("user_id", user.id),
  ]);
  // projects shared with the user (team members) are listed too, marked shared: true
  const shared = (mem ?? []).map((m: any) => m.projects).filter((p: any) => p && !p.deleted_at)
    .map(({ deleted_at: _d, ...p }: any) => ({ ...p, shared: true }));
  const projects = [...(own ?? []).map((p) => ({ ...p, shared: false })), ...shared]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return NextResponse.json({ projects });
});

const Body = z.object({ name: z.string().min(1).max(80), slug: z.string() });

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, "Project name is required.");
  return NextResponse.json(await createProject(user.id, parsed.data));
});
