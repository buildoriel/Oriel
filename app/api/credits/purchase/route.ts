import { NextResponse } from "next/server";
import { z } from "zod";
import { getAddress } from "viem";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { grant } from "@/lib/credits";
import { ADDR, decimalsOf, robinhoodChain, verifyTransfer } from "@/lib/chain";
import { readSpotPriceUsd, twap7d } from "@/lib/staking/price";
import { TIER_PRICE_USD, TOPUP_PACKS, REFERRAL_REWARD_MAX, REFERRAL_REWARD_PCT, type PackId } from "@/lib/config";
import { handle } from "@/lib/http";

const Body = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  token: z.enum(["USDG", "ORIEL"]),
  product: z.enum(["pack_500", "pack_2500", "pack_10000", "builder", "pro", "studio"]),
});

/**
 * Alur: klien mengirim token ke TREASURY dari wallet terverifikasi -> kirim txHash ke sini.
 * Server memverifikasi log Transfer on-chain, nilai USD, lalu mengisi kredit. tx_hash unik = anti double-claim.
 * Pembayaran $ORIEL dinilai dengan harga TERENDAH antara spot dan TWAP 7 hari (anti manipulasi).
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = Body.safeParse(await req.json());
  if (!b.success) throw new HttpError(400, "Data pembayaran tidak valid.");
  const { txHash, token, product } = b.data;
  const db = admin();
  const { data: profile } = await db.from("profiles").select("wallet_address, wallet_verified_at, referred_by, purchased_tier, purchased_tier_until").eq("id", user.id).single();
  if (!profile.wallet_verified_at) throw new HttpError(400, "Verifikasi wallet dulu.");
  const { data: used } = await db.from("payments").select("id").eq("tx_hash", txHash.toLowerCase()).maybeSingle();
  if (used) throw new HttpError(409, "Transaksi ini sudah dipakai.");

  const tokenAddr = token === "USDG" ? ADDR.usdg() : ADDR.oriel();
  const { amount } = await verifyTransfer(txHash as `0x${string}`, tokenAddr, getAddress(profile.wallet_address));
  const dec = await decimalsOf(tokenAddr);
  const units = Number(amount) / 10 ** dec;
  const priceUsd = token === "USDG" ? 1 : Math.min((await readSpotPriceUsd()).priceUsd, await twap7d());
  const usdValue = units * priceUsd;

  const isPack = product.startsWith("pack_");
  const requiredUsd = isPack ? TOPUP_PACKS[product as PackId].usd : TIER_PRICE_USD[product as "builder" | "pro" | "studio"];
  if (usdValue + 0.01 < requiredUsd * 0.995) throw new HttpError(402, `Nilai transfer $${usdValue.toFixed(2)} kurang dari harga $${requiredUsd}.`);

  let credits = 0;
  if (isPack) {
    credits = TOPUP_PACKS[product as PackId].credits;
  } else {
    const { data: t } = await db.from("tiers").select("monthly_credits").eq("id", product).single();
    credits = t.monthly_credits;
  }
  const { data: pay, error } = await db.from("payments").insert({
    user_id: user.id, chain_id: robinhoodChain.id, tx_hash: txHash.toLowerCase(), token, amount_raw: amount.toString(),
    usd_value: usdValue, kind: isPack ? "topup" : "tier_month", product, credits,
  }).select("id").single();
  if (error?.code === "23505") throw new HttpError(409, "Transaksi ini sudah dipakai.");
  if (error) throw error;

  if (isPack) await grant(user.id, credits, "topup", "topup", pay.id);
  else {
    // tier bulanan: aktif 30 hari dari sekarang (atau diperpanjang)
    const base = profile.purchased_tier === product && profile.purchased_tier_until && new Date(profile.purchased_tier_until) > new Date()
      ? new Date(profile.purchased_tier_until) : new Date();
    base.setUTCDate(base.getUTCDate() + 30);
    await db.from("profiles").update({ purchased_tier: product, purchased_tier_until: base.toISOString() }).eq("id", user.id);
    await grant(user.id, credits, "monthly", "topup", pay.id, { tier: product });
  }

  // referral: hadiah sekali, saat pembelian pertama
  const { count } = await db.from("payments").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (count === 1) {
    const { data: r } = await db.from("referrals").select("id, referrer_id, rewarded").eq("referred_id", user.id).maybeSingle();
    if (r && !r.rewarded) {
      const reward = Math.min(REFERRAL_REWARD_MAX, Math.floor(credits * REFERRAL_REWARD_PCT));
      if (reward > 0) await grant(r.referrer_id, reward, "topup", "referral_reward", String(r.id));
      await db.from("referrals").update({ rewarded: true, reward_credits: reward }).eq("id", r.id);
    }
  }
  return NextResponse.json({ credits, usdValue });
});
