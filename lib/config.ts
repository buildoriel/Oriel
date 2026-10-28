// Konstanta bisnis. Semua angka ekonomi di satu tempat agar mudah dihitung ulang setelah beta.
export const CREDIT_COST_USD = 0.01;   // 1 kredit = $0.01 biaya AI
export const CREDIT_PRICE_USD = 0.02;  // dijual $0.02 (margin 2x)

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

export const STAKE_BUFFER = 0.9;          // tetap di tier selama nilai >= 90% batas
export const GRACE_MONTHS = 1;            // masa tenggang sebelum turun tier
export const TWAP_DAYS = 7;

export const ECON = {
  stakerBudgetPctOfMargin: 0.4, // maks 40% margin bulan lalu
  revsharePct: 0.5,             // dari sisa margin
  opsPct: 0.3,
  buybackPct: 0.2,
};

export const TEMPLATE_ROYALTY_PCT = Number(process.env.TEMPLATE_ROYALTY_PCT ?? 20) / 100;
export const REFERRAL_REWARD_PCT = Number(process.env.REFERRAL_REWARD_PCT ?? 10) / 100; // % dari kredit pembelian pertama
export const REFERRAL_REWARD_MAX = Number(process.env.REFERRAL_REWARD_MAX ?? 500);

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";
export const SITES_CNAME_TARGET = process.env.SITES_CNAME_TARGET ?? `sites.${ROOT_DOMAIN}`;
