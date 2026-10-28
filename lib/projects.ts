import { admin } from "./supabase/admin";
import { HttpError } from "./supabase/server";
export async function ownProject(userId: string, projectId: string) {
  const { data } = await admin().from("projects").select("*").eq("id", projectId).eq("owner_id", userId).maybeSingle();
  if (!data) throw new HttpError(404, "Proyek tidak ditemukan.");
  return data;
}
