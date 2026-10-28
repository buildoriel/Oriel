import { NextResponse } from "next/server";
import { HttpError } from "@/lib/supabase/server";
import { handle } from "@/lib/http";
import { limitByIp } from "@/lib/ratelimit";

/**
 * Read-only Robinhood Chain JSON-RPC, same-origin for the browser. Wallet in-app browsers sometimes stall
 * on requests to the public RPC; this keeps balance and contract reads working there. Transactions are
 * still sent by the user's wallet, never through here.
 */
const READS = new Set([
  "eth_chainId", "eth_blockNumber", "eth_getBalance", "eth_getCode", "eth_call", "eth_getTransactionCount",
  "eth_getTransactionReceipt", "eth_getTransactionByHash", "eth_getBlockByNumber", "eth_gasPrice",
  "eth_maxPriorityFeePerGas", "eth_feeHistory", "eth_estimateGas", "net_version",
]);
const UPSTREAM = process.env.RH_RPC_URL ?? process.env.NEXT_PUBLIC_RH_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com";

export const POST = handle(async (req: Request) => {
  await limitByIp(req, "rpc", 240);
  const body = await req.json().catch(() => null);
  const calls = Array.isArray(body) ? body : [body];
  if (!calls.length || calls.length > 20 || calls.some((c) => !c || typeof c.method !== "string" || !READS.has(c.method)))
    throw new HttpError(400, "Only read-only calls are allowed here.");
  const r = await fetch(UPSTREAM, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
  });
  return new NextResponse(await r.text(), { status: r.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
});
