// Business constants. All economic numbers live in one place so they are easy to recalculate after beta.
export const CREDIT_COST_USD = 0.01;   // 1 credit = $0.01 of AI cost
export const CREDIT_PRICE_USD = 0.02;  // sold at $0.02 (2x margin)

export const TOPUP_PACKS = {
  pack_500: { credits: 500, usd: 10 },
  pack_2500: { credits: 2500, usd: 50 },
  pack_10000: { credits: 10000, usd: 200 },
} as const;
export type PackId = keyof typeof TOPUP_PACKS;

export type TierId = "free" | "builder" | "pro" | "studio";
export const TIER_ORDER: TierId[] = ["free", "builder", "pro", "studio"];
export const TIER_PRICE_USD: Record<Exclude<TierId, "free">, number> = { builder: 20, pro: 50, studio: 200 };
export const TIER_STAKE_USD: Record<Exclude<TierId, "free">, number> = { builder: 200, pro: 500, studio: 2000 };

export const STAKE_BUFFER = 0.9;          // keep the tier while value >= 90% of the threshold
export const GRACE_MONTHS = 1;            // grace period before a tier downgrade
export const TWAP_DAYS = 7;

export const ECON = {
  stakerBudgetPctOfMargin: 0.4, // max 40% of last month's margin
  revsharePct: 0.5,             // of the remaining margin
  opsPct: 0.3,
  buybackPct: 0.2,
};

export const TEMPLATE_ROYALTY_PCT = Number(process.env.TEMPLATE_ROYALTY_PCT ?? 20) / 100;
export const REFERRAL_REWARD_PCT = Number(process.env.REFERRAL_REWARD_PCT ?? 10) / 100; // % of the first purchase's credits
export const REFERRAL_REWARD_MAX = Number(process.env.REFERRAL_REWARD_MAX ?? 500);

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";
export const SITES_CNAME_TARGET = process.env.SITES_CNAME_TARGET ?? `sites.${ROOT_DOMAIN}`;
