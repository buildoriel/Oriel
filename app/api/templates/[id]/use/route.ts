import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { spend } from "@/lib/credits";
import { SITES_BUCKET } from "@/lib/hosting";
import { CREDIT_PRICE_USD, TEMPLATE_ROYALTY_PCT } from "@/lib/config";
import { handle } from "@/lib/http";

/**
 * Memakai template: potong kredit pembeli, salin file versi beku ke proyek baru,
 * catat royalti kreator (X% dari nilai jual kredit) yang dibayar USDG secara berkala.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { slug, name } = await req.json();
  const db = admin();
  const { data: t } = await db.from("templates").select("*").eq("id", id).eq("published", true).single();
  if (!t) throw new HttpError(404, "Template tidak ditemukan.");

  const { data: proj, error } = await db.from("projects").insert({ owner_id: user.id, name: name || t.title, slug, template_id: t.id }).select("id").single();
  if (error?.code === "23505") throw new HttpError(409, "Subdomain itu sudah dipakai.");
  if (error) throw new HttpError(400, "Subdomain tidak valid.");

  try {
    if (t.price_credits > 0) await spend(user.id, t.price_credits, "template_use", t.id);
  } catch (e) { await db.from("projects").delete().eq("id", proj.id); throw e; }

  const base = `${t.source_project_id}/v${t.source_version}`;
  const { data: list } = await db.storage.from(SITES_BUCKET).list(base, { limit: 1000 });
  const files: { path: string; content: string }[] = [];
  async function walk(prefix: string, items: any[]) {
    for (const it of items) {
      const full = `${prefix}/${it.name}`;
      if (it.id === null) { const { data: sub } = await db.storage.from(SITES_BUCKET).list(full, { limit: 1000 }); await walk(full, sub ?? []); }
      else { const { data } = await db.storage.from(SITES_BUCKET).download(full); files.push({ path: full.slice(base.length + 1), content: await data!.text() }); }
    }
  }
  await walk(base, list ?? []);
  if (files.length) await db.from("project_files").insert(files.map((f) => ({ project_id: proj.id, ...f })));

  const royalty = t.creator_id === user.id ? 0 : t.price_credits * CREDIT_PRICE_USD * TEMPLATE_ROYALTY_PCT;
  await db.from("template_uses").insert({ template_id: t.id, user_id: user.id, project_id: proj.id, credits: t.price_credits, royalty_usd: royalty });
  await db.from("templates").update({ uses: t.uses + 1 }).eq("id", t.id);
  return NextResponse.json({ projectId: proj.id });
});
