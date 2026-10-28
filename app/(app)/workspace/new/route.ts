import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { createProject } from "@/lib/projects";

// From the Home prompt box: create a project with an automatic slug, then open the workspace with the prompt filled in.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const prompt = (url.searchParams.get("prompt") ?? "").slice(0, 2000);
  let user;
  try { user = await requireUser(); } catch { return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, url.origin)); }
  const base = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24).replace(/-$/, "") || "project";
  const slug = `${base.length < 2 ? "project" : base}-${randomBytes(2).toString("hex")}`;
  try {
    const p = await createProject(user.id, { name: prompt.slice(0, 60) || "New project", slug });
    return NextResponse.redirect(new URL(`/workspace/${p.id}?prompt=${encodeURIComponent(prompt)}`, url.origin));
  } catch (e) {
    const msg = e instanceof HttpError ? e.message : "Could not create the project.";
    return NextResponse.redirect(new URL(`/workspace?error=${encodeURIComponent(msg)}`, url.origin));
  }
}
