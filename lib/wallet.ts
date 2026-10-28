import { HttpError } from "./supabase/server";
import { admin } from "./supabase/admin";

export const FREE_GRANT = 60;

/**
 * Attach a wallet the user has proven they control (signature or Privy sign-in) and claim the first month
 * of Free credits once per account. One wallet per account: a wallet already on another account is refused.
 */
export async function linkWallet(userId: string, address: string) {
  const db = admin();
  const wallet = address.toLowerCase();
  const { error } = await db.from("profiles").update({ wallet_address: wallet, wallet_verified_at: new Date().toISOString() }).eq("id", userId);
  if (error?.code === "23505") throw new HttpError(409, "This wallet is already connected to another account.");
  if (error) throw error;
  const { data: granted } = await db.rpc("claim_free_credits", { p_user: userId, p_amount: FREE_GRANT });
  return { wallet, freeCredits: granted ? FREE_GRANT : 0 };
}
