// Run: npx tsx scripts/economics.test.ts
import assert from "node:assert";
import { splitMargin } from "../lib/economics";
import { evaluateTier } from "../lib/staking/tiers";

// Example from the brief: $10,000 margin, large staker demand -> 4,000 / 3,000 / 1,800 / 1,200
const s = splitMargin(10_000, 6_000);
assert.equal(s.used, 4000); assert.equal(s.revshare, 3000); assert.equal(s.ops, 1800); assert.equal(s.buyback, 1200);
assert.ok(Math.abs(s.scale - 4000 / 6000) < 1e-9);
// small demand: the unused budget goes back to the margin
const s2 = splitMargin(10_000, 1_000);
assert.equal(s2.scale, 1); assert.equal(s2.revshare, 4500);

const now = new Date("2026-11-01T00:00:00Z");
assert.equal(evaluateTier({ current: "builder", valueUsd: 185, graceUntil: null, now }).tier, "builder"); // buffer
const g = evaluateTier({ current: "builder", valueUsd: 150, graceUntil: null, now });
assert.equal(g.event, "grace_started"); assert.equal(g.tier, "builder");
assert.equal(evaluateTier({ current: "builder", valueUsd: 150, graceUntil: new Date("2026-11-01T00:00:00Z"), now }).tier, "free");
assert.equal(evaluateTier({ current: "builder", valueUsd: 520, graceUntil: null, now }).tier, "pro");
assert.equal(evaluateTier({ current: "pro", valueUsd: 300, graceUntil: new Date("2026-10-01"), now }).tier, "builder");
console.log("economics + tier tests: OK");
