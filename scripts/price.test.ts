import assert from "node:assert/strict";
import { curvePriceEth, medianPrice } from "../lib/staking/price";

// reserves read from the live $ORIEL curve on Pons: ~2.49 ETH (incl. virtual) against ~674M ORIEL
const p = curvePriceEth(0x22a0bc1a4e829e63n, 0x22cef38c0eea9f88b3601d3n, 18);
assert.ok(p > 3.6e-9 && p < 3.8e-9, `curve price ${p}`);
assert.throws(() => curvePriceEth(0n, 1n, 18));

assert.equal(medianPrice([3000, 3010]), 3005);
assert.equal(medianPrice([null, 2990]), 2990);
assert.equal(medianPrice([3000, 5, 3002, 1e9]), 3001);   // out-of-range quotes are ignored
assert.throws(() => medianPrice([null, null]));
console.log("price: Pons curve spot price and ETH/USD median ok");
