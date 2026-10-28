import { admin } from "./supabase/admin";

/** Links a brand-new account (created < 10 minutes ago) to the referrer from the oriel_ref cookie. */
export async function applyReferral(user: { id: string; created_at: string }, ref: string | undefined) {
  if (!ref || Date.now() - new Date(user.created_at).getTime() >= 10 * 60_000) return;
  const db = admin();
  const { data: referrer } = await db.from("profiles").select("id").eq("referral_code", ref).maybeSingle();
  if (!referrer || referrer.id === user.id) return;
  await db.from("referrals").insert({ referrer_id: referrer.id, referred_id: user.id });
  await db.from("profiles").update({ referred_by: referrer.id }).eq("id", user.id);
}
