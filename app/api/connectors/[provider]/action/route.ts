import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ownProject } from "@/lib/projects";
import { requireTier } from "@/lib/tier-guard";
import { MIN_TIER, type ProviderId } from "@/lib/connectors/providers";
import {
  githubPush, vercelDeploy, netlifyDeploy, driveUpload, supabaseProjects, supabaseLink, supabaseApplySchema, bytesOf, isBinary,
} from "@/lib/connectors/actions";
import { handle } from "@/lib/http";

export const maxDuration = 120;

/**
 * Connector actions for one project. Big actions (push, deploy, running SQL) MUST carry confirm:true
 * from the confirmation dialog in the UI. The tier is re-checked on every action: connectors stop working if the tier drops.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const user = await requireUser();
  const provider = (await ctx.params).provider as ProviderId;
  if (!(provider in MIN_TIER)) throw new HttpError(404, "Unknown connector.");
  await requireTier(user.id, MIN_TIER[provider], `The ${provider} connector`);
  const { projectId, confirm, message, path, op, ref, autocommit } = await req.json();

  if (provider === "supabase" && op === "list") return NextResponse.json({ projects: await supabaseProjects(user.id) });
  const p = await ownProject(user.id, projectId);
  if (provider === "supabase" && op === "link") return NextResponse.json(await supabaseLink(user.id, p.id, String(ref ?? "")));
  if (confirm !== true) throw new HttpError(400, "This action needs confirmation.");

  switch (provider) {
    case "github": {
      const r = await githubPush(user.id, p.id, message || "Update from Oriel");
      if (typeof autocommit === "boolean") await admin().from("projects").update({ github_autocommit: autocommit }).eq("id", p.id);
      return NextResponse.json(r);
    }
    case "vercel": return NextResponse.json(await vercelDeploy(user.id, p.id));
    case "netlify": return NextResponse.json(await netlifyDeploy(user.id, p.id));
    case "supabase": return NextResponse.json(await supabaseApplySchema(user.id, p.id));
    case "google_drive": {
      const file = String(path || "index.html");
      const { data: f } = await admin().from("project_files").select("path, content").eq("project_id", p.id).eq("path", file).maybeSingle();
      if (!f) throw new HttpError(404, `File ${file} does not exist.`);
      if (isBinary(f)) throw new HttpError(400, "Save to Drive only works for text documents (HTML, CSV, Markdown).");
      const mime = file.endsWith(".csv") ? "text/csv" : file.endsWith(".md") ? "text/markdown" : "text/html";
      return NextResponse.json(await driveUpload(user.id, `${p.name} - ${file}`, bytesOf(f).toString("utf8"), mime));
    }
    default: throw new HttpError(404, "Unknown action.");
  }
});
