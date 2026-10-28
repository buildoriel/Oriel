import { admin } from "@/lib/supabase/admin";
import { fileBody, resolveSite, SITES_BUCKET } from "@/lib/hosting";
import { verifyPreview } from "@/lib/hosting/preview";
import { serveStatic, redirect } from "@/lib/hosting/serve";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";

// Menyajikan file statis hasil user. Header keamanan: situs user tidak boleh membaca cookie aplikasi
// (beda origin karena subdomain) dan tidak boleh di-frame oleh pihak lain selain workspace Oriel.
export async function GET(req: Request, ctx: { params: Promise<{ kind: string; key: string; path?: string[] }> }) {
  const { kind, key, path } = await ctx.params;
  const trailing = new URL(req.url).pathname.endsWith("/");
  if (kind === "p") return servePreview(key, path ?? [], trailing);
  if (kind !== "s" && kind !== "d") return new Response("Not found", { status: 404 });
  const site: any = await resolveSite(kind, decodeURIComponent(key));
  if (!site?.published_version) return notFound();

  const base = `${site.id}/v${site.published_version}`;
  return serveStatic((path ?? []).map(decodeURIComponent), trailing, async (rel) => {
    const { data } = await admin().storage.from(SITES_BUCKET).download(`${base}/${rel}`);
    return data ?? null;
  }, notFound, {
    "cache-control": "public, max-age=60, s-maxage=300",
    "content-security-policy": `frame-ancestors 'self' https://${ROOT}`,
  });
}

const notFound = () => new Response(
  `<!doctype html><meta charset="utf-8"><title>Tidak ditemukan</title><body style="font-family:system-ui;padding:48px;background:#F4F5F7;color:#111317"><h1>Halaman ini belum ada</h1><p>Proyek belum dipublikasikan atau alamatnya salah. <a href="https://${ROOT}">Buat situsmu sendiri di Oriel</a>.</p>`,
  { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });

/** Draf proyek dari project_files, diakses lewat token bertanda tangan di host preview terpisah. */
async function servePreview(projectId: string, path: string[], trailing: boolean) {
  const [token, ...rest] = path;
  if (!token || !verifyPreview(projectId, token)) return new Response("Preview kedaluwarsa. Muat ulang workspace.", { status: 403 });
  // akar preview harus /<id>/<token>/ (dengan garis miring) agar link relatif seperti style.css benar
  if (!rest.length && !trailing) return redirect(`${token}/`);
  return serveStatic(rest.map(decodeURIComponent), trailing, async (rel) => {
    const { data } = await admin().from("project_files").select("content").eq("project_id", projectId).eq("path", rel).maybeSingle();
    return data ? fileBody(data.content) : null;
  }, notFound, {
    "cache-control": "no-store",
    "content-security-policy": `frame-ancestors https://${ROOT} http://localhost:3000`,
  });
}
