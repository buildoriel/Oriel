// Cek koneksi RPC server: npx tsx --env-file=.env.local scripts/check-rpc.ts
import { createPublicClient, http } from "viem";

async function main() {
  const url = process.env.RH_RPC_URL;
  if (!url) throw new Error("RH_RPC_URL kosong");
  const c = createPublicClient({ transport: http(url) });
  const [chainId, block] = await Promise.all([c.getChainId(), c.getBlockNumber()]);
  const expected = Number(process.env.RH_CHAIN_ID ?? 4663);
  console.log(`chainId=${chainId} block=${block}`);
  if (chainId !== expected) throw new Error(`Chain ID ${chainId} tidak sama dengan RH_CHAIN_ID ${expected}`);
  console.log("RPC OK: Robinhood Chain mainnet");
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
