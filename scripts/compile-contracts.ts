// Compiles contracts/src with solc-js (same settings as foundry.toml) into lib/contracts/artifacts.json,
// which the in-app deploy page (/admin/deploy) uses. Run: npx tsx scripts/compile-contracts.ts
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const solc = require("solc");
const root = join(__dirname, "..");
const CONTRACTS = ["OrielStaking", "RevenueDistributor"];

const sources = Object.fromEntries(CONTRACTS.map((c) => [`src/${c}.sol`, { content: readFileSync(join(root, "contracts/src", `${c}.sol`), "utf8") }]));
const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    // paris: no PUSH0/MCOPY, so the bytecode runs on any EVM chain regardless of its hardfork
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const findImports = (path: string) => {
  try { return { contents: readFileSync(require.resolve(path), "utf8") }; } catch { return { error: `not found: ${path}` }; }
};
const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (out.errors ?? []).filter((e: any) => e.severity === "error");
if (errors.length) { console.error(errors.map((e: any) => e.formattedMessage).join("\n")); process.exit(1); }

const artifacts: Record<string, { abi: unknown; bytecode: string }> = {};
for (const c of CONTRACTS) {
  const o = out.contracts[`src/${c}.sol`][c];
  artifacts[c] = { abi: o.abi, bytecode: `0x${o.evm.bytecode.object}` };
}
const meta = { compiler: `solc ${solc.version()}`, evmVersion: "paris", optimizerRuns: 200, openzeppelin: require("@openzeppelin/contracts/package.json").version };
writeFileSync(join(root, "lib/contracts/artifacts.json"), JSON.stringify({ meta, ...artifacts }, null, 1) + "\n");
console.log("compiled", CONTRACTS.map((c) => `${c} ${(artifacts[c].bytecode.length - 2) / 2} bytes`).join(", "), meta.compiler);
