import { parseAbi, getAddress } from "viem";
import { ADDR, decimalsOf, publicClient } from "../chain";
import { admin } from "../supabase/admin";
import { TWAP_DAYS } from "../config";

/**
 * $ORIEL price in USD from the pool on Pons.
 * POOL_TYPE=v2 (getReserves) or v3 (slot0). The quote token is assumed to be USDG (=$1) unless
 * QUOTE_USD_PRICE is set (e.g. an ORIEL/WETH pool -> set it from a trusted ETH price source).
 * Adapt this function to the actual Pons pool interface.
 */
const V2 = parseAbi(["function getReserves() view returns (uint112,uint112,uint32)", "function token0() view returns (address)", "function token1() view returns (address)"]);
const V3 = parseAbi(["function slot0() view returns (uint160 sqrtPriceX96,int24,uint16,uint16,uint16,uint8,bool)", "function token0() view returns (address)", "function token1() view returns (address)"]);

export async function readSpotPriceUsd() {
  const c = publicClient(); const pool = ADDR.pool(); const oriel = ADDR.oriel();
  const t0 = getAddress(await c.readContract({ address: pool, abi: V2, functionName: "token0" }));
  const t1 = getAddress(await c.readContract({ address: pool, abi: V2, functionName: "token1" }));
  const quote = t0 === oriel ? t1 : t0;
  const [dO, dQ] = await Promise.all([decimalsOf(oriel), decimalsOf(quote)]);
  let priceInQuote: number;
  if ((process.env.POOL_TYPE ?? "v2") === "v3") {
    const [sqrtP] = await c.readContract({ address: pool, abi: V3, functionName: "slot0" });
    const p = (Number(sqrtP) / 2 ** 96) ** 2; // token1 per token0 (raw)
    const p01 = p * 10 ** ((t0 === oriel ? dO : dQ) - (t0 === oriel ? dQ : dO));
    priceInQuote = t0 === oriel ? p01 : 1 / p01;
  } else {
    const [r0, r1] = await c.readContract({ address: pool, abi: V2, functionName: "getReserves" });
    const [rO, rQ] = t0 === oriel ? [r0, r1] : [r1, r0];
    priceInQuote = (Number(rQ) / 10 ** dQ) / (Number(rO) / 10 ** dO);
  }
  const quoteUsd = Number(process.env.QUOTE_USD_PRICE ?? 1);
  return { priceUsd: priceInQuote * quoteUsd, block: await c.getBlockNumber() };
}

/** Stored every hour by the cron. */
export async function samplePrice() {
  const { priceUsd, block } = await readSpotPriceUsd();
  if (!(priceUsd > 0) || !isFinite(priceUsd)) throw new Error("Invalid pool price");
  await admin().from("price_samples").insert({ price_usd: priceUsd, block_number: Number(block) });
  return priceUsd;
}

/** 7-day TWAP = average of the hourly samples over the last 7 days (needs >= 70% of samples). */
export async function twap7d(at = new Date()) {
  const since = new Date(at.getTime() - TWAP_DAYS * 86400_000).toISOString();
  const { data } = await admin().from("price_samples").select("price_usd").gte("sampled_at", since).lte("sampled_at", at.toISOString());
  const xs = (data ?? []).map((r: any) => Number(r.price_usd)) as number[];
  const expected = TWAP_DAYS * 24;
  if (xs.length < expected * 0.7) throw new Error(`Not enough price samples (${xs.length}/${expected}). Tier not evaluated.`);
  return xs.reduce((a: number, b: number) => a + b, 0) / xs.length;
}

/** Price used to value $ORIEL payments: the lower of spot and the 7-day TWAP (a thin pool is easy to pump briefly). */
export async function orielPriceUsd() {
  const [spot, twap] = await Promise.all([readSpotPriceUsd().then((r) => r.priceUsd), twap7d()]);
  return Math.min(spot, twap);
}
