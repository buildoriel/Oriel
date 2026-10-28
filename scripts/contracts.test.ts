// Behavior tests for the compiled contracts (lib/contracts/artifacts.json) in an in-memory EVM, no network:
// npx tsx scripts/contracts.test.ts   (recompile first with scripts/compile-contracts.ts after editing contracts/src)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createVM } from "@ethereumjs/vm";
import { createAddressFromString, hexToBytes, bytesToHex } from "@ethereumjs/util";
import { createBlock } from "@ethereumjs/block";
const repo = join(__dirname, "..") + "/";
const req = createRequire(repo + "package.json");
const solc = req("solc");
const { encodeDeployData, encodeFunctionData, decodeFunctionResult, decodeErrorResult } = req("viem");
const { StandardMerkleTree } = req("@openzeppelin/merkle-tree");
async function main() {
const art = JSON.parse(readFileSync(repo + "lib/contracts/artifacts.json", "utf8"));

// a plain OpenZeppelin ERC20 with mint, compiled with the same settings
const mockSrc = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.24; import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract Mock is ERC20 { constructor() ERC20("Mock","M") {} function mint(address to, uint256 a) external { _mint(to, a); } }`;
const out = JSON.parse(solc.compile(JSON.stringify({ language: "Solidity", sources: { "M.sol": { content: mockSrc } },
  settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris", outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } }),
  { import: (p: string) => ({ contents: readFileSync(req.resolve(p), "utf8") }) }));
const Mock = { abi: out.contracts["M.sol"].Mock.abi, bytecode: "0x" + out.contracts["M.sol"].Mock.evm.bytecode.object };

const vm = await createVM();
const A = (h: string) => createAddressFromString(h);
const who = { treasury: "0x1000000000000000000000000000000000000001", alice: "0x2000000000000000000000000000000000000002", bob: "0x3000000000000000000000000000000000000003" };
let ts = 1_800_000_000n;
const block = () => createBlock({ header: { timestamp: ts, gasLimit: 30_000_000n } }, { common: vm.common });

async function deploy(c: any, args: unknown[], from = who.treasury) {
  const r = await vm.evm.runCall({ caller: A(from), data: hexToBytes(encodeDeployData({ abi: c.abi, bytecode: c.bytecode, args })), gasLimit: 10_000_000n, block: block() });
  assert.equal(r.execResult.exceptionError, undefined, "deploy failed"); return r.createdAddress!.toString();
}
async function call(c: any, to: string, fn: string, args: unknown[], from = who.treasury): Promise<{ error?: string; value?: any }> {
  const r = await vm.evm.runCall({ caller: A(from), to: A(to), data: hexToBytes(encodeFunctionData({ abi: c.abi, functionName: fn, args })), gasLimit: 5_000_000n, block: block() });
  const ret = bytesToHex(r.execResult.returnValue);
  if (r.execResult.exceptionError) { let name = "revert"; try { name = decodeErrorResult({ abi: c.abi, data: ret }).errorName; } catch {} return { error: name }; }
  return { value: ret === "0x" ? undefined : decodeFunctionResult({ abi: c.abi, functionName: fn, data: ret }) };
}
const ok = async (...a: [any, string, string, unknown[], string?]) => { const r = await call(...a); assert.equal(r.error, undefined, `${a[2]} reverted: ${r.error}`); return r.value; };
const fails = async (err: string, ...a: [any, string, string, unknown[], string?]) => { const r = await call(...a); assert.equal(r.error, err, `${a[2]} should revert ${err}, got ${r.error}`); };

// ---- OrielStaking ----
const oriel = await deploy(Mock, []);
const S = art.OrielStaking;
const staking = await deploy(S, [oriel]);
assert.equal((await ok(S, staking, "token", [])).toLowerCase(), oriel.toLowerCase());
await ok(Mock, oriel, "mint", [who.alice, 1000n]);
await ok(Mock, oriel, "approve", [staking, 1000n], who.alice);
await fails("ZeroAmount", S, staking, "stake", [0n], who.alice);
await ok(S, staking, "stake", [400n], who.alice);
assert.equal(await ok(S, staking, "stakedOf", [who.alice]), 400n);
assert.equal(await ok(S, staking, "totalStaked", []), 400n);
await fails("InsufficientStake", S, staking, "unstake", [500n], who.alice);
await fails("InsufficientStake", S, staking, "unstake", [1n], who.bob);   // nobody else can touch Alice's stake
await ok(S, staking, "unstake", [150n], who.alice);
assert.equal(await ok(Mock, oriel, "balanceOf", [who.alice]), 750n);
assert.equal(await ok(S, staking, "stakedOf", [who.alice]), 250n);
console.log("OrielStaking: stake, unstake, guards ok");

// ---- RevenueDistributor ----
const usdg = await deploy(Mock, []);
const D = art.RevenueDistributor;
const dist = await deploy(D, [usdg, who.treasury]);
assert.equal((await ok(D, dist, "owner", [])).toLowerCase(), who.treasury);
const tree = StandardMerkleTree.of([[who.alice, "100"], [who.bob, "200"]], ["address", "uint256"]);
await ok(Mock, usdg, "mint", [who.treasury, 1000n]);
await ok(Mock, usdg, "approve", [dist, 1000n]);
await fails("OwnableUnauthorizedAccount", D, dist, "createEpoch", [202610n, tree.root, 300n], who.alice);
await ok(D, dist, "createEpoch", [202610n, tree.root, 300n]);
await fails("EpochExists", D, dist, "createEpoch", [202610n, tree.root, 300n]);
assert.equal(await ok(Mock, usdg, "balanceOf", [dist]), 300n);
const proof = (i: number) => tree.getProof(i);
await fails("InvalidProof", D, dist, "claim", [202610n, who.alice, 200n, proof(0)], who.alice);  // wrong amount
await ok(D, dist, "claim", [202610n, who.alice, 100n, proof(0)], who.bob);                      // anyone may send it; funds go to Alice
assert.equal(await ok(Mock, usdg, "balanceOf", [who.alice]), 100n);
await fails("AlreadyClaimed", D, dist, "claim", [202610n, who.alice, 100n, proof(0)], who.alice);
await fails("UnknownEpoch", D, dist, "claim", [202611n, who.bob, 200n, proof(1)], who.bob);
await fails("WindowOpen", D, dist, "sweep", [202610n]);
ts += 366n * 86400n;
await fails("OwnableUnauthorizedAccount", D, dist, "sweep", [202610n], who.alice);
await ok(D, dist, "sweep", [202610n]);
assert.equal(await ok(Mock, usdg, "balanceOf", [who.treasury]), 900n);   // 1000 - 300 + 200 unclaimed back
await fails("AlreadyClaimed", D, dist, "claim", [202610n, who.alice, 100n, proof(0)], who.alice);
console.log("RevenueDistributor: epochs, claims, proofs, sweep, ownership ok");
}

main().catch((e) => { console.error(e); process.exit(1); });
