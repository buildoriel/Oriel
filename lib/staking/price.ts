import { parseAbi, getAddress } from "viem";
import { ADDR, decimalsOf, publicClient } from "../chain";
import { admin } from "../supabase/admin";
import { TWAP_DAYS } from "../config";

/**
 * $ORIEL price in USD from its market on Pons.
 * POOL_TYPE=curve: the Pons bonding curve, getReserves() = (ETH reserve, token reserve), priced in ETH and
 *   converted with the ETH/USD spot price (median of Coinbase and Kraken). After the curve graduates to a DEX,
 *   point ORIEL_POOL_ADDRESS at the new pool and set POOL_TYPE accordingly.
 * POOL_TYPE=v2 (getReserves) or v3 (slot0): the quote token is assumed to be USDG (=$1) unless QUOTE_USD_PRICE is set.
 */
const V2 = parseAbi(["function getReserves() view returns (uint112,uint112,uint32)", "function token0() view returns (address)", "function token1() view returns (address)"]);
const CURVE = parseAbi(["function getReserves() view returns (uint256 ethReserve, uint256 tokenReserve)", "function graduated() view returns (bool)"]);
const V3 = parseAbi(["function slot0() view returns (uint160 sqrtPriceX96,int24,uint16,uint16,uint16,uint8,bool)", "function token0() view returns (address)", "function token1() view returns (address)"]);

/** Constant-product spot price of the token in ETH from curve reserves (raw integer amounts). Pure, for tests. */
export function curvePriceEth(ethReserve: bigint, tokenReserve: bigint, tokenDecimals: number) {
  if (ethReserve <= 0n || tokenReserve <= 0n) throw new Error("Empty curve reserves");
  return (Number(ethReserve) / 1e18) / (Number(tokenReserve) / 10 ** tokenDecimals);
}

/** Median of the sources that answered, within sane bounds. Pure, for tests. */
export function medianPrice(xs: (number | null)[]) {
  const ok = xs.filter((x): x is number => typeof x === "number" && isFinite(x) && x > 100 && x < 100_000).sort((a, b) => a - b);
  if (!ok.length) throw new Error("No ETH/USD price available");
  const m = ok.length >> 1;
  return ok.length % 2 ? ok[m] : (ok[m - 1] + ok[m]) / 2;
}

async function ethUsd() {
  const get = (url: string, pick: (j: any) => unknown) =>
    fetch(url, { signal: AbortSignal.timeout(5_000), cache: "no-store" }).then((r) => r.json()).then((j) => Number(pick(j))).catch(() => null);
  return medianPrice(await Promise.all([
    get("https://api.coinbase.com/v2/prices/ETH-USD/spot", (j) => j?.data?.amount),
    get("https://api.kraken.com/0/public/Ticker?pair=ETHUSD", (j) => j?.result?.XETHZUSD?.c?.[0]),
  ]));
}

export async function readSpotPriceUsd() {
  const c = publicClient(); const pool = ADDR.pool(); const oriel = ADDR.oriel();
  if (process.env.POOL_TYPE === "curve") {
    if (await c.readContract({ address: pool, abi: CURVE, functionName: "graduated" }).catch(() => false))
      throw new Error("The Pons curve has graduated: set ORIEL_POOL_ADDRESS and POOL_TYPE to the new DEX pool.");
    const [[ethR, tokR], dO, usd] = await Promise.all([
      c.readContract({ address: pool, abi: CURVE, functionName: "getReserves" }), decimalsOf(oriel), ethUsd(),
    ]);
    return { priceUsd: curvePriceEth(ethR, tokR, dO) * usd, block: await c.getBlockNumber() };
  }
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
