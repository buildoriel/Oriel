import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { getAddress, parseUnits } from "viem";
import { admin } from "./supabase/admin";
import { ADDR, decimalsOf, publicClient, STAKING_ABI } from "./chain";
import { twap7d } from "./staking/price";
import { evaluateTier } from "./staking/tiers";
import { CREDIT_COST_USD, ECON, TIER_ORDER, type TierId } from "./config";

type Tier = { id: TierId; monthly_credits: number; revshare_weight: number };

/** Murni: pembagian margin. Diuji di scripts/economics.test.ts dengan contoh dari brief. */
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

/**
 * Dijalankan tanggal 1 tiap bulan (idempoten per periode).
 * 1) hitung margin bulan lalu  2) evaluasi tier stake (TWAP 7 hari, buffer, tenggang)
 * 3) anggaran kredit staker <= 40% margin, dibagi proporsional  4) isi ulang kredit bulanan
 * 5) sisa margin 50/30/20 -> bagi hasil (Merkle), operasional, buyback
 */
export async function runMonthly(now = new Date()) {
  const db = admin();
  const thisMonth = monthStart(now);
  const prev = new Date(thisMonth); prev.setUTCMonth(prev.getUTCMonth() - 1);
  const period = prev.toISOString().slice(0, 10);
  const { data: done } = await db.from("monthly_economics").select("period").eq("period", period).maybeSingle();
  if (done) return { skipped: true, period };

  // ---- 1. margin bulan lalu ----
  const range = (q: any) => q.gte("created_at", prev.toISOString()).lt("created_at", thisMonth.toISOString());
  const revenue = sum((await range(db.from("payments").select("usd_value"))).data, "usd_value");
  const aiCost = sum((await range(db.from("ai_usage").select("cost_usd"))).data, "cost_usd");
  const margin = revenue - aiCost;

  // ---- 2. evaluasi tier stake ----
  const twap = await twap7d(now);
  const { data: tiers } = await db.from("tiers").select("id, monthly_credits, revshare_weight");
  const T = Object.fromEntries((tiers as Tier[]).map((t) => [t.id, t])) as Record<TierId, Tier>;
  const orielDec = await decimalsOf(ADDR.oriel());
  const users = await allProfiles();
  const c = publicClient();

  const evaluated: { id: string; wallet: string | null; stakedTier: TierId; valueUsd: number; paidTier: TierId; verified: boolean }[] = [];
  for (const batch of chunk(users, 20)) {
    const stakes = await Promise.all(batch.map((u) => u.wallet_address
      ? c.readContract({ address: ADDR.staking(), abi: STAKING_ABI, functionName: "stakedOf", args: [getAddress(u.wallet_address)] })
      : Promise.resolve(0n)));
    for (let i = 0; i < batch.length; i++) {
      const u = batch[i]; const raw = stakes[i];
      const valueUsd = (Number(raw) / 10 ** orielDec) * twap;
      const r = evaluateTier({ current: u.staked_tier, valueUsd, graceUntil: u.grace_until ? new Date(u.grace_until) : null, now });
      await db.from("profiles").update({ staked_tier: r.tier, grace_until: r.graceUntil?.toISOString() ?? null, premium_builds_used: 0 }).eq("id", u.id);
      if (u.wallet_address) await db.from("tier_evaluations").upsert({
        user_id: u.id, period: thisMonth.toISOString().slice(0, 10), staked_raw: raw.toString(), twap_usd: twap,
        stake_value_usd: valueUsd, prev_tier: u.staked_tier, new_tier: r.tier, grace_until: r.graceUntil?.toISOString() ?? null,
      }, { onConflict: "user_id,period" });
      const note = notice(r.event, u.staked_tier, r.tier, r.graceUntil);
      if (note) await db.from("notifications").insert({ user_id: u.id, kind: `tier_${r.event}`, body: note });
      const paidTier: TierId = u.purchased_tier && u.purchased_tier_until && new Date(u.purchased_tier_until) > now ? u.purchased_tier : "free";
      evaluated.push({ id: u.id, wallet: u.wallet_address, stakedTier: r.tier, valueUsd, paidTier, verified: !!u.wallet_verified_at });
    }
  }

  // ---- 3. anggaran kredit staker ----
  // staker = tier stake lebih tinggi dari tier yang dibeli; kreditnya dibiayai margin, bukan mencetak token
  const rank = (t: TierId) => TIER_ORDER.indexOf(t);
  const stakers = evaluated.filter((e) => e.stakedTier !== "free" && rank(e.stakedTier) > rank(e.paidTier));
  const demand = stakers.reduce((s, e) => s + T[e.stakedTier].monthly_credits * CREDIT_COST_USD, 0);
  const split = splitMargin(margin, demand, Number(process.env.STAKER_BUDGET_FLOOR_USD ?? 0));

  // ---- 4. isi ulang kredit bulanan ----
  for (const e of evaluated) {
    let credits = 0;
    if (stakers.includes(e)) credits = Math.floor(T[e.stakedTier].monthly_credits * split.scale);
    else if (e.paidTier !== "free") credits = T[e.paidTier].monthly_credits;
    else if (e.verified) credits = T.free.monthly_credits; // Free hanya untuk wallet terverifikasi
    await db.rpc("reset_monthly_credits", { p_user: e.id, p_amount: credits, p_period: thisMonth.toISOString().slice(0, 10) });
  }

  // ---- 5. bagi hasil (USDG) via Merkle ----
  const usdgDec = await decimalsOf(ADDR.usdg());
  const holders = evaluated.filter((e) => e.stakedTier !== "free" && e.wallet);
  const totalW = holders.reduce((s, e) => s + e.valueUsd * T[e.stakedTier].revshare_weight, 0);
  const allocations = holders.map((e) => {
    const share = totalW > 0 ? (e.valueUsd * T[e.stakedTier].revshare_weight) / totalW : 0;
    return { e, raw: parseUnits((split.revshare * share).toFixed(Math.min(usdgDec, 6)), usdgDec) };
  }).filter((a) => a.raw > 0n);

  let root: string | null = null;
  if (allocations.length) {
    const tree = StandardMerkleTree.of(allocations.map((a) => [getAddress(a.e.wallet!), a.raw.toString()]), ["address", "uint256"]);
    root = tree.root;
    await db.from("monthly_economics").insert(econRow(period, revenue, aiCost, margin, demand, split, root));
    for (const [i, v] of tree.entries()) {
      const a = allocations[i];
      await db.from("revshare_allocations").insert({ period, user_id: a.e.id, wallet: v[0], amount_raw: v[1], proof: tree.getProof(i) });
    }
  } else {
    await db.from("monthly_economics").insert(econRow(period, revenue, aiCost, margin, demand, split, null));
  }
  if (split.buyback > 0) await db.from("buybacks").insert({ period, usd_amount: split.buyback });

  return { period, revenue, aiCost, margin, demand, ...split, merkleRoot: root, stakers: stakers.length };
}

function econRow(period: string, revenue: number, aiCost: number, margin: number, demand: number, s: ReturnType<typeof splitMargin>, root: string | null) {
  return { period, revenue_usd: revenue, ai_cost_usd: aiCost, margin_usd: margin, staker_budget_usd: s.budget,
    staker_demand_usd: demand, staker_scale: s.scale, staker_used_usd: s.used, revshare_usd: s.revshare,
    ops_usd: s.ops, buyback_usd: s.buyback, merkle_root: root };
}

function notice(event: string, from: TierId, to: TierId, grace: Date | null) {
  if (event === "upgrade") return `Tier-mu naik ke ${cap(to)}. Kredit bulan ini sudah diisi.`;
  if (event === "grace_started") return `Nilai stake-mu di bawah batas aman ${cap(from)}. Kamu tetap di ${cap(from)} sampai ${grace!.toISOString().slice(0, 10)}. Tambah stake agar tidak turun tier.`;
  if (event === "in_grace") return `Pengingat: masa tenggang ${cap(from)} berakhir ${grace!.toISOString().slice(0, 10)}.`;
  if (event === "downgrade") return `Masa tenggang berakhir. Tier stake-mu sekarang ${cap(to)}.`;
  return null;
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const sum = (rows: any[] | null, k: string) => (rows ?? []).reduce((s, r) => s + Number(r[k] ?? 0), 0);
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
