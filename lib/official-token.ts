import { createPublicClient, getAddress, http, isAddress, parseAbi, type Address, type Hex } from "viem";
import { admin } from "./supabase/admin";
import { robinhoodChain } from "./chain";

/**
 * The official $ORIEL contract address, found automatically: the first token with symbol ORIEL that shows up
 * in an event naming the dev wallet, in a transaction the dev wallet sent (the launchpad's "token created"
 * event, or the dev's first buy).
 * ORIEL_TOKEN_ADDRESS in the environment always wins. Progress is kept in app_settings so each scan
 * continues where the last one stopped; once found, the address never changes.
 */
const DEV = (process.env.ORIEL_DEV_WALLET ?? "0x849f72e8D2b1349188Ca4cb056b97dE3EFE5f5D9").toLowerCase();
const START_BLOCK = BigInt(process.env.ORIEL_TOKEN_START_BLOCK ?? 100_090_000);   // the dev wallet had no transactions before this
const SYMBOL = "ORIEL";
const KEY = "oriel_token";
// a public endpoint: hosted RPC plans often cap eth_getLogs at a few blocks
const LOGS_RPC = process.env.RH_LOGS_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com";
const MIN_INTERVAL_MS = 20_000;
const BUDGET_MS = 6_000;

export type State = { token: string | null; lastBlock: string; checkedAt: number; foundAt?: number; tx?: string };
export type OfficialToken = { address: Address | null; source: "env" | "chain" | null };

const ERC20 = parseAbi(["function symbol() view returns (string)"]);
const devTopic = `0x${DEV.slice(2).padStart(64, "0")}` as Hex;
const client = () => createPublicClient({ chain: robinhoodChain, transport: http(LOGS_RPC, { timeout: 8_000 }) });

/** Address-shaped 32-byte words: 12 zero bytes, then 20 non-zero bytes. */
function addressesIn(words: string[]) {
  return words.filter((w) => /^0x0{24}[0-9a-f]{40}$/i.test(w) && !/^0x0{64}$/.test(w)).map((w) => `0x${w.slice(26)}`.toLowerCase());
}

type Client = Pick<ReturnType<typeof client>, "getBlockNumber" | "request" | "readContract" | "getTransaction">;

async function isOfficial(c: Client, addr: string) {
  if (addr === DEV || !isAddress(addr)) return false;
  const symbol = await c.readContract({ address: addr as Address, abi: ERC20, functionName: "symbol" }).catch(() => null);
  return typeof symbol === "string" && symbol.trim().replace(/^\$/, "").toUpperCase() === SYMBOL;
}

/** Scans forward from the last scanned block, within a small time budget. Exported for tests. */
export async function scan(state: State, c: Client = client()): Promise<State> {
  const head = await c.getBlockNumber();
  let from = BigInt(state.lastBlock) + 1n, span = 30_000n;
  const t0 = Date.now();
  while (from <= head && Date.now() - t0 < BUDGET_MS) {
    const to = from + span - 1n > head ? head : from + span - 1n;
    let logs: { address: string; topics: string[]; data: string; transactionHash: string | null }[] = [];
    try {
      const range = { fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` };
      const byPos = await Promise.all([1, 2, 3].map((i) => c.request({
        method: "eth_getLogs",
        params: [{ ...range, topics: Array.from({ length: i + 1 }, (_, k) => (k === i ? devTopic : null)) }],
      } as any) as Promise<any[]>));
      logs = byPos.flat();
    } catch (e: any) {
      // the endpoint names its own limit ("only N are allowed"); otherwise halve and retry
      const n = String(e?.details ?? e?.message ?? "").match(/only (\d+) are allowed/)?.[1];
      const next = n ? BigInt(n) : span / 2n;
      if (next < 1n || next >= span) throw e;
      span = next;
      continue;
    }
    const seen = new Set<string>();
    const sentByDev = new Map<string, boolean>();
    for (const l of logs) {
      // only transactions the dev wallet sent itself: anyone can send a look-alike token *to* it
      const h = l.transactionHash;
      if (!h) continue;
      if (!sentByDev.has(h)) sentByDev.set(h, (await c.getTransaction({ hash: h as Hex }).catch(() => null))?.from.toLowerCase() === DEV);
      if (!sentByDev.get(h)) continue;
      for (const cand of [l.address.toLowerCase(), ...addressesIn(l.topics), ...addressesIn((l.data.slice(2).match(/.{64}/g) ?? []).map((w) => `0x${w}`))]) {
        if (seen.has(cand)) continue;
        seen.add(cand);
        if (await isOfficial(c, cand)) return { token: getAddress(cand), lastBlock: to.toString(), checkedAt: Date.now(), foundAt: Date.now(), tx: l.transactionHash ?? undefined };
      }
    }
    from = to + 1n;
  }
  return { token: null, lastBlock: (from - 1n).toString(), checkedAt: Date.now() };
}

export async function officialToken(): Promise<OfficialToken> {
  const env = process.env.ORIEL_TOKEN_ADDRESS ?? process.env.NEXT_PUBLIC_ORIEL_TOKEN_ADDRESS;
  if (env && isAddress(env)) return { address: getAddress(env), source: "env" };

  const db = admin();
  const { data } = await db.from("app_settings").select("value").eq("key", KEY).maybeSingle();
  const state: State = (data?.value as State) ?? { token: null, lastBlock: (START_BLOCK - 1n).toString(), checkedAt: 0 };
  if (state.token) return { address: getAddress(state.token), source: "chain" };
  if (Date.now() - state.checkedAt < MIN_INTERVAL_MS) return { address: null, source: null };

  // claim this check first so concurrent requests don't all scan
  await db.from("app_settings").upsert({ key: KEY, value: { ...state, checkedAt: Date.now() }, updated_at: new Date().toISOString() });
  const next = await scan(state).catch(() => ({ ...state, checkedAt: Date.now() }));
  await db.from("app_settings").upsert({ key: KEY, value: next, updated_at: new Date().toISOString() });
  return next.token ? { address: getAddress(next.token), source: "chain" } : { address: null, source: null };
}
