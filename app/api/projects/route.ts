import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const { data } = await admin().from("projects").select("id, name, slug, published_version, updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false });
  return NextResponse.json({ projects: data ?? [] });
});

const Body = z.object({ name: z.string().min(1).max(80), slug: z.string().regex(/^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/) });

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, "Nama subdomain hanya boleh huruf kecil, angka, dan tanda hubung (3-40 karakter).");
  const { name, slug } = parsed.data;
  const db = admin();
  const { data: reserved } = await db.from("reserved_slugs").select("slug").eq("slug", slug).maybeSingle();
  if (reserved) throw new HttpError(409, "Subdomain itu dipakai sistem. Pilih nama lain.");
  const { data: tier } = await db.rpc("effective_tier", { p_user: user.id });
  const { data: cfg } = await db.from("tiers").select("max_projects").eq("id", tier).single();
  const { count } = await db.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  if (cfg.max_projects != null && (count ?? 0) >= cfg.max_projects)
    throw new HttpError(403, `Tier-mu dibatasi ${cfg.max_projects} proyek. Naikkan tier untuk menambah proyek.`);
  const { data, error } = await db.from("projects").insert({ owner_id: user.id, name, slug }).select("id, slug").single();
  if (error?.code === "23505") throw new HttpError(409, "Subdomain itu sudah dipakai. Pilih nama lain.");
  if (error) throw error;
  return NextResponse.json(data);
});
