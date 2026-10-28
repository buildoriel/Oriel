import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { projectAccess } from "@/lib/projects";
import { SITES_BUCKET, isPublicFile, listObjects, mimeOf } from "@/lib/hosting";
import { handle } from "@/lib/http";

const BINARY = /\.(png|jpe?g|webp|gif|ico)$/i;

/**
 * Restore a published version: the live site serves it again, and the working files are replaced with it
 * so the next chat request builds on it. Private files (database schema, attached text files) are kept.
 */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string; version: string }> }) => {
  const user = await requireUser();
  const { id, version: v } = await ctx.params;
  const version = Number(v);
  if (!Number.isInteger(version) || version < 1) throw new HttpError(400, "Invalid version.");
  await projectAccess(user.id, id);
  const db = admin();
  const { data: row } = await db.from("project_versions").select("version").eq("project_id", id).eq("version", version).maybeSingle();
  if (!row) throw new HttpError(404, "Version not found.");
  const { data: busy } = await db.from("agent_runs").select("id").eq("project_id", id).is("finished_at", null)
    .or(`lease_until.gt.${new Date().toISOString()},started_at.gt.${new Date(Date.now() - 30 * 60_000).toISOString()}`).limit(1).maybeSingle();
  if (busy) throw new HttpError(409, "A build is running on this project. Wait until it finishes, then restore.");

  const base = `${id}/v${version}`;
  const paths = await listObjects(base);
  if (!paths.length) throw new HttpError(410, "The files of this version are no longer available.");
  const restored: { project_id: string; path: string; content: string; updated_at: string }[] = [];
  const now = new Date().toISOString();
  for (const path of paths) {
    const { data, error } = await db.storage.from(SITES_BUCKET).download(`${base}/${path}`);
    if (error || !data) throw new Error(`Could not read ${path} of version ${version}.`);
    const content = BINARY.test(path)
      ? `data:${mimeOf(path)};base64,${Buffer.from(await data.arrayBuffer()).toString("base64")}`
      : await data.text();
    restored.push({ project_id: id, path, content, updated_at: now });
  }

  const { data: current } = await db.from("project_files").select("path").eq("project_id", id);
  const keep = new Set(paths);
  const stale = (current ?? []).map((f) => f.path).filter((p) => !keep.has(p) && isPublicFile(p));
  for (let i = 0; i < restored.length; i += 20) {
    const { error } = await db.from("project_files").upsert(restored.slice(i, i + 20), { onConflict: "project_id,path" });
    if (error) throw error;
  }
  if (stale.length) await db.from("project_files").delete().eq("project_id", id).in("path", stale);
  await db.from("projects").update({ published_version: version, updated_at: now }).eq("id", id);
  return NextResponse.json({ version, files: paths.length });
});
