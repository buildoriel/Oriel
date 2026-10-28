import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { getBalance } from "@/lib/credits";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const db = admin();
  const [{ data: profile }, { data: tier }, balance, { data: notes }] = await Promise.all([
    db.from("profiles").select("handle, wallet_address, wallet_verified_at, referral_code, staked_tier, grace_until, purchased_tier, purchased_tier_until").eq("id", user.id).single(),
    db.rpc("effective_tier", { p_user: user.id }),
    getBalance(user.id),
    db.from("notifications").select("id, body, created_at").eq("user_id", user.id).eq("read", false).order("id", { ascending: false }).limit(5),
  ]);
  return NextResponse.json({ email: user.email, profile, tier, balance, notifications: notes ?? [] });
});
