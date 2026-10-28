import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { spend } from "@/lib/credits";
import { createProject } from "@/lib/projects";
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
  const { data: t } = await db.from("templates").select("*").eq("id", id).eq("published", true).maybeSingle();
  if (!t) throw new HttpError(404, "Template tidak ditemukan.");

  const proj = await createProject(user.id, { name: name || t.title, slug: String(slug ?? ""), templateId: t.id });
  // kreator memakai template sendiri: gratis
  const price = t.creator_id === user.id ? 0 : t.price_credits;
  try {
    if (price > 0) await spend(user.id, price, "template_use", t.id);
  } catch (e) { await db.from("projects").delete().eq("id", proj.id); throw e; }

  const base = `${t.source_project_id}/v${t.source_version}`;
  const files: { path: string; content: string }[] = [];
  async function walk(prefix: string) {
    const { data: items } = await db.storage.from(SITES_BUCKET).list(prefix, { limit: 1000 });
    for (const it of items ?? []) {
      const full = `${prefix}/${it.name}`;
      if (it.id === null) await walk(full);
      else {
        const { data } = await db.storage.from(SITES_BUCKET).download(full);
        if (!data) continue;
        const path = full.slice(base.length + 1);
        files.push({ path, content: await blobToContent(path, data) });
      }
    }
  }
  await walk(base);
  if (files.length) await db.from("project_files").insert(files.map((f) => ({ project_id: proj.id, ...f })));

  const royalty = price * CREDIT_PRICE_USD * TEMPLATE_ROYALTY_PCT;
  await db.from("template_uses").insert({ template_id: t.id, user_id: user.id, project_id: proj.id, credits: price, royalty_usd: royalty });
  await db.rpc("increment_template_uses", { p_template: t.id });
  return NextResponse.json({ projectId: proj.id });
});

/** File biner (gambar) disimpan di project_files sebagai data URL; teks apa adanya. */
async function blobToContent(path: string, blob: Blob) {
  if (/\.(png|jpe?g|webp|gif)$/i.test(path)) {
    const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    return `data:${blob.type || "image/png"};base64,${b64}`;
  }
  return blob.text();
}
