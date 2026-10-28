import { NextResponse } from "next/server";
import { verifyMessage, getAddress, isAddress } from "viem";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";
import { linkWallet } from "@/lib/wallet";
import { accountLabel } from "@/lib/account-email";

// Wallet verification = requirement for Free credits (one wallet per account -> limits abuse).
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { address, signature } = await req.json();
  if (typeof address !== "string" || !isAddress(address) || typeof signature !== "string") throw new HttpError(400, "Invalid signature data.");
  const db = admin();
  const { data: n } = await db.from("wallet_nonces").select("*").eq("user_id", user.id).maybeSingle();
  if (!n || new Date(n.expires_at) < new Date()) throw new HttpError(400, "The signature request expired. Try again.");
  const message = `Connect this wallet to your Oriel account.\n\nAccount: ${accountLabel(user)}\nNonce: ${n.nonce}`;
  const ok = await verifyMessage({ address: getAddress(address), message, signature: signature as `0x${string}` }).catch(() => false);
  if (!ok) throw new HttpError(400, "The signature does not match the wallet.");
  await db.from("wallet_nonces").delete().eq("user_id", user.id);
  return NextResponse.json(await linkWallet(user.id, getAddress(address)));
});
