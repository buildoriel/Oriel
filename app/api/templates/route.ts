import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ownProject } from "@/lib/projects";
import { handle } from "@/lib/http";

export const GET = handle(async (req: Request) => {
  const cat = new URL(req.url).searchParams.get("category");
  let q = admin().from("templates").select("id, title, description, category, price_credits, uses, creator_id, profiles(handle), source:projects!templates_source_project_id_fkey(slug)").eq("published", true).order("uses", { ascending: false }).limit(60);
  if (cat) q = q.eq("category", cat);
  const { data } = await q;
  return NextResponse.json({ templates: data ?? [] });
});

const Body = z.object({
  projectId: z.string().uuid(), title: z.string().min(3).max(60), description: z.string().max(280).default(""),
  category: z.enum(["landing", "store", "portfolio", "blog", "dashboard", "deck", "community", "business"]),
  priceCredits: z.number().int().min(0).max(5000),
});

// Menjual template = membekukan versi publikasi terakhir proyek.
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = Body.safeParse(await req.json());
  if (!b.success) throw new HttpError(400, "Data template tidak lengkap.");
  const p = await ownProject(user.id, b.data.projectId);
  if (!p.published_version) throw new HttpError(400, "Publish proyek dulu sebelum dijual sebagai template.");
  const { data, error } = await admin().from("templates").insert({
    creator_id: user.id, source_project_id: p.id, source_version: p.published_version, title: b.data.title,
    description: b.data.description, category: b.data.category, price_credits: b.data.priceCredits, published: true,
  }).select("id").single();
  if (error) throw error;
  return NextResponse.json(data);
});
