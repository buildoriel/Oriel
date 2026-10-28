import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const { data } = await admin().from("notifications").select("id, kind, body, read, created_at")
    .eq("user_id", user.id).order("id", { ascending: false }).limit(30);
  return NextResponse.json({ notifications: data ?? [] });
});

// tandai semua sudah dibaca
export const POST = handle(async () => {
  const user = await requireUser();
  await admin().from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  return NextResponse.json({ ok: true });
});
