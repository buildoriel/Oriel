import { admin } from "../supabase/admin";

export const SITES_BUCKET = "sites";
const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8", json: "application/json", svg: "image/svg+xml", txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8", csv: "text/csv; charset=utf-8", xml: "application/xml", webmanifest: "application/manifest+json",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", ico: "image/x-icon",
};
export const mimeOf = (p: string) => MIME[p.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";

/** Salin file kerja proyek menjadi versi immutable di Storage: sites/<projectId>/v<N>/<path> */
export async function publishProject(projectId: string) {
  const db = admin();
  const { data: files } = await db.from("project_files").select("path, content").eq("project_id", projectId);
  if (!files?.length) throw new Error("Proyek belum punya file.");
  if (!files.some((f: any) => f.path === "index.html")) throw new Error("index.html belum ada.");

  const { data: last } = await db.from("project_versions").select("version").eq("project_id", projectId)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  let bytes = 0;
  for (const f of files as { path: string; content: string }[]) {
    const body = new Blob([f.content], { type: mimeOf(f.path) });
    bytes += body.size;
    const { error } = await db.storage.from(SITES_BUCKET).upload(`${projectId}/v${version}/${f.path}`, body, {
      contentType: mimeOf(f.path), upsert: true, cacheControl: "31536000",
    });
    if (error) throw new Error(`Upload ${f.path} gagal: ${error.message}`);
  }
  await db.from("project_versions").insert({ project_id: projectId, version, file_count: files.length, bytes });
  await db.from("projects").update({ published_version: version }).eq("id", projectId);
  return version;
}

export async function resolveSite(kind: "s" | "d", key: string) {
  const db = admin();
  if (kind === "s") {
    const { data } = await db.from("projects").select("id, published_version").eq("slug", key).maybeSingle();
    return data;
  }
  const { data } = await db.from("domains").select("project_id, status, projects(id, published_version)")
    .eq("hostname", key).eq("status", "active").maybeSingle();
  return data?.projects ?? null;
}
