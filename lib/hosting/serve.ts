import { isPublicFile, mimeOf } from "./index";

export type Body = Blob | string | Uint8Array<ArrayBuffer>;

// Location relatif: tetap benar di balik rewrite middleware (subdomain, custom domain, preview)
export const redirect = (to: string) => new Response(null, { status: 308, headers: { location: to } });

/**
 * Pemetaan URL -> file, seperti hosting statis biasa:
 *   /            -> index.html          /about    -> about.html, atau about/index.html (lewat redirect ke /about/)
 *   /blog/       -> blog/index.html     /a.css    -> a.css
 * Redirect ke garis miring akhir penting agar link relatif di dalam blog/index.html mengarah ke folder yang benar.
 */
export async function serveStatic(
  segs: string[], trailing: boolean, load: (rel: string) => Promise<Body | null>,
  notFound: () => Response, headers: Record<string, string>,
) {
  const cache = new Map<string, Body | null>();
  const get = async (rel: string) => (cache.has(rel) ? cache.get(rel)! : cache.set(rel, await load(rel)).get(rel)!);
  const joined = segs.join("/");
  if (joined.includes("..")) return notFound();
  const last = segs.at(-1) ?? "";
  let rel: string;
  if (!joined) rel = "index.html";
  else if (trailing) rel = `${joined}/index.html`;
  else if (last.includes(".")) rel = joined;
  else {
    rel = `${joined}.html`;
    if (isPublicFile(rel) && !(await get(rel)) && (await get(`${joined}/index.html`))) return redirect(`${last}/`);
  }
  if (!isPublicFile(rel)) return notFound();
  const data = await get(rel);
  if (data == null) return notFound();
  const noStore = headers["cache-control"] === "no-store";
  return new Response(data, {
    headers: {
      "content-type": mimeOf(rel),
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      ...headers,
      ...(rel.endsWith(".html") || noStore ? {} : { "cache-control": "public, max-age=86400" }),
    },
  });
}
