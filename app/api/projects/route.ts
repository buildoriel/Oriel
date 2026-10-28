import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { createProject } from "@/lib/projects";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const { data } = await admin().from("projects").select("id, name, slug, published_version, updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false });
  return NextResponse.json({ projects: data ?? [] });
});

const Body = z.object({ name: z.string().min(1).max(80), slug: z.string() });

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, "Project name is required.");
  return NextResponse.json(await createProject(user.id, parsed.data));
});
