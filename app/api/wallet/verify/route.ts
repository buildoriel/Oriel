import { NextResponse } from "next/server";
import { verifyMessage, getAddress, isAddress } from "viem";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

const FREE_GRANT = 60;

// Wallet verification = requirement for Free credits (one wallet per account -> limits abuse).
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { address, signature } = await req.json();
  if (typeof address !== "string" || !isAddress(address) || typeof signature !== "string") throw new HttpError(400, "Invalid signature data.");
  const db = admin();
  const { data: n } = await db.from("wallet_nonces").select("*").eq("user_id", user.id).maybeSingle();
  if (!n || new Date(n.expires_at) < new Date()) throw new HttpError(400, "The signature request expired. Try again.");
  const message = `Connect this wallet to your Oriel account.\n\nAccount: ${user.email}\nNonce: ${n.nonce}`;
  const ok = await verifyMessage({ address: getAddress(address), message, signature: signature as `0x${string}` }).catch(() => false);
  if (!ok) throw new HttpError(400, "The signature does not match the wallet.");
  await db.from("wallet_nonces").delete().eq("user_id", user.id);
  const wallet = getAddress(address).toLowerCase();
  const { error } = await db.from("profiles").update({ wallet_address: wallet, wallet_verified_at: new Date().toISOString() }).eq("id", user.id);
  if (error?.code === "23505") throw new HttpError(409, "This wallet is already connected to another account.");
  if (error) throw error;

  // first month of Free credits, once per account (atomic: safe against double clicks)
  const { data: granted } = await db.rpc("claim_free_credits", { p_user: user.id, p_amount: FREE_GRANT });
  return NextResponse.json({ wallet, freeCredits: granted ? FREE_GRANT : 0 });
});
