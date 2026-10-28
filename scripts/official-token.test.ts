import assert from "node:assert/strict";
import { scan, type State } from "../lib/official-token";

// Fake chain: the dev wallet (default 0x849f…) launches ORIEL through a factory; an attacker airdrops a fake ORIEL to it first.
const DEV = "0x849f72e8d2b1349188ca4cb056b97de3efe5f5d9";
const ATTACKER = "0x00000000000000000000000000000000000000aa";
const FAKE = "0x1111111111111111111111111111111111111111";
const REAL = "0x2222222222222222222222222222222222222222";
const FACTORY = "0x3333333333333333333333333333333333333333";
const word = (a: string) => `0x${a.slice(2).padStart(64, "0")}`;
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const logs = [
  { block: 100_090_010n, address: FAKE, topics: [TRANSFER, word(ATTACKER), word(DEV)], data: word("0x01"), transactionHash: "0xspam" },
  // factory event: creator indexed, token address in the data (not indexed)
  { block: 100_120_500n, address: FACTORY, topics: ["0xcreated", word(DEV)], data: `0x${word(REAL).slice(2)}${word("0x05").slice(2)}`, transactionHash: "0xlaunch" },
];
const senders: Record<string, string> = { "0xspam": ATTACKER, "0xlaunch": DEV };
const symbols: Record<string, string> = { [FAKE]: "ORIEL", [REAL]: "ORIEL", [FACTORY]: "" };

function fakeClient(head: bigint, limit: bigint) {
  let calls = 0;
  return {
    calls: () => calls,
    getBlockNumber: async () => head,
    getTransaction: async ({ hash }: { hash: string }) => ({ from: senders[hash] }),
    readContract: async ({ address }: { address: string }) => {
      const s = symbols[address.toLowerCase()];
      if (!s) throw new Error("not a token");
      return s;
    },
    request: async ({ params: [f] }: any) => {
      calls++;
      const from = BigInt(f.fromBlock), to = BigInt(f.toBlock);
      if (to - from + 1n > limit) throw Object.assign(new Error("rpc"), { details: `query spans ${to - from + 1n} blocks, but only ${limit} are allowed for this request` });
      const pos = f.topics.length - 1;
      return logs.filter((l) => l.block >= from && l.block <= to && l.topics[pos]?.toLowerCase() === f.topics[pos].toLowerCase());
    },
  } as any;
}

async function main() {
  const start: State = { token: null, lastBlock: "100089999", checkedAt: 0 };

  // before the launch: the airdropped fake is ignored, the scan advances to the head
  let s = await scan(start, fakeClient(100_100_000n, 30_000n));
  assert.equal(s.token, null);
  assert.equal(s.lastBlock, "100100000");

  // after the launch: finds the real token from the factory event's data, adapting to a smaller range limit
  const c = fakeClient(100_200_000n, 20_000n);
  s = await scan(s, c);
  assert.equal(s.token?.toLowerCase(), REAL);
  assert.equal(s.tx, "0xlaunch");
  console.log("official token: ignores look-alike airdrops, finds the dev's launch, adapts to RPC limits ok");
}
main().catch((e) => { console.error(e); process.exit(1); });
