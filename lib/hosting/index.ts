import { admin } from "../supabase/admin";
import { HttpError } from "../supabase/server";
import { PRIVATE_FILE, dataUrlBytes, isDataUrl } from "../agent/tools";
import { scanProject, type Finding } from "../moderation/scan";
import { ROOT_DOMAIN } from "../config";

export const SITES_BUCKET = "sites";
const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8", json: "application/json", svg: "image/svg+xml", txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8", csv: "text/csv; charset=utf-8", xml: "application/xml", webmanifest: "application/manifest+json",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", ico: "image/x-icon",
};
export const mimeOf = (p: string) => MIME[p.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";

/** File content ready to serve: images (data URLs) become bytes, text stays as is. */
export function fileBody(content: string): string | Uint8Array<ArrayBuffer> {
  if (!isDataUrl(content)) return content;
  const b = dataUrlBytes(content);
  const out = new Uint8Array(new ArrayBuffer(b.length));
  out.set(b);
  return out;
}
/** Files that may be public on the internet (SQL schemas etc. are owner-only). */
export const isPublicFile = (path: string) => !PRIVATE_FILE.test(path);

/**
 * Automatic abuse report for findings that need a human look. One open auto report per project:
 * a later publish updates it instead of piling up duplicates.
 */
async function fileScanReport(projectId: string, slug: string, findings: Finding[]) {
  const db = admin();
  const details = findings.map((f) => `[${f.rule}] ${f.file}: ${f.message}`).join("\n").slice(0, 2000);
  const { data: open } = await db.from("abuse_reports").select("id").eq("project_id", projectId).eq("source", "auto_scan").eq("status", "open").maybeSingle();
  if (open) return void (await db.from("abuse_reports").update({ details, category: findings[0].category }).eq("id", open.id));
  await db.from("abuse_reports").insert({
    url: `https://${slug}.${ROOT_DOMAIN}/`, hostname: `${slug}.${ROOT_DOMAIN}`, project_id: projectId,
    category: findings[0].category, details, source: "auto_scan", ip_hash: "auto_scan",
  });
}

/** Copy the project's working files into an immutable version in Storage: sites/<projectId>/v<N>/<path> */
export async function publishProject(projectId: string) {
  const db = admin();
  const { data: proj } = await db.from("projects").select("slug, suspended_at, supabase_url").eq("id", projectId).single();
  if (!proj) throw new HttpError(404, "Project not found.");
  if (proj?.suspended_at) throw new HttpError(403, "This project was suspended after an abuse review and cannot be published. Contact support if you think this is a mistake.");
  const { data: all } = await db.from("project_files").select("path, content").eq("project_id", projectId);
  const files = (all ?? []).filter((f: any) => isPublicFile(f.path));
  if (!files.length) throw new HttpError(400, "The project has no files yet.");
  if (!files.some((f: any) => f.path === "index.html")) throw new HttpError(400, "index.html does not exist yet. Ask the agent to create the home page first.");

  // safety scan: block clear abuse (seed phrase phishing, miners, credential exfiltration),
  // let borderline findings through but send them to the moderators
  const { data: doms } = await db.from("domains").select("hostname").eq("project_id", projectId);
  const scan = await scanProject(files, {
    allowedHosts: [`${proj.slug}.${ROOT_DOMAIN}`, ...(doms ?? []).map((d) => d.hostname), ...(proj.supabase_url ? [new URL(proj.supabase_url).hostname] : [])],
  });
  if (scan.blocked) throw new HttpError(422, "Publishing was blocked by the automatic safety check.",
    { findings: scan.findings.filter((f) => f.severity === "block").map(({ file, message }) => ({ file, message })) });

  const { data: last } = await db.from("project_versions").select("version").eq("project_id", projectId)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  let bytes = 0;
  for (const f of files as { path: string; content: string }[]) {
    const body = new Blob([fileBody(f.content)], { type: mimeOf(f.path) });
    bytes += body.size;
    const { error } = await db.storage.from(SITES_BUCKET).upload(`${projectId}/v${version}/${f.path}`, body, {
      contentType: mimeOf(f.path), upsert: true, cacheControl: "31536000",
    });
    if (error) throw new Error(`Upload of ${f.path} failed: ${error.message}`);
  }
  await db.from("project_versions").insert({ project_id: projectId, version, file_count: files.length, bytes });
  await db.from("projects").update({ published_version: version }).eq("id", projectId);
  const review = scan.findings.filter((f) => f.severity === "review");
  if (review.length) await fileScanReport(projectId, proj.slug, review);
  return { version, review: review.length > 0 };
}

export async function resolveSite(kind: "s" | "d", key: string) {
  const db = admin();
  if (kind === "s") {
    const { data } = await db.from("projects").select("id, published_version, suspended_at").eq("slug", key).maybeSingle();
    return data;
  }
  const { data } = await db.from("domains").select("project_id, status, projects(id, published_version, suspended_at)")
    .eq("hostname", key).eq("status", "active").maybeSingle();
  return data?.projects ?? null;
}
