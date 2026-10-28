import JSZip from "jszip";
import { requireUser } from "@/lib/supabase/server";
import { ownProject } from "@/lib/projects";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const p = await ownProject(user.id, id);
  const { data } = await admin().from("project_files").select("path, content").eq("project_id", id);
  const zip = new JSZip();
  for (const f of data ?? []) zip.file(f.path, f.content);
  const buf = await zip.generateAsync({ type: "arraybuffer" });
  return new Response(buf, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${p.slug}.zip"` } });
});
