import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const db = admin();
  const { data: p } = await db.from("profiles").select("referral_code").eq("id", user.id).single();
  const { data: refs } = await db.from("referrals").select("rewarded, reward_credits").eq("referrer_id", user.id);
  return NextResponse.json({
    link: `${process.env.NEXT_PUBLIC_APP_URL}/?ref=${p.referral_code}`,
    invited: refs?.length ?? 0,
    rewardedCredits: (refs ?? []).reduce((s: number, r: any) => s + Number(r.reward_credits ?? 0), 0),
  });
});
