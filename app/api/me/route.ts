import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { getBalance } from "@/lib/credits";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const db = admin();
  const [{ data: profile }, { data: tier }, balance, { data: notes }, { data: ledger }] = await Promise.all([
    db.from("profiles").select("handle, wallet_address, wallet_verified_at, free_credits_claimed_at, referral_code, staked_tier, grace_until, purchased_tier, purchased_tier_until, email_build_done, email_low_credits").eq("id", user.id).single(),
    db.rpc("effective_tier", { p_user: user.id }),
    getBalance(user.id),
    db.from("notifications").select("id, body, created_at").eq("user_id", user.id).eq("read", false).order("id", { ascending: false }).limit(5),
    db.from("credit_ledger").select("id, delta, bucket, reason, created_at").eq("user_id", user.id).order("id", { ascending: false }).limit(15),
  ]);
  return NextResponse.json({ email: user.email, profile, tier, balance, notifications: notes ?? [], ledger: ledger ?? [] });
});

// change the public handle (shown in the template marketplace) and/or email notification preferences
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser();
  const b = await req.json().catch(() => ({}));
  const patch: { handle?: string; email_build_done?: boolean; email_low_credits?: boolean } = {};
  if (b.handle !== undefined) {
    if (typeof b.handle !== "string" || !/^[a-z0-9_]{3,24}$/.test(b.handle)) throw new HttpError(400, "Handles are 3-24 characters: lowercase letters, numbers, underscores.");
    patch.handle = b.handle;
  }
  for (const k of ["email_build_done", "email_low_credits"] as const) {
    if (b[k] === undefined) continue;
    if (typeof b[k] !== "boolean") throw new HttpError(400, "Email preferences must be true or false.");
    patch[k] = b[k];
  }
  if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update.");
  const { error } = await admin().from("profiles").update(patch).eq("id", user.id);
  if (error?.code === "23505") throw new HttpError(409, "That handle is taken.");
  if (error) throw error;
  return NextResponse.json(patch);
});
