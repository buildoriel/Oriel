import { admin } from "@/lib/supabase/admin";
import { fileBody, resolveSite, SITES_BUCKET } from "@/lib/hosting";
import { verifyPreview } from "@/lib/hosting/preview";
import { serveStatic, redirect } from "@/lib/hosting/serve";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";

// Serves users' static files. Security headers: user sites cannot read the app's cookies
// (different origin via subdomain) and cannot be framed by anyone other than the Oriel workspace.
export async function GET(req: Request, ctx: { params: Promise<{ kind: string; key: string; path?: string[] }> }) {
  const { kind, key, path } = await ctx.params;
  const trailing = new URL(req.url).pathname.endsWith("/");
  if (kind === "p") return servePreview(key, path ?? [], trailing);
  if (kind !== "s" && kind !== "d") return new Response("Not found", { status: 404 });
  const site: any = await resolveSite(kind, decodeURIComponent(key));
  if (!site?.published_version) return notFound();
  if (site.suspended_at) return suspended();

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
  `<!doctype html><meta charset="utf-8"><title>Not found</title><body style="font-family:system-ui;padding:48px;background:#F4F5F7;color:#111317"><h1>This page doesn't exist yet</h1><p>The project hasn't been published or the address is wrong. <a href="https://${ROOT}">Build your own site on Oriel</a>.</p>`,
  { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });

/** Taken down after an abuse review. 451 tells crawlers and browsers the content was removed on purpose. */
const suspended = () => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Site unavailable</title><body style="font-family:system-ui;padding:48px;background:#F4F5F7;color:#111317"><h1>This site is unavailable</h1><p>It was taken down for violating the <a href="https://${ROOT}/terms">Oriel Terms of Service</a>.</p>`,
  { status: 451, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" } });

/** Project draft from project_files, accessed via a signed token on a separate preview host. */
async function servePreview(projectId: string, path: string[], trailing: boolean) {
  const [token, ...rest] = path;
  if (!token || !verifyPreview(projectId, token)) return new Response("Preview expired. Reload the workspace.", { status: 403 });
  // the preview root must be /<id>/<token>/ (with a trailing slash) so relative links like style.css resolve
  if (!rest.length && !trailing) return redirect(`${token}/`);
  return serveStatic(rest.map(decodeURIComponent), trailing, async (rel) => {
    const { data } = await admin().from("project_files").select("content").eq("project_id", projectId).eq("path", rel).maybeSingle();
    return data ? fileBody(data.content) : null;
  }, notFound, {
    "cache-control": "no-store",
    "content-security-policy": `frame-ancestors https://${ROOT} http://localhost:3000`,
  });
}
