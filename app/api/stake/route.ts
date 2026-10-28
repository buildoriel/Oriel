import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ADDR, decimalsOf, publicClient, STAKING_ABI } from "@/lib/chain";
import { twap7d, readSpotPriceUsd } from "@/lib/staking/price";
import { tierForValue } from "@/lib/staking/tiers";
import { stakingConfigured } from "@/lib/economics";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const { data: p } = await admin().from("profiles").select("wallet_address, wallet_verified_at, staked_tier, grace_until").eq("id", user.id).single();
  // before $ORIEL launches and the contracts are deployed: the page still renders without chain data
  if (!stakingConfigured()) return NextResponse.json({ configured: false, staked: 0, twap: null, spot: null, value: null,
    currentTier: p.staked_tier, graceUntil: p.grace_until, walletVerified: !!p.wallet_verified_at });
  const [twap, spot, dec] = await Promise.all([twap7d().catch(() => null), readSpotPriceUsd().then((r) => r.priceUsd).catch(() => null), decimalsOf(ADDR.oriel())]);
  let staked = 0;
  if (p.wallet_address) {
    const raw = await publicClient().readContract({ address: ADDR.staking(), abi: STAKING_ABI, functionName: "stakedOf", args: [getAddress(p.wallet_address)] });
    staked = Number(raw) / 10 ** dec;
  }
  const value = twap ? staked * twap : null;
  const { data: last } = await admin().from("revshare_allocations").select("period, amount_raw").eq("user_id", user.id).order("period", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({
    configured: true, walletVerified: !!p.wallet_verified_at, staked, twap, spot, value, currentTier: p.staked_tier, graceUntil: p.grace_until,
    projectedTier: value != null ? tierForValue(value) : null, lastRevshare: last,
    contracts: { staking: process.env.STAKING_CONTRACT_ADDRESS, token: process.env.ORIEL_TOKEN_ADDRESS, distributor: process.env.REVSHARE_DISTRIBUTOR_ADDRESS },
  });
});
