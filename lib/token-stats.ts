import { getAddress, isAddress, parseAbi, type Address } from "viem";
import { unstable_cache } from "next/cache";
import { publicClient } from "./chain";
import { officialToken } from "./official-token";
import { readSpotPriceUsd } from "./staking/price";

/**
 * Public, read-only facts about $ORIEL for the Token and Stake pages: the official addresses and live
 * on-chain numbers. Every read is independent, so one failing RPC call shows "—" instead of breaking the page.
 */
const INITIAL_SUPPLY = 1_000_000_000;   // minted once at launch on Pons
const DEAD = "0x000000000000000000000000000000000000dEaD";
const ERC20 = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);
const STAKING = parseAbi(["function totalStaked() view returns (uint256)"]);

const addr = (v?: string) => (v && isAddress(v) ? getAddress(v) : null);

export type TokenStats = {
  token: Address | null; staking: Address | null; distributor: Address | null; pool: Address | null;
  priceUsd: number | null; supply: number | null; burned: number | null; staked: number | null; updatedAt: string;
};

export async function tokenStats(): Promise<TokenStats> {
  const token = (await officialToken().catch(() => null))?.address ?? null;
  const staking = addr(process.env.STAKING_CONTRACT_ADDRESS);
  const distributor = addr(process.env.REVSHARE_DISTRIBUTOR_ADDRESS);
  const pool = addr(process.env.ORIEL_POOL_ADDRESS);
  const base = { token, staking, distributor, pool, updatedAt: new Date().toISOString() };
  if (!token) return { ...base, priceUsd: null, supply: null, burned: null, staked: null };

  const c = publicClient();
  const dec = await c.readContract({ address: token, abi: ERC20, functionName: "decimals" }).catch(() => 18);
  const units = (v: bigint) => Number(v) / 10 ** dec;
  const [total, dead, staked, price] = await Promise.all([
    c.readContract({ address: token, abi: ERC20, functionName: "totalSupply" }).then(units).catch(() => null),
    c.readContract({ address: token, abi: ERC20, functionName: "balanceOf", args: [DEAD] }).then(units).catch(() => null),
    staking ? c.readContract({ address: staking, abi: STAKING, functionName: "totalStaked" }).then(units).catch(() => null) : null,
    pool ? readSpotPriceUsd().then((r) => r.priceUsd).catch(() => null) : null,
  ]);
  // burned = sent to the dead address + destroyed with burn() (which lowers the total supply)
  const burned = total == null || dead == null ? null : dead + Math.max(0, INITIAL_SUPPLY - total);
  return { ...base, priceUsd: price, supply: total, burned, staked };
}

/** The same data, cached for a minute across visitors so page views don't each hit the RPC. */
export const cachedTokenStats = unstable_cache(tokenStats, ["token-stats"], { revalidate: 60 });
