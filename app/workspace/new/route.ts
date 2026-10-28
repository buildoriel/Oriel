import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

// Dari kotak prompt di Home: buat proyek dengan slug otomatis lalu buka workspace dengan prompt terisi.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const prompt = (url.searchParams.get("prompt") ?? "").slice(0, 2000);
  let user;
  try { user = await requireUser(); } catch { return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, url.origin)); }
  const base = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "proyek";
  const slug = `${base}-${randomBytes(2).toString("hex")}`;
  const { data, error } = await admin().from("projects").insert({ owner_id: user.id, name: prompt.slice(0, 60) || "Proyek baru", slug }).select("id").single();
  if (error) return NextResponse.redirect(new URL("/workspace", url.origin));
  return NextResponse.redirect(new URL(`/workspace/${data.id}?prompt=${encodeURIComponent(prompt)}`, url.origin));
}
