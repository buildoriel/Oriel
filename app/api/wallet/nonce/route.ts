import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

export const POST = handle(async () => {
  const user = await requireUser();
  const nonce = randomBytes(16).toString("hex");
  await admin().from("wallet_nonces").upsert({ user_id: user.id, nonce, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  return NextResponse.json({ message: `Sambungkan wallet ini ke akun Oriel.\n\nAkun: ${user.email}\nNonce: ${nonce}` });
});
