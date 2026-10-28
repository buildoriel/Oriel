import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { verifyPrivyIdentity } from "@/lib/privy";
import { placeholderEmail } from "@/lib/account-email";
import { applyReferral } from "@/lib/referral";
import { linkWallet } from "@/lib/wallet";
import { handle } from "@/lib/http";

/**
 * Privy signs the person in (wallet, email or Google); this exchanges the Privy identity token for a
 * Supabase session, so the rest of the app (RLS, requireUser) keeps working unchanged.
 * Account match order: Privy id -> verified email -> new account.
 */
export const POST = handle(async (req: Request) => {
  const { idToken } = await req.json().catch(() => ({}));
  if (typeof idToken !== "string" || idToken.length > 20_000) throw new HttpError(400, "Missing sign-in token.");
  const who = await verifyPrivyIdentity(idToken).catch((e) => { throw new HttpError(401, `Sign-in could not be verified. ${e?.message ?? ""}`.trim()); });
  const db = admin();

  let userId: string | null = null;
  const { data: byDid } = await db.from("profiles").select("id").eq("privy_did", who.did).maybeSingle();
  userId = byDid?.id ?? null;
  if (!userId && who.email) {
    const { data } = await db.rpc("user_id_by_email", { p_email: who.email });
    userId = (data as string | null) ?? null;
  }
  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({
      email: who.email ?? placeholderEmail(who.did), email_confirm: true, user_metadata: { privy_did: who.did },
    });
    if (error || !data.user) throw new HttpError(500, error?.message ?? "Could not create the account.");
    userId = data.user.id;
  }
  // first link only: never move a Privy id that already belongs to another account
  await db.from("profiles").update({ privy_did: who.did }).eq("id", userId).is("privy_did", null);

  // mint a session for this account: an admin magic-link token, redeemed here so the cookies are set
  const { data: au } = await db.auth.admin.getUserById(userId);
  const email = au.user?.email;
  if (!email) throw new HttpError(500, "This account has no sign-in address.");
  const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !link.properties?.hashed_token) throw new HttpError(500, linkErr?.message ?? "Could not start the session.");
  const sb = await supabaseServer();
  const { data: session, error: otpErr } = await sb.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (otpErr || !session.user) throw new HttpError(500, otpErr?.message ?? "Could not start the session.");

  // a signed-in wallet is a verified wallet; a wallet already on another account is left as is
  let freeCredits = 0;
  if (who.wallet) {
    const { data: prof } = await db.from("profiles").select("wallet_address").eq("id", userId).single();
    if (!prof?.wallet_address) freeCredits = (await linkWallet(userId, who.wallet).catch(() => ({ freeCredits: 0 }))).freeCredits;
  }
  await applyReferral(session.user, (await cookies()).get("oriel_ref")?.value);
  return NextResponse.json({ ok: true, freeCredits });
});
