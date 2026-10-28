import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ownProject, releasedSlug } from "@/lib/projects";
import { requestCancel } from "@/lib/agent/jobs";
import { SITES_BUCKET, listObjects } from "@/lib/hosting";
import { detachFromVercel } from "@/lib/domains";
import { cloudflareDeleteCname } from "@/lib/connectors/actions";
import { SITES_CNAME_TARGET } from "@/lib/config";
import { handle } from "@/lib/http";

/**
 * Delete a project (owner only). Soft delete: the row stays because templates and their uses point to it,
 * but its files, domains and members are removed, the subdomain is released and the site stops serving.
 * Published versions are removed from Storage, except versions a template was made from.
 */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const p = await ownProject(user.id, id);
  const db = admin();

  const { error } = await db.from("projects").update({
    deleted_at: new Date().toISOString(), slug: releasedSlug(), featured_at: null, showcase_opt_in: false,
  }).eq("id", id);
  if (error) throw error;

  const { data: runs } = await db.from("agent_runs").select("id").eq("project_id", id).is("finished_at", null);
  for (const r of runs ?? []) await requestCancel(r.id).catch(() => {});

  const { data: doms } = await db.from("domains").select("hostname").eq("project_id", id);
  for (const d of doms ?? []) {
    await detachFromVercel(d.hostname).catch(() => {});
    await cloudflareDeleteCname(user.id, d.hostname, SITES_CNAME_TARGET).catch(() => {});
  }
  await Promise.all([
    db.from("domains").delete().eq("project_id", id),
    db.from("project_members").delete().eq("project_id", id),
    db.from("project_files").delete().eq("project_id", id),
  ]);

  // published files: keep the versions templates were made from (buyers copy them), remove the rest
  const { data: tpl } = await db.from("templates").select("source_version").eq("source_project_id", id);
  const keep = new Set((tpl ?? []).map((t) => `v${t.source_version}`));
  const paths = (await listObjects(id).catch(() => [] as string[])).filter((path) => !keep.has(path.split("/")[0]));
  for (let i = 0; i < paths.length; i += 100)
    await db.storage.from(SITES_BUCKET).remove(paths.slice(i, i + 100).map((path) => `${id}/${path}`));

  return NextResponse.json({ ok: true, name: p.name });
});
