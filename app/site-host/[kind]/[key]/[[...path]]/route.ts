import { admin } from "@/lib/supabase/admin";
import { mimeOf, resolveSite, SITES_BUCKET } from "@/lib/hosting";
import { verifyPreview } from "@/lib/hosting/preview";

// Menyajikan file statis hasil user. Header keamanan: situs user tidak boleh membaca cookie aplikasi
// (beda origin karena subdomain) dan tidak boleh di-frame oleh pihak lain selain workspace Oriel.
export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; key: string; path?: string[] }> }) {
  const { kind, key, path } = await ctx.params;
  if (kind === "p") return servePreview(key, path ?? []);
  if (kind !== "s" && kind !== "d") return new Response("Not found", { status: 404 });
  const site: any = await resolveSite(kind, decodeURIComponent(key));
  if (!site?.published_version) return notFound();

  let rel = (path ?? []).map(decodeURIComponent).join("/");
  if (!rel || rel.endsWith("/")) rel += "index.html";
  if (rel.includes("..")) return notFound();
  if (!rel.split("/").pop()!.includes(".")) rel += ".html"; // /about -> about.html

  const base = `${site.id}/v${site.published_version}`;
  let { data, error } = await admin().storage.from(SITES_BUCKET).download(`${base}/${rel}`);
  if (error && rel.endsWith(".html") && !rel.endsWith("index.html")) {
    ({ data, error } = await admin().storage.from(SITES_BUCKET).download(`${base}/${rel.replace(/\.html$/, "/index.html")}`));
  }
  if (error || !data) return notFound();
  return new Response(data, {
    headers: {
      "content-type": mimeOf(rel),
      "cache-control": rel.endsWith(".html") ? "public, max-age=60, s-maxage=300" : "public, max-age=86400",
      "x-content-type-options": "nosniff",
      "content-security-policy": `frame-ancestors 'self' https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com"}`,
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}

const notFound = () => new Response(
  `<!doctype html><meta charset="utf-8"><title>Tidak ditemukan</title><body style="font-family:system-ui;padding:48px;background:#F4F5F7;color:#111317"><h1>Halaman ini belum ada</h1><p>Proyek belum dipublikasikan atau alamatnya salah. <a href="https://buildoriel.com">Buat situsmu sendiri di Oriel</a>.</p>`,
  { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });

/** Draf proyek dari project_files, diakses lewat token bertanda tangan di host preview terpisah. */
async function servePreview(projectId: string, path: string[]) {
  const [token, ...rest] = path;
  if (!token || !verifyPreview(projectId, token)) return new Response("Preview kedaluwarsa. Muat ulang workspace.", { status: 403 });
  let rel = rest.map(decodeURIComponent).join("/") || "index.html";
  if (rel.endsWith("/")) rel += "index.html";
  if (!rel.split("/").pop()!.includes(".")) rel += ".html";
  const { data } = await admin().from("project_files").select("content").eq("project_id", projectId).eq("path", rel).maybeSingle();
  if (!data) return notFound();
  return new Response(data.content, { headers: { "content-type": mimeOf(rel), "cache-control": "no-store",
    "content-security-policy": `frame-ancestors https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com"} http://localhost:3000` } });
}
