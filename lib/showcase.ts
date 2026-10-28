import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { admin } from "./supabase/admin";
import { publishProject } from "./hosting";

/**
 * Oriel's own example projects (content/showcase/<slug>/): owned by the official @oriel account, published,
 * featured on the home page, and offered as free templates. Idempotent: running it again republishes the
 * current files as a new version and points the templates at it.
 */
const ROOT = path.join(process.cwd(), "content", "showcase");
const OFFICIAL_HANDLE = "oriel";
const OFFICIAL_EMAIL = "studio@users.buildoriel.com";
const BINARY = /\.(png|jpe?g|webp|gif|ico)$/i;

type Entry = { slug: string; name: string; category: string; title: string; description: string };
export type SeedResult = { slug: string; version?: number; template?: string; error?: string };

async function filesOf(dir: string, sub = ""): Promise<{ path: string; content: string }[]> {
  const out: { path: string; content: string }[] = [];
  for (const e of await readdir(path.join(dir, sub), { withFileTypes: true })) {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.name.startsWith(".")) continue;
    if (e.isDirectory()) out.push(...(await filesOf(dir, rel)));
    else if (BINARY.test(e.name)) {
      const ext = e.name.split(".").pop()!.toLowerCase().replace("jpg", "jpeg");
      out.push({ path: rel, content: `data:image/${ext};base64,${(await readFile(path.join(dir, rel))).toString("base64")}` });
    } else out.push({ path: rel, content: await readFile(path.join(dir, rel), "utf8") });
  }
  return out;
}

async function officialAccount() {
  const db = admin();
  const { data: p } = await db.from("profiles").select("id").eq("handle", OFFICIAL_HANDLE).maybeSingle();
  if (p) return p.id as string;
  const { data, error } = await db.auth.admin.createUser({ email: OFFICIAL_EMAIL, email_confirm: true, user_metadata: { official: true } });
  if (error || !data.user) throw new Error(`Could not create the official account: ${error?.message}`);
  await db.from("profiles").update({ handle: OFFICIAL_HANDLE }).eq("id", data.user.id);
  return data.user.id;
}

export async function seedShowcase(): Promise<SeedResult[]> {
  const db = admin();
  const owner = await officialAccount();
  const entries: Entry[] = JSON.parse(await readFile(path.join(ROOT, "manifest.json"), "utf8"));
  const results: SeedResult[] = [];
  // featured_at orders the home page showcase (newest first), so the first manifest entry gets the latest time
  const now = Date.now();

  for (const [i, e] of entries.entries()) {
    try {
      const files = await filesOf(path.join(ROOT, e.slug));
      let { data: proj } = await db.from("projects").select("id, owner_id").eq("slug", e.slug).maybeSingle();
      if (proj && proj.owner_id !== owner) throw new Error("slug belongs to another account");
      if (!proj) {
        const { data, error } = await db.from("projects").insert({ owner_id: owner, name: e.name, slug: e.slug }).select("id, owner_id").single();
        if (error) throw error;
        proj = data;
      }
      const id = proj!.id as string;

      const { error: upErr } = await db.from("project_files").upsert(files.map((f) => ({ project_id: id, ...f, updated_at: new Date().toISOString() })));
      if (upErr) throw upErr;
      const keep = new Set(files.map((f) => f.path));
      const { data: existing } = await db.from("project_files").select("path").eq("project_id", id);
      const stale = (existing ?? []).map((f) => f.path).filter((p) => !keep.has(p));
      if (stale.length) await db.from("project_files").delete().eq("project_id", id).in("path", stale);

      const { version } = await publishProject(id);
      await db.from("projects").update({
        name: e.name, showcase_opt_in: true, featured_at: new Date(now - i * 60_000).toISOString(),
      }).eq("id", id);

      const tpl = { title: e.title, description: e.description, category: e.category, source_version: version, price_credits: 0, published: true };
      const { data: t } = await db.from("templates").select("id").eq("source_project_id", id).maybeSingle();
      const { data: saved, error: tErr } = t
        ? await db.from("templates").update(tpl).eq("id", t.id).select("id").single()
        : await db.from("templates").insert({ ...tpl, creator_id: owner, source_project_id: id }).select("id").single();
      if (tErr) throw tErr;
      results.push({ slug: e.slug, version, template: saved.id });
    } catch (err: any) {
      results.push({ slug: e.slug, error: String(err?.message ?? err) });
    }
  }
  return results;
}
