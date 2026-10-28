// Prepare the createEpoch transaction for the multisig after the monthly cron finishes.
// Run: npx tsx --env-file=.env scripts/epoch-calldata.ts 2026-10-01
import { createClient } from "@supabase/supabase-js";
import { encodeFunctionData, parseAbi, getAddress } from "viem";

async function main() {
  const period = process.argv[2];
  if (!period) throw new Error("Usage: epoch-calldata.ts YYYY-MM-01");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: econ } = await db.from("monthly_economics").select("merkle_root").eq("period", period).single();
  const { data: rows } = await db.from("revshare_allocations").select("amount_raw").eq("period", period);
  const total = (rows ?? []).reduce((s, r: any) => s + BigInt(r.amount_raw), 0n);
  const epoch = BigInt(period.slice(0, 7).replace("-", ""));
  const abi = parseAbi(["function createEpoch(uint256 epoch, bytes32 root, uint128 total)", "function approve(address,uint256) returns (bool)"]);
  const dist = getAddress(process.env.REVSHARE_DISTRIBUTOR_ADDRESS!);
  console.log("1) USDG.approve ->", process.env.USDG_TOKEN_ADDRESS);
  console.log(encodeFunctionData({ abi, functionName: "approve", args: [dist, total] }));
  console.log("2) RevenueDistributor.createEpoch ->", dist);
  console.log(encodeFunctionData({ abi, functionName: "createEpoch", args: [epoch, econ!.merkle_root as `0x${string}`, total] }));
  console.log(`epoch=${epoch} total_raw=${total} recipients=${rows?.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
