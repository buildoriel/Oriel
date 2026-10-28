// Template royalties -> USDG payment list for the multisig.
//   npx tsx --env-file=.env.local scripts/creator-payouts.ts            (preview, changes nothing)
//   npx tsx --env-file=.env.local scripts/creator-payouts.ts --commit   (create creator_payouts rows with status pending)
//   npx tsx --env-file=.env.local scripts/creator-payouts.ts --paid <payout_id> <tx_hash>
// Royalties below PAYOUT_MIN_USD (default 5) roll over to the next period so gas does not exceed the amount.
import { createClient } from "@supabase/supabase-js";
import { encodeFunctionData, parseAbi, parseUnits, getAddress } from "viem";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const MIN = Number(process.env.PAYOUT_MIN_USD ?? 5);
const DEC = Number(process.env.NEXT_PUBLIC_USDG_DECIMALS ?? 6);

async function main() {
  const [flag, id, tx] = process.argv.slice(2);
  if (flag === "--paid") {
    if (!id || !/^0x[0-9a-fA-F]{64}$/.test(tx ?? "")) throw new Error("Usage: --paid <payout_id> <tx_hash>");
    const { error } = await db.from("creator_payouts").update({ status: "paid", tx_hash: tx.toLowerCase() }).eq("id", id).eq("status", "pending");
    if (error) throw error;
    return console.log(`payout ${id} marked paid`);
  }
  const uses: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("template_uses").select("id, royalty_usd, templates(creator_id)").is("payout_id", null).gt("royalty_usd", 0).range(from, from + 999);
    if (error) throw error;
    uses.push(...(data ?? [])); if (!data || data.length < 1000) break;
  }
  const byCreator = new Map<string, { usd: number; ids: number[] }>();
  for (const u of uses) {
    const c = u.templates.creator_id as string;
    const e = byCreator.get(c) ?? { usd: 0, ids: [] };
    e.usd += Number(u.royalty_usd); e.ids.push(u.id); byCreator.set(c, e);
  }
  const usdg = process.env.USDG_TOKEN_ADDRESS ? getAddress(process.env.USDG_TOKEN_ADDRESS) : null;
  const abi = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]);
  const period = new Date().toISOString().slice(0, 10);
  let total = 0;
  for (const [creator, e] of byCreator) {
    const { data: p } = await db.from("profiles").select("wallet_address, handle").eq("id", creator).single();
    if (e.usd < MIN) { console.log(`hold   @${p?.handle ?? creator}: $${e.usd.toFixed(2)} (< $${MIN})`); continue; }
    if (!p?.wallet_address) { console.log(`hold   @${p?.handle ?? creator}: $${e.usd.toFixed(2)} (wallet not verified)`); continue; }
    const amount = parseUnits(e.usd.toFixed(Math.min(DEC, 6)), DEC);
    total += e.usd;
    console.log(`pay    @${p.handle ?? creator} ${p.wallet_address} $${e.usd.toFixed(2)} (${e.ids.length} uses)`);
    if (usdg) console.log(`       USDG.transfer -> ${usdg}\n       ${encodeFunctionData({ abi, functionName: "transfer", args: [getAddress(p.wallet_address), amount] })}`);
    if (flag === "--commit") {
      const { data: row, error } = await db.from("creator_payouts").insert({ creator_id: creator, amount_usd: e.usd, wallet: p.wallet_address, period }).select("id").single();
      if (error) throw error;
      await db.from("template_uses").update({ payout_id: row.id }).in("id", e.ids);
      console.log(`       payout_id=${row.id}`);
    }
  }
  console.log(`total $${total.toFixed(2)}${flag === "--commit" ? " (recorded as pending)" : " (preview; add --commit to record)"}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
