import { NextResponse } from "next/server";
import { HttpError } from "@/lib/supabase/server";
import { orielPriceUsd } from "@/lib/staking/price";
import { stakingConfigured } from "@/lib/economics";
import { TIER_PRICE_USD, TOPUP_PACKS, type PackId } from "@/lib/config";
import { handle } from "@/lib/http";

const BUFFER = 1.03; // 3% ruang gerak harga antara quote dan konfirmasi; kelebihannya dikembalikan sebagai kredit top-up

/** Berapa $ORIEL yang perlu dikirim untuk satu produk. */
export const GET = handle(async (req: Request) => {
  const product = new URL(req.url).searchParams.get("product") ?? "";
  const usd = product in TOPUP_PACKS ? TOPUP_PACKS[product as PackId].usd
    : product in TIER_PRICE_USD ? TIER_PRICE_USD[product as keyof typeof TIER_PRICE_USD] : null;
  if (usd == null) throw new HttpError(400, "Produk tidak dikenal.");
  if (!stakingConfigured()) throw new HttpError(503, "Pembayaran $ORIEL belum aktif. Pakai USDG.");
  const price = await orielPriceUsd().catch(() => { throw new HttpError(503, "Harga $ORIEL belum cukup data. Pakai USDG dulu."); });
  return NextResponse.json({ product, usd, priceUsd: price, amount: ((usd / price) * BUFFER).toFixed(6) });
});
