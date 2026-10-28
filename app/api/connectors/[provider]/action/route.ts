import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { ownProject } from "@/lib/projects";
import { githubPush, vercelDeploy, netlifyDeploy, driveUpload, supabaseProjects } from "@/lib/connectors/actions";
import { handle } from "@/lib/http";

/** Aksi besar (push/deploy) WAJIB membawa confirm:true dari dialog konfirmasi di UI. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const user = await requireUser();
  const { provider } = await ctx.params;
  const { projectId, confirm, message, path } = await req.json();
  if (provider === "supabase") return NextResponse.json(await supabaseProjects(user.id));
  if (confirm !== true) throw new HttpError(400, "Aksi ini perlu konfirmasi.");
  const p = await ownProject(user.id, projectId);
  switch (provider) {
    case "github": return NextResponse.json(await githubPush(user.id, projectId, message || `Update dari Oriel`));
    case "vercel": return NextResponse.json(await vercelDeploy(user.id, projectId));
    case "netlify": return NextResponse.json(await netlifyDeploy(user.id, projectId));
    case "google_drive": {
      const { admin } = await import("@/lib/supabase/admin");
      const { data: f } = await admin().from("project_files").select("content").eq("project_id", projectId).eq("path", path ?? "index.html").single();
      const csv = String(path).endsWith(".csv");
      return NextResponse.json(await driveUpload(user.id, `${p.name} - ${path ?? "index.html"}`, f.content, csv ? "text/csv" : "text/html"));
    }
    default: throw new HttpError(404, "Aksi tidak dikenal.");
  }
});
