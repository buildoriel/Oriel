import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { projectAccess } from "@/lib/projects";
import { MAX_PROJECT_FILES } from "@/lib/agent/tools";
import { imageMagicOk, uploadError, uploadPath, uploadType } from "@/lib/uploads";
import { handle } from "@/lib/http";

/** One chat attachment (multipart field "file"), saved as a project file under assets/uploads/. Returns its attachment entry. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await projectAccess(user.id, id);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file received.");
  const err = uploadError(file.name, file.size);
  if (err) throw new HttpError(400, err);
  const t = uploadType(file.name)!;
  const bytes = new Uint8Array(await file.arrayBuffer());

  let content: string;
  if (t.kind === "image") {
    if (!imageMagicOk(t.type, bytes)) throw new HttpError(400, `${file.name} is not a valid ${t.type.split("/")[1].toUpperCase()} image.`);
    content = `data:${t.type};base64,${Buffer.from(bytes).toString("base64")}`;
  } else {
    content = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (content.includes("\u0000")) throw new HttpError(400, `${file.name} is not a text file.`);
  }

  const db = admin();
  const { data: rows } = await db.from("project_files").select("path").eq("project_id", id);
  const taken = new Set((rows ?? []).map((r) => r.path));
  if (taken.size >= MAX_PROJECT_FILES) throw new HttpError(400, "This project has reached its file limit.");
  const path = uploadPath(file.name, taken);
  const { error } = await db.from("project_files").insert({ project_id: id, path, content });
  if (error) throw error;
  return NextResponse.json({ path, name: file.name.slice(0, 120), type: t.type, size: file.size });
});
