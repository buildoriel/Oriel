import { GRACE_MONTHS, STAKE_BUFFER, TIER_ORDER, TIER_STAKE_USD, type TierId } from "../config";

const rank = (t: TierId) => TIER_ORDER.indexOf(t);
const threshold = (t: TierId) => (t === "free" ? 0 : TIER_STAKE_USD[t]);

/** Highest tier whose threshold is fully met. */
export function tierForValue(v: number): TierId {
  return [...TIER_ORDER].reverse().find((t) => v >= threshold(t)) ?? "free";
}

/**
 * Monthly evaluation rules:
 *  - move up immediately when the value >= a higher tier's threshold
 *  - stay on the current tier while the value >= 90% of its threshold (10% buffer)
 *  - below the buffer: start a 1-month grace period (tier kept) and notify
 *  - still below the buffer after the grace period: drop to the tier the value qualifies for
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
  // downgrade; the buffer applies to the target tier too
  const buffered = [...TIER_ORDER].reverse().find((t) => rank(t) < rank(current) && valueUsd >= threshold(t) * STAKE_BUFFER) ?? "free";
  return { tier: buffered as TierId, graceUntil: null, event: "downgrade" } as const;
}
