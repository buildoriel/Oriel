import { NextResponse } from "next/server";
import { z } from "zod";
import { getAddress } from "viem";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { grant } from "@/lib/credits";
import { ADDR, decimalsOf, robinhoodChain, verifyTransfer } from "@/lib/chain";
import { orielPriceUsd } from "@/lib/staking/price";
import { CREDIT_PRICE_USD, TIER_PRICE_USD, TOPUP_PACKS, REFERRAL_REWARD_MAX, REFERRAL_REWARD_PCT, type PackId } from "@/lib/config";
import { handle } from "@/lib/http";

const Body = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  token: z.enum(["USDG", "ORIEL"]),
  product: z.enum(["pack_500", "pack_2500", "pack_10000", "builder", "pro", "studio"]),
});

/**
 * Flow: the client sends tokens to the TREASURY from a verified wallet -> sends the txHash here.
 * The server verifies the on-chain Transfer log and the USD value, then grants credits. Unique tx_hash = no double claims.
 * $ORIEL payments are valued at the LOWER of spot and the 7-day TWAP (anti-manipulation).
 * Underpayments are not rejected: their value becomes top-up credits.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = Body.safeParse(await req.json());
  if (!b.success) throw new HttpError(400, "Invalid payment data.");
  const { txHash, token, product } = b.data;
  const db = admin();
  const { data: profile } = await db.from("profiles").select("wallet_address, wallet_verified_at, referred_by, purchased_tier, purchased_tier_until").eq("id", user.id).single();
  if (!profile?.wallet_verified_at || !profile.wallet_address) throw new HttpError(400, "Verify your wallet first.");
  const { data: used } = await db.from("payments").select("id").eq("tx_hash", txHash.toLowerCase()).maybeSingle();
  if (used) throw new HttpError(409, "This transaction has already been used.");

  const tokenAddr = token === "USDG" ? ADDR.usdg() : ADDR.oriel();
  // verification messages (not enough confirmations, no transfer, etc.) are passed to the user as is
  const { amount } = await verifyTransfer(txHash as `0x${string}`, tokenAddr, getAddress(profile.wallet_address))
    .catch((e: Error) => { throw new HttpError(400, e.message); });
  const dec = await decimalsOf(tokenAddr);
  const units = Number(amount) / 10 ** dec;
  const priceUsd = token === "USDG" ? 1 : await orielPriceUsd();
  const usdValue = units * priceUsd;

  const isPack = product.startsWith("pack_");
  const requiredUsd = isPack ? TOPUP_PACKS[product as PackId].usd : TIER_PRICE_USD[product as "builder" | "pro" | "studio"];
  // Underpayment (e.g. the $ORIEL price dropped between quote and confirmation): the user's funds are not lost,
  // their value is converted into top-up credits at the normal price.
  const short = usdValue + 0.01 < requiredUsd * 0.995;

  let credits = 0;
  if (short) credits = Math.floor(usdValue / CREDIT_PRICE_USD);
  else if (isPack) credits = TOPUP_PACKS[product as PackId].credits;
  else {
    const { data: t } = await db.from("tiers").select("monthly_credits").eq("id", product).single();
    credits = t?.monthly_credits ?? 0;
  }
  const { data: pay, error } = await db.from("payments").insert({
    user_id: user.id, chain_id: robinhoodChain.id, tx_hash: txHash.toLowerCase(), token,
    // numeric(78,0): sent as a string so 18-decimal amounts keep full precision
    amount_raw: amount.toString() as unknown as number,
    usd_value: usdValue, kind: isPack || short ? "topup" : "tier_month", product: short ? `partial_${product}` : product, credits,
  }).select("id").single();
  if (error?.code === "23505") throw new HttpError(409, "This transaction has already been used.");
  if (error || !pay) throw error ?? new Error("payment insert failed");

  if (isPack || short) { if (credits > 0) await grant(user.id, credits, "topup", "topup", pay.id, short ? { partial: product } : {}); }
  else {
    // monthly tier: active for 30 days from now (or extended). Tier credits are valid for that period.
    const base = profile.purchased_tier === product && profile.purchased_tier_until && new Date(profile.purchased_tier_until) > new Date()
      ? new Date(profile.purchased_tier_until) : new Date();
    base.setUTCDate(base.getUTCDate() + 30);
    await db.from("profiles").update({ purchased_tier: product, purchased_tier_until: base.toISOString() }).eq("id", user.id);
    await grant(user.id, credits, "monthly", "topup", pay.id, { tier: product });
  }
  // overpayment (the $ORIEL price margin in the quote) is returned as top-up credits
  const extra = short ? 0 : Math.floor((usdValue - requiredUsd) / CREDIT_PRICE_USD);
  if (extra >= 1) await grant(user.id, extra, "topup", "topup", pay.id, { overpay_usd: usdValue - requiredUsd });

  // referral: one-time reward on the first purchase
  const { count } = await db.from("payments").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (count === 1) {
    const { data: r } = await db.from("referrals").select("id, referrer_id, rewarded").eq("referred_id", user.id).maybeSingle();
    if (r && !r.rewarded) {
      const reward = Math.min(REFERRAL_REWARD_MAX, Math.floor(credits * REFERRAL_REWARD_PCT));
      if (reward > 0) await grant(r.referrer_id, reward, "topup", "referral_reward", String(r.id));
      await db.from("referrals").update({ rewarded: true, reward_credits: reward }).eq("id", r.id);
    }
  }
  return NextResponse.json({
    credits, usdValue, partial: short,
    message: short ? `The transfer value $${usdValue.toFixed(2)} is below the price of $${requiredUsd}. Converted into ${credits} top-up credits.` : undefined,
  });
});
