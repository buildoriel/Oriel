import { NextResponse } from "next/server";
import { HttpError } from "@/lib/supabase/server";
import { orielPriceUsd } from "@/lib/staking/price";
import { stakingConfigured } from "@/lib/economics";
import { TIER_PRICE_USD, TOPUP_PACKS, type PackId } from "@/lib/config";
import { handle } from "@/lib/http";

const BUFFER = 1.03; // 3% price margin between quote and confirmation; any excess is returned as top-up credits

/** How much $ORIEL to send for one product. */
export const GET = handle(async (req: Request) => {
  const product = new URL(req.url).searchParams.get("product") ?? "";
  const usd = product in TOPUP_PACKS ? TOPUP_PACKS[product as PackId].usd
    : product in TIER_PRICE_USD ? TIER_PRICE_USD[product as keyof typeof TIER_PRICE_USD] : null;
  if (usd == null) throw new HttpError(400, "Unknown product.");
  if (!stakingConfigured()) throw new HttpError(503, "$ORIEL payments are not live yet. Use USDG.");
  const price = await orielPriceUsd().catch(() => { throw new HttpError(503, "Not enough $ORIEL price data yet. Use USDG for now."); });
  return NextResponse.json({ product, usd, priceUsd: price, amount: ((usd / price) * BUFFER).toFixed(6) });
});
