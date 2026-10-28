import { GRACE_MONTHS, STAKE_BUFFER, TIER_ORDER, TIER_STAKE_USD, type TierId } from "../config";

const rank = (t: TierId) => TIER_ORDER.indexOf(t);
const threshold = (t: TierId) => (t === "free" ? 0 : TIER_STAKE_USD[t]);

/** Tier tertinggi yang syaratnya terpenuhi penuh. */
export function tierForValue(v: number): TierId {
  return [...TIER_ORDER].reverse().find((t) => v >= threshold(t)) ?? "free";
}

/**
 * Aturan evaluasi bulanan:
 *  - naik tier langsung bila nilai >= batas tier lebih tinggi
 *  - tetap di tier sekarang selama nilai >= 90% batasnya (buffer 10%)
 *  - di bawah buffer: mulai masa tenggang 1 bulan (tetap di tier), beri notifikasi
 *  - masih di bawah buffer setelah masa tenggang habis: turun ke tier yang sesuai nilai
 */
export function evaluateTier(input: { current: TierId; valueUsd: number; graceUntil: Date | null; now: Date }) {
  const { current, valueUsd, graceUntil, now } = input;
  const qualified = tierForValue(valueUsd);
  if (rank(qualified) >= rank(current)) return { tier: qualified, graceUntil: null, event: rank(qualified) > rank(current) ? "upgrade" : "keep" } as const;
  if (valueUsd >= threshold(current) * STAKE_BUFFER) return { tier: current, graceUntil: null, event: "keep_buffer" } as const;
  if (!graceUntil) {
    const g = new Date(now); g.setUTCMonth(g.getUTCMonth() + GRACE_MONTHS);
    return { tier: current, graceUntil: g, event: "grace_started" } as const;
  }
  if (now < graceUntil) return { tier: current, graceUntil, event: "in_grace" } as const;
  // turun; buffer berlaku untuk tier tujuan juga
  const buffered = [...TIER_ORDER].reverse().find((t) => rank(t) < rank(current) && valueUsd >= threshold(t) * STAKE_BUFFER) ?? "free";
  return { tier: buffered as TierId, graceUntil: null, event: "downgrade" } as const;
}
