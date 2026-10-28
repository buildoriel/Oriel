import { admin } from "./supabase/admin";
import { HttpError } from "./supabase/server";

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/;

/** A live (not deleted) project owned by the user. Use for owner-only actions: settings, domains, templates, connectors, delete, members. */
export async function ownProject(userId: string, projectId: string) {
  const { data } = await admin().from("projects").select("*").eq("id", projectId).eq("owner_id", userId).is("deleted_at", null).maybeSingle();
  if (!data) throw new HttpError(404, "Project not found.");
  return data;
}

export type ProjectRole = "owner" | "editor";

/** A live project the user owns or was added to as an editor (chat, preview, publish, download). */
export async function projectAccess(userId: string, projectId: string) {
  const db = admin();
  const { data } = await db.from("projects").select("*").eq("id", projectId).is("deleted_at", null).maybeSingle();
  if (!data) throw new HttpError(404, "Project not found.");
  if (data.owner_id === userId) return { ...data, role: "owner" as ProjectRole };
  const { data: m } = await db.from("project_members").select("role").eq("project_id", projectId).eq("user_id", userId).maybeSingle();
  if (!m) throw new HttpError(404, "Project not found.");
  return { ...data, role: m.role as ProjectRole };
}

/** The only path for creating projects: checks slug format, reserved slugs, and the per-tier project limit. */
export async function createProject(userId: string, input: { name: string; slug: string; templateId?: string }) {
  const slug = input.slug.toLowerCase();
  if (!SLUG_RE.test(slug)) throw new HttpError(400, "Subdomains may only contain lowercase letters, numbers, and hyphens (3-40 characters).");
  const db = admin();
  const { data: reserved } = await db.from("reserved_slugs").select("slug").eq("slug", slug).maybeSingle();
  if (reserved) throw new HttpError(409, "That subdomain is reserved. Pick another name.");
  const { data: tier } = await db.rpc("effective_tier", { p_user: userId });
  const { data: cfg } = await db.from("tiers").select("max_projects").eq("id", tier ?? "free").single();
  if (!cfg) throw new HttpError(500, "Tier settings not found.");
  const { count } = await db.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", userId).is("deleted_at", null);
  if (cfg.max_projects != null && (count ?? 0) >= cfg.max_projects)
    throw new HttpError(403, `Your tier allows ${cfg.max_projects} project${cfg.max_projects === 1 ? "" : "s"}. Upgrade your tier to add more.`);
  const { data, error } = await db.from("projects")
    .insert({ owner_id: userId, name: input.name.slice(0, 80) || "New project", slug, template_id: input.templateId ?? null })
    .select("id, slug").single();
  if (error?.code === "23505") throw new HttpError(409, "That subdomain is taken. Pick another name.");
  if (error) throw error;
  return data as { id: string; slug: string };
}
