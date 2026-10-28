import { NextResponse } from "next/server";
import { verifyMessage, getAddress } from "viem";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { grant } from "@/lib/credits";
import { handle } from "@/lib/http";

// Verifikasi wallet = syarat kredit Free (satu wallet hanya untuk satu akun -> menekan penyalahgunaan).
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { address, signature } = await req.json();
  const db = admin();
  const { data: n } = await db.from("wallet_nonces").select("*").eq("user_id", user.id).maybeSingle();
  if (!n || new Date(n.expires_at) < new Date()) throw new HttpError(400, "Permintaan tanda tangan kedaluwarsa. Ulangi.");
  const message = `Sambungkan wallet ini ke akun Oriel.\n\nAkun: ${user.email}\nNonce: ${n.nonce}`;
  const ok = await verifyMessage({ address: getAddress(address), message, signature });
  if (!ok) throw new HttpError(400, "Tanda tangan tidak cocok dengan wallet.");
  const wallet = getAddress(address).toLowerCase();
  const { error } = await db.from("profiles").update({ wallet_address: wallet, wallet_verified_at: new Date().toISOString() }).eq("id", user.id);
  if (error?.code === "23505") throw new HttpError(409, "Wallet ini sudah tersambung ke akun lain.");
  await db.from("wallet_nonces").delete().eq("user_id", user.id);

  // kredit Free bulan pertama, sekali saja
  const { data: p } = await db.from("profiles").select("free_credits_claimed_at").eq("id", user.id).single();
  if (!p.free_credits_claimed_at) {
    await grant(user.id, 60, "monthly", "free_grant", "wallet_verified");
    await db.from("profiles").update({ free_credits_claimed_at: new Date().toISOString() }).eq("id", user.id);
  }
  return NextResponse.json({ wallet });
});
