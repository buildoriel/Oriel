import { admin } from "../supabase/admin";
import { HttpError } from "../supabase/server";
import { decrypt, encrypt } from "./crypto";
import { OAUTH, type ProviderId } from "./providers";

/** A valid access token. Expired tokens (e.g. Google: 1 hour) are renewed with the refresh token. */
export async function tokenFor(userId: string, provider: ProviderId) {
  const db = admin();
  const { data } = await db.from("connectors").select("id, access_token_enc, refresh_token_enc, expires_at")
    .eq("user_id", userId).eq("provider", provider).maybeSingle();
  if (!data) throw new HttpError(400, `${provider} is not connected. Connect it on the Connectors page.`);
  const fresh = !data.expires_at || new Date(data.expires_at).getTime() - 60_000 > Date.now();
  if (fresh || provider === "cloudflare") return decrypt(data.access_token_enc);
  if (!data.refresh_token_enc) throw new HttpError(401, `Your ${provider} session has expired. Reconnect it on the Connectors page.`);

  const cfg = OAUTH[provider];
  const id = process.env[cfg.clientIdEnv]!, secret = process.env[cfg.clientSecretEnv]!;
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: decrypt(data.refresh_token_enc) });
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded", accept: "application/json" };
  if (cfg.tokenAuth === "basic") headers.authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  else { body.set("client_id", id); body.set("client_secret", secret); }
  const res = await fetch(cfg.tokenUrl, { method: "POST", headers, body });
  const tok = await res.json().catch(() => ({}));
  if (!res.ok || !tok.access_token) throw new HttpError(401, `Your ${cfg.label} session has expired. Reconnect it on the Connectors page.`);
  await db.from("connectors").update({
    access_token_enc: encrypt(tok.access_token),
    // some providers rotate the refresh token, others (Google) do not send a new one
    ...(tok.refresh_token ? { refresh_token_enc: encrypt(tok.refresh_token) } : {}),
    expires_at: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null,
  }).eq("id", data.id);
  return tok.access_token as string;
}

type PFile = { path: string; content: string };
async function projectFiles(projectId: string) {
  const { data } = await admin().from("project_files").select("path, content").eq("project_id", projectId);
  return (data ?? []) as PFile[];
}

/** Images are stored as data URLs; other providers need the raw bytes. */
const DATA_URL = /^data:([\w/+.-]+);base64,/;
export const isBinary = (f: PFile) => DATA_URL.test(f.content);
export const bytesOf = (f: PFile) => isBinary(f) ? Buffer.from(f.content.replace(DATA_URL, ""), "base64") : Buffer.from(f.content, "utf8");

async function j(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, body?.message ?? body?.error?.message ?? body?.errors?.[0]?.message ?? `Provider responded with HTTP ${res.status}`);
  return body;
}

/** GitHub: create the repo (once), then one commit containing every project file. */
export async function githubPush(userId: string, projectId: string, message: string) {
  const token = await tokenFor(userId, "github");
  const H = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" };
  const db = admin();
  const { data: p } = await db.from("projects").select("slug, github_repo").eq("id", projectId).single();
  let repo = p.github_repo as string | null;
  if (!repo) {
    const r = await j(await fetch("https://api.github.com/user/repos", { method: "POST", headers: H,
      body: JSON.stringify({ name: `oriel-${p.slug}`, private: true, auto_init: true, description: "Made with Oriel" }) }));
    repo = r.full_name as string;
    await db.from("projects").update({ github_repo: repo }).eq("id", projectId);
  }
  const api = `https://api.github.com/repos/${repo}`;
  // new repo: the main branch from auto_init can take a few seconds to appear
  let ref: any;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${api}/git/ref/heads/main`, { headers: H });
    if (r.ok) { ref = await r.json(); break; }
    if (i === 4) await j(r);
    await new Promise((ok) => setTimeout(ok, 1500));
  }
  const files = await projectFiles(projectId);
  const tree = [];
  for (const f of files) {
    if (!isBinary(f)) { tree.push({ path: f.path, mode: "100644", type: "blob", content: f.content }); continue; }
    const blob = await j(await fetch(`${api}/git/blobs`, { method: "POST", headers: H, body: JSON.stringify({ content: bytesOf(f).toString("base64"), encoding: "base64" }) }));
    tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const t = await j(await fetch(`${api}/git/trees`, { method: "POST", headers: H, body: JSON.stringify({ tree }) }));
  const commit = await j(await fetch(`${api}/git/commits`, { method: "POST", headers: H,
    body: JSON.stringify({ message: message.slice(0, 500), tree: t.sha, parents: [ref.object.sha] }) }));
  await j(await fetch(`${api}/git/refs/heads/main`, { method: "PATCH", headers: H, body: JSON.stringify({ sha: commit.sha }) }));
  return { repo, commit: commit.sha as string, url: `https://github.com/${repo}/commit/${commit.sha}` };
}

/** Vercel: static deployment with inline files (images as base64). */
export async function vercelDeploy(userId: string, projectId: string) {
  const token = await tokenFor(userId, "vercel");
  const { data: p } = await admin().from("projects").select("slug").eq("id", projectId).single();
  const files = await projectFiles(projectId);
  const r = await j(await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name: `oriel-${p.slug}`, target: "production", projectSettings: { framework: null },
      files: files.map((f) => isBinary(f) ? { file: f.path, data: bytesOf(f).toString("base64"), encoding: "base64" } : { file: f.path, data: f.content }) }),
  }));
  return { url: `https://${r.url}` };
}

/** Netlify: one site per project, then deploy through the file digest API. */
export async function netlifyDeploy(userId: string, projectId: string) {
  const token = await tokenFor(userId, "netlify");
  const H = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const { createHash } = await import("crypto");
  const db = admin();
  const { data: p } = await db.from("projects").select("netlify_site_id").eq("id", projectId).single();
  let siteId = p.netlify_site_id as string | null;
  let site: any = siteId ? await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers: H }).then((r) => (r.ok ? r.json() : null)) : null;
  if (!site) {
    site = await j(await fetch("https://api.netlify.com/api/v1/sites", { method: "POST", headers: H, body: "{}" }));
    siteId = site.id;
    await db.from("projects").update({ netlify_site_id: siteId }).eq("id", projectId);
  }
  const files = await projectFiles(projectId);
  const digest = Object.fromEntries(files.map((f) => [`/${f.path}`, createHash("sha1").update(bytesOf(f)).digest("hex")]));
  const dep = await j(await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, { method: "POST", headers: H, body: JSON.stringify({ files: digest }) }));
  for (const f of files) if (dep.required?.includes(digest[`/${f.path}`])) {
    await j(await fetch(`https://api.netlify.com/api/v1/deploys/${dep.id}/files/${encodeURI(f.path)}`, {
      method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": "application/octet-stream" }, body: new Uint8Array(bytesOf(f)) }));
  }
  return { url: site.ssl_url ?? site.url };
}

/** Google Drive: save one file (HTML document/deck or CSV) to the user's Drive (scope drive.file). */
export async function driveUpload(userId: string, name: string, content: string, mimeType: string) {
  const token = await tokenFor(userId, "google_drive");
  const boundary = "oriel" + Date.now();
  const body = `--${boundary}\r\ncontent-type: application/json\r\n\r\n${JSON.stringify({ name })}\r\n--${boundary}\r\ncontent-type: ${mimeType}\r\n\r\n${content}\r\n--${boundary}--`;
  const r = await j(await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": `multipart/related; boundary=${boundary}` }, body }));
  return { id: r.id as string, url: `https://drive.google.com/file/d/${r.id}/view` };
}

// ---------------------------------------------------------------- Supabase (Management API)
const SB = "https://api.supabase.com/v1";

/** The user's Supabase projects, to pick one as the site's database. */
export async function supabaseProjects(userId: string) {
  const token = await tokenFor(userId, "supabase");
  const list = await j(await fetch(`${SB}/projects`, { headers: { authorization: `Bearer ${token}` } }));
  return (list as any[]).map((p) => ({ ref: p.id ?? p.ref, name: p.name, region: p.region }));
}

/** Link a Supabase project to an Oriel project: store the URL + anon key (public) so the agent can use them in the site. */
export async function supabaseLink(userId: string, projectId: string, ref: string) {
  if (!/^[a-z0-9]{20}$/.test(ref)) throw new HttpError(400, "Invalid Supabase project ref.");
  const token = await tokenFor(userId, "supabase");
  const keys = await j(await fetch(`${SB}/projects/${ref}/api-keys`, { headers: { authorization: `Bearer ${token}` } }));
  const anon = (keys as any[]).find((k) => k.name === "anon" || k.type === "publishable");
  if (!anon?.api_key) throw new HttpError(400, "The Supabase project's public (anon) key was not found.");
  const url = `https://${ref}.supabase.co`;
  await admin().from("projects").update({ supabase_ref: ref, supabase_url: url, supabase_anon_key: anon.api_key }).eq("id", projectId);
  return { ref, url };
}

/** Apply the agent-written supabase/schema.sql to the user's database. Only after explicit confirmation in the UI. */
export async function supabaseApplySchema(userId: string, projectId: string) {
  const token = await tokenFor(userId, "supabase");
  const db = admin();
  const { data: p } = await db.from("projects").select("supabase_ref").eq("id", projectId).single();
  if (!p.supabase_ref) throw new HttpError(400, "Link a Supabase project first.");
  const { data: f } = await db.from("project_files").select("content").eq("project_id", projectId).eq("path", "supabase/schema.sql").maybeSingle();
  if (!f) throw new HttpError(400, "supabase/schema.sql does not exist yet. Ask the agent to create it.");
  await j(await fetch(`${SB}/projects/${p.supabase_ref}/database/query`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ query: f.content }) }));
  return { ok: true, ref: p.supabase_ref };
}

// ---------------------------------------------------------------- Cloudflare DNS
async function cloudflareZone(token: string, hostname: string) {
  const H = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const zones = await j(await fetch(`https://api.cloudflare.com/client/v4/zones?per_page=50`, { headers: H }));
  const zone = zones.result.find((z: any) => hostname === z.name || hostname.endsWith(`.${z.name}`));
  if (!zone) throw new HttpError(400, "The domain's zone was not found in the connected Cloudflare account.");
  return { zone, H };
}

/** Cloudflare: create/update the custom domain CNAME in the user's zone. */
export async function cloudflareUpsertCname(userId: string, hostname: string, target: string) {
  const { zone, H } = await cloudflareZone(await tokenFor(userId, "cloudflare"), hostname);
  const existing = await j(await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records?name=${hostname}`, { headers: H }));
  const rec = { type: "CNAME", name: hostname, content: target, proxied: false, ttl: 300 };
  const id = existing.result?.[0]?.id;
  await j(await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records${id ? `/${id}` : ""}`,
    { method: id ? "PUT" : "POST", headers: H, body: JSON.stringify(rec) }));
}

/** Remove the Oriel-made CNAME when a domain is disconnected (only if it still points at the Oriel target). */
export async function cloudflareDeleteCname(userId: string, hostname: string, target: string) {
  const { zone, H } = await cloudflareZone(await tokenFor(userId, "cloudflare"), hostname);
  const existing = await j(await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records?type=CNAME&name=${hostname}`, { headers: H }));
  for (const r of existing.result ?? []) if (String(r.content).replace(/\.$/, "") === target)
    await j(await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records/${r.id}`, { method: "DELETE", headers: H }));
}
