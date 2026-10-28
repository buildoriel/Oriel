import { NextResponse } from "next/server";
import { accountLabel } from "@/lib/account-email";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

export const POST = handle(async () => {
  const user = await requireUser();
  const nonce = randomBytes(16).toString("hex");
  await admin().from("wallet_nonces").upsert({ user_id: user.id, nonce, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  return NextResponse.json({ message: `Connect this wallet to your Oriel account.\n\nAccount: ${accountLabel(user)}\nNonce: ${nonce}` });
});
