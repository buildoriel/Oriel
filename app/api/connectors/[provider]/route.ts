import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/connectors/crypto";
import { requireTier } from "@/lib/tier-guard";
import { handle } from "@/lib/http";

// DELETE: putuskan konektor (token dihapus dari database). Cabut juga akses di sisi penyedia bila perlu.
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const user = await requireUser();
  const { provider } = await ctx.params;
  await admin().from("connectors").delete().eq("user_id", user.id).eq("provider", provider);
  return NextResponse.json({ ok: true });
});

// POST khusus Cloudflare: simpan API Token (izin Zone:DNS:Edit untuk zona tertentu), diverifikasi dulu.
export const POST = handle(async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const user = await requireUser();
  if ((await ctx.params).provider !== "cloudflare") throw new HttpError(404, "Pakai alur OAuth untuk konektor ini.");
  await requireTier(user.id, "studio", "Cloudflare DNS");
  const { token } = await req.json();
  const v = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", { headers: { authorization: `Bearer ${token}` } });
  if (!v.ok) throw new HttpError(400, "Token Cloudflare tidak valid.");
  await admin().from("connectors").upsert({ user_id: user.id, provider: "cloudflare", access_token_enc: encrypt(token), scopes: "Zone:DNS:Edit" }, { onConflict: "user_id,provider" });
  return NextResponse.json({ ok: true });
});
