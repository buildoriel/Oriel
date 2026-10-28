import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { handle } from "@/lib/http";

/** The user's revenue share allocations with Merkle proofs for claiming from RevenueDistributor. */
export const GET = handle(async () => {
  const user = await requireUser();
  const { data } = await admin().from("revshare_allocations").select("period, wallet, amount_raw, proof")
    .eq("user_id", user.id).order("period", { ascending: false }).limit(24);
  return NextResponse.json({
    distributor: process.env.REVSHARE_DISTRIBUTOR_ADDRESS ?? null,
    allocations: (data ?? []).map((a: any) => ({
      ...a, amount_raw: String(a.amount_raw), epoch: Number(String(a.period).slice(0, 7).replace("-", "")),
    })),
  });
});
