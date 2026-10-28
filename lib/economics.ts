import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { getAddress, parseUnits } from "viem";
import { admin } from "./supabase/admin";
import { ADDR, decimalsOf, publicClient, STAKING_ABI } from "./chain";
import { twap7d } from "./staking/price";
import { evaluateTier } from "./staking/tiers";
import { grant } from "./credits";
import { CREDIT_COST_USD, ECON, TIER_ORDER, type TierId } from "./config";

type Tier = { id: TierId; monthly_credits: number; revshare_weight: number };

/** Pure: margin split. Tested in scripts/economics.test.ts with the example from the brief. */
export function splitMargin(marginUsd: number, stakerDemandUsd: number, floorUsd = 0) {
  const budget = Math.max(floorUsd, Math.max(0, marginUsd) * ECON.stakerBudgetPctOfMargin);
  const scale = stakerDemandUsd > 0 ? Math.min(1, budget / stakerDemandUsd) : 1;
  const used = stakerDemandUsd * scale;
  const rest = Math.max(0, marginUsd - used);
  return {
    budget, scale, used,
    revshare: rest * ECON.revsharePct, ops: rest * ECON.opsPct, buyback: rest * ECON.buybackPct,
  };
}

const monthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

/** Staking is active once the token, staking contract, and pool are set (after $ORIEL launches). */
export const stakingConfigured = () =>
  !!(process.env.ORIEL_TOKEN_ADDRESS && process.env.STAKING_CONTRACT_ADDRESS && process.env.ORIEL_POOL_ADDRESS);

/**
 * Runs on the 1st of every month (idempotent per period).
 * 1) last month's margin  2) stake tier evaluation (7-day TWAP, buffer, grace period)
 * 3) staker credit budget <= 40% of margin, scaled proportionally  4) monthly credit refill
 * 5) remaining margin 50/30/20 -> revenue share (Merkle), operations, buyback
 *
 * Refill rules:
 *  - an active PURCHASED tier: its credits were granted at payment and last for its 30-day period,
 *    so they are not reset here (prevents credits expiring 6 days after paying, or a double refill).
 *  - staker: stake tier credits x budget scale. With an active purchased tier too, staker credits are ADDED.
 *  - Free: 60 credits, only for verified wallets.
 * If staking is not configured or there are not enough price samples, stake tiers are NOT re-evaluated
 * (the last tier is kept) and revenue share is held back; the credit refill still runs.
 */
export async function runMonthly(now = new Date()) {
  const db = admin();
  const thisMonth = monthStart(now);
  const thisPeriod = thisMonth.toISOString().slice(0, 10);
  const prev = new Date(thisMonth); prev.setUTCMonth(prev.getUTCMonth() - 1);
  const period = prev.toISOString().slice(0, 10);
  const { data: done } = await db.from("monthly_economics").select("period").eq("period", period).maybeSingle();
  if (done) return { skipped: true, period };

  // ---- 1. last month's margin ----
  const range = (q: any) => q.gte("created_at", prev.toISOString()).lt("created_at", thisMonth.toISOString());
  const revenue = await sumAll((from, to) => range(db.from("payments").select("usd_value")).range(from, to), "usd_value");
  const aiCost = await sumAll((from, to) => range(db.from("ai_usage").select("cost_usd")).range(from, to), "cost_usd");
  const margin = revenue - aiCost;

  // ---- 2. stake tier evaluation ----
  let twap: number | null = null, stakeNote: string | null = null;
  if (!stakingConfigured()) stakeNote = "staking not configured";
  else twap = await twap7d(now).catch((e: Error) => { stakeNote = e.message; return null; });
  const { data: tiers } = await db.from("tiers").select("id, monthly_credits, revshare_weight");
  const T = Object.fromEntries((tiers as Tier[]).map((t) => [t.id, t])) as Record<TierId, Tier>;
  const orielDec = twap ? await decimalsOf(ADDR.oriel()) : 18;
  const users = await allProfiles();
  const c = twap ? publicClient() : null;

  const evaluated: { id: string; wallet: string | null; stakedTier: TierId; valueUsd: number; paidTier: TierId; verified: boolean }[] = [];
  for (const batch of chunk(users, 20)) {
    const stakes = await Promise.all(batch.map((u) => c && u.wallet_address
      ? c.readContract({ address: ADDR.staking(), abi: STAKING_ABI, functionName: "stakedOf", args: [getAddress(u.wallet_address)] })
      : Promise.resolve(0n)));
    for (let i = 0; i < batch.length; i++) {
      const u = batch[i]; const raw = stakes[i];
      let stakedTier = u.staked_tier as TierId, valueUsd = 0;
      if (twap) {
        valueUsd = (Number(raw) / 10 ** orielDec) * twap;
        const r = evaluateTier({ current: u.staked_tier, valueUsd, graceUntil: u.grace_until ? new Date(u.grace_until) : null, now });
        stakedTier = r.tier;
        await db.from("profiles").update({ staked_tier: r.tier, grace_until: r.graceUntil?.toISOString() ?? null }).eq("id", u.id);
        if (u.wallet_address) await db.from("tier_evaluations").upsert({
          user_id: u.id, period: thisPeriod, staked_raw: raw.toString(), twap_usd: twap,
          stake_value_usd: valueUsd, prev_tier: u.staked_tier, new_tier: r.tier, grace_until: r.graceUntil?.toISOString() ?? null,
        }, { onConflict: "user_id,period" });
        const note = notice(r.event, u.staked_tier, r.tier, r.graceUntil);
        if (note) await db.from("notifications").insert({ user_id: u.id, kind: `tier_${r.event}`, body: note });
      }
      const paidTier: TierId = u.purchased_tier && u.purchased_tier_until && new Date(u.purchased_tier_until) > now ? u.purchased_tier : "free";
      evaluated.push({ id: u.id, wallet: u.wallet_address, stakedTier, valueUsd, paidTier, verified: !!u.wallet_verified_at });
    }
  }
  // premium build quota (Pro: "occasional" Opus) starts over from zero
  await db.from("profiles").update({ premium_builds_used: 0 }).gt("premium_builds_used", 0);

  // ---- 3. staker credit budget ----
  // staker = stake tier above the purchased tier; their credits are funded by margin, not by minting tokens
  const rank = (t: TierId) => TIER_ORDER.indexOf(t);
  const stakers = evaluated.filter((e) => e.stakedTier !== "free" && rank(e.stakedTier) > rank(e.paidTier));
  const demand = stakers.reduce((s, e) => s + T[e.stakedTier].monthly_credits * CREDIT_COST_USD, 0);
  const split = splitMargin(margin, demand, Number(process.env.STAKER_BUDGET_FLOOR_USD ?? 0));

  // ---- 4. monthly credit refill ----
  for (const e of evaluated) {
    const isStaker = stakers.includes(e);
    if (isStaker) {
      const credits = Math.floor(T[e.stakedTier].monthly_credits * split.scale);
      if (e.paidTier !== "free") { if (credits > 0) await grant(e.id, credits, "monthly", "monthly_refill", thisPeriod, { staker: true }); }
      else await db.rpc("reset_monthly_credits", { p_user: e.id, p_amount: credits, p_period: thisPeriod });
    } else if (e.paidTier === "free") {
      await db.rpc("reset_monthly_credits", { p_user: e.id, p_amount: e.verified ? T.free.monthly_credits : 0, p_period: thisPeriod });
    }
    // active purchased tier: skipped, its credits follow the 30-day purchase period
  }

  // ---- 5. revenue share (USDG) via Merkle ----
  // held back if stake values cannot be computed this month; the amount is still recorded in monthly_economics
  const holders = twap ? evaluated.filter((e) => e.stakedTier !== "free" && e.wallet && e.valueUsd > 0) : [];
  const totalW = holders.reduce((s, e) => s + e.valueUsd * T[e.stakedTier].revshare_weight, 0);
  const usdgDec = holders.length && process.env.USDG_TOKEN_ADDRESS ? await decimalsOf(ADDR.usdg()) : 6;
  const allocations = holders.map((e) => {
    const share = totalW > 0 ? (e.valueUsd * T[e.stakedTier].revshare_weight) / totalW : 0;
    return { e, raw: parseUnits((split.revshare * share).toFixed(Math.min(usdgDec, 6)), usdgDec) };
  }).filter((a) => a.raw > 0n);

  let root: string | null = null;
  if (allocations.length) {
    const tree = StandardMerkleTree.of(allocations.map((a) => [getAddress(a.e.wallet!), a.raw.toString()]), ["address", "uint256"]);
    root = tree.root;
    const rows = [...tree.entries()].map(([i, v]) => ({ period, user_id: allocations[i].e.id, wallet: v[0], amount_raw: v[1], proof: tree.getProof(i) }));
    // if writing allocations fails, the period row is deleted again so the job can be safely re-run
    await db.from("revshare_allocations").delete().eq("period", period);
    await db.from("monthly_economics").upsert(econRow(period, revenue, aiCost, margin, demand, split, root), { onConflict: "period" });
    for (const part of chunk(rows, 500)) {
      const { error } = await db.from("revshare_allocations").insert(part);
      if (error) {
        await db.from("revshare_allocations").delete().eq("period", period);
        await db.from("monthly_economics").delete().eq("period", period);
        throw error;
      }
    }
  } else {
    await db.from("monthly_economics").insert(econRow(period, revenue, aiCost, margin, demand, split, null));
  }
  if (split.buyback > 0) await db.from("buybacks").insert({ period, usd_amount: split.buyback });

  return { period, revenue, aiCost, margin, demand, ...split, merkleRoot: root, stakers: stakers.length, twap, stakeNote };
}

function econRow(period: string, revenue: number, aiCost: number, margin: number, demand: number, s: ReturnType<typeof splitMargin>, root: string | null) {
  return { period, revenue_usd: revenue, ai_cost_usd: aiCost, margin_usd: margin, staker_budget_usd: s.budget,
    staker_demand_usd: demand, staker_scale: s.scale, staker_used_usd: s.used, revshare_usd: s.revshare,
    ops_usd: s.ops, buyback_usd: s.buyback, merkle_root: root };
}

function notice(event: string, from: TierId, to: TierId, grace: Date | null) {
  if (event === "upgrade") return `Your tier is now ${cap(to)}. This month's credits have been added.`;
  if (event === "grace_started") return `Your stake value is below the ${cap(from)} safe threshold. You stay on ${cap(from)} until ${grace!.toISOString().slice(0, 10)}. Add to your stake to keep your tier.`;
  if (event === "in_grace") return `Reminder: your ${cap(from)} grace period ends ${grace!.toISOString().slice(0, 10)}.`;
  if (event === "downgrade") return `Your grace period has ended. Your stake tier is now ${cap(to)}.`;
  return null;
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
async function sumAll(page: (from: number, to: number) => any, k: string) {
  let total = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    total += (data ?? []).reduce((s: number, r: any) => s + Number(r[k] ?? 0), 0);
    if (!data || data.length < 1000) return total;
  }
}
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function allProfiles() {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin().from("profiles")
      .select("id, wallet_address, wallet_verified_at, staked_tier, grace_until, purchased_tier, purchased_tier_until")
      .range(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}
