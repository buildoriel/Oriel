import { NextResponse } from "next/server";
import { verifyMessage, getAddress, isAddress } from "viem";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

const FREE_GRANT = 60;

// Verifikasi wallet = syarat kredit Free (satu wallet hanya untuk satu akun -> menekan penyalahgunaan).
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { address, signature } = await req.json();
  if (typeof address !== "string" || !isAddress(address) || typeof signature !== "string") throw new HttpError(400, "Data tanda tangan tidak valid.");
  const db = admin();
  const { data: n } = await db.from("wallet_nonces").select("*").eq("user_id", user.id).maybeSingle();
  if (!n || new Date(n.expires_at) < new Date()) throw new HttpError(400, "Permintaan tanda tangan kedaluwarsa. Ulangi.");
  const message = `Sambungkan wallet ini ke akun Oriel.\n\nAkun: ${user.email}\nNonce: ${n.nonce}`;
  const ok = await verifyMessage({ address: getAddress(address), message, signature: signature as `0x${string}` }).catch(() => false);
  if (!ok) throw new HttpError(400, "Tanda tangan tidak cocok dengan wallet.");
  await db.from("wallet_nonces").delete().eq("user_id", user.id);
  const wallet = getAddress(address).toLowerCase();
  const { error } = await db.from("profiles").update({ wallet_address: wallet, wallet_verified_at: new Date().toISOString() }).eq("id", user.id);
  if (error?.code === "23505") throw new HttpError(409, "Wallet ini sudah tersambung ke akun lain.");
  if (error) throw error;

  // kredit Free bulan pertama, sekali per akun (atomik: aman dari klik ganda)
  const { data: granted } = await db.rpc("claim_free_credits", { p_user: user.id, p_amount: FREE_GRANT });
  return NextResponse.json({ wallet, freeCredits: granted ? FREE_GRANT : 0 });
});
