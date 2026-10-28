import { admin } from "../supabase/admin";
import { decrypt } from "./crypto";
import type { ProviderId } from "./providers";

export async function tokenFor(userId: string, provider: ProviderId) {
  const { data } = await admin().from("connectors").select("access_token_enc").eq("user_id", userId).eq("provider", provider).maybeSingle();
  if (!data) throw new Error(`${provider} belum tersambung.`);
  return decrypt(data.access_token_enc);
}

async function projectFiles(projectId: string) {
  const { data } = await admin().from("project_files").select("path, content").eq("project_id", projectId);
  return (data ?? []) as { path: string; content: string }[];
}

async function j(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? body?.error?.message ?? `HTTP ${res.status}`);
  return body;
}

/** GitHub: buat repo (sekali) lalu satu commit berisi semua file proyek. */
export async function githubPush(userId: string, projectId: string, message: string) {
  const token = await tokenFor(userId, "github");
  const H = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" };
  const db = admin();
  const { data: p } = await db.from("projects").select("slug, github_repo").eq("id", projectId).single();
  let repo = p.github_repo as string | null;
  if (!repo) {
    const r = await j(await fetch("https://api.github.com/user/repos", { method: "POST", headers: H,
      body: JSON.stringify({ name: `oriel-${p.slug}`, private: true, auto_init: true, description: "Dibuat dengan Oriel" }) }));
    repo = r.full_name as string;
    await db.from("projects").update({ github_repo: repo }).eq("id", projectId);
  }
  const api = `https://api.github.com/repos/${repo}`;
  const ref = await j(await fetch(`${api}/git/ref/heads/main`, { headers: H }));
  const parent = ref.object.sha;
  const files = await projectFiles(projectId);
  const tree = await j(await fetch(`${api}/git/trees`, { method: "POST", headers: H, body: JSON.stringify({
    tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.content })) }) }));
  const commit = await j(await fetch(`${api}/git/commits`, { method: "POST", headers: H,
    body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }) }));
  await j(await fetch(`${api}/git/refs/heads/main`, { method: "PATCH", headers: H, body: JSON.stringify({ sha: commit.sha }) }));
  return { repo, commit: commit.sha as string, url: `https://github.com/${repo}/commit/${commit.sha}` };
}

/** Vercel: deployment statis dengan file inline. */
export async function vercelDeploy(userId: string, projectId: string) {
  const token = await tokenFor(userId, "vercel");
  const { data: p } = await admin().from("projects").select("slug").eq("id", projectId).single();
  const files = await projectFiles(projectId);
  const r = await j(await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name: `oriel-${p.slug}`, target: "production", projectSettings: { framework: null },
      files: files.map((f) => ({ file: f.path, data: f.content })) }),
  }));
  return { url: `https://${r.url}` };
}

/** Netlify: buat site lalu deploy ZIP-less via file digest API (sederhana: upload satu per satu). */
export async function netlifyDeploy(userId: string, projectId: string) {
  const token = await tokenFor(userId, "netlify");
  const H = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const { createHash } = await import("crypto");
  const files = await projectFiles(projectId);
  const site = await j(await fetch("https://api.netlify.com/api/v1/sites", { method: "POST", headers: H, body: "{}" }));
  const digest = Object.fromEntries(files.map((f) => [`/${f.path}`, createHash("sha1").update(f.content).digest("hex")]));
  const dep = await j(await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, { method: "POST", headers: H, body: JSON.stringify({ files: digest }) }));
  for (const f of files) if (dep.required?.includes(digest[`/${f.path}`])) {
    await j(await fetch(`https://api.netlify.com/api/v1/deploys/${dep.id}/files/${encodeURI(f.path)}`, {
      method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": "application/octet-stream" }, body: f.content }));
  }
  return { url: site.ssl_url ?? site.url };
}

/** Google Drive: simpan satu file (dokumen/deck HTML atau CSV) ke Drive user (scope drive.file). */
export async function driveUpload(userId: string, name: string, content: string, mimeType: string) {
  const token = await tokenFor(userId, "google_drive");
  const boundary = "oriel" + Date.now();
  const body = `--${boundary}\r\ncontent-type: application/json\r\n\r\n${JSON.stringify({ name })}\r\n--${boundary}\r\ncontent-type: ${mimeType}\r\n\r\n${content}\r\n--${boundary}--`;
  const r = await j(await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": `multipart/related; boundary=${boundary}` }, body }));
  return { id: r.id as string, url: `https://drive.google.com/file/d/${r.id}/view` };
}

/** Supabase (Management API): daftar proyek user untuk dipilih sebagai database situsnya. */
export async function supabaseProjects(userId: string) {
  const token = await tokenFor(userId, "supabase");
  return j(await fetch("https://api.supabase.com/v1/projects", { headers: { authorization: `Bearer ${token}` } }));
}

/** Cloudflare: buat/ubah CNAME untuk custom domain di zona milik user. */
export async function cloudflareUpsertCname(userId: string, hostname: string, target: string) {
  const token = await tokenFor(userId, "cloudflare");
  const H = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const zones = await j(await fetch(`https://api.cloudflare.com/client/v4/zones?per_page=50`, { headers: H }));
  const zone = zones.result.find((z: any) => hostname === z.name || hostname.endsWith(`.${z.name}`));
  if (!zone) throw new Error("Zona domain tidak ditemukan di akun Cloudflare yang tersambung.");
  const existing = await j(await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records?name=${hostname}`, { headers: H }));
  const rec = { type: "CNAME", name: hostname, content: target, proxied: false, ttl: 300 };
  const id = existing.result?.[0]?.id;
  await j(await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records${id ? `/${id}` : ""}`,
    { method: id ? "PUT" : "POST", headers: H, body: JSON.stringify(rec) }));
}
