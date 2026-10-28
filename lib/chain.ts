import { createPublicClient, defineChain, http, parseAbi, parseEventLogs, getAddress, type Address } from "viem";

// Robinhood Chain: isi chain id & RPC resmi di .env (jangan hardcode).
export const robinhoodChain = defineChain({
  id: Number(process.env.RH_CHAIN_ID ?? 4663),
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.RH_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: process.env.RH_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com" } },
});
export const publicClient = () => createPublicClient({ chain: robinhoodChain, transport: http(process.env.RH_RPC_URL) });

export const ADDR = {
  usdg: () => getAddress(process.env.USDG_TOKEN_ADDRESS!),
  oriel: () => getAddress(process.env.ORIEL_TOKEN_ADDRESS!),
  treasury: () => getAddress(process.env.TREASURY_ADDRESS!),
  staking: () => getAddress(process.env.STAKING_CONTRACT_ADDRESS!),
  pool: () => getAddress(process.env.ORIEL_POOL_ADDRESS!),
  distributor: () => getAddress(process.env.REVSHARE_DISTRIBUTOR_ADDRESS!),
};

export const ERC20 = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
]);
export const STAKING_ABI = parseAbi([
  "function stakedOf(address) view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "event Staked(address indexed user, uint256 amount, uint256 newBalance)",
  "event Unstaked(address indexed user, uint256 amount, uint256 newBalance)",
]);

const MIN_CONF = BigInt(process.env.PAYMENT_MIN_CONFIRMATIONS ?? 3);

/** Verifikasi transfer token dari wallet user ke treasury. Mengembalikan jumlah raw yang diterima. */
export async function verifyTransfer(txHash: `0x${string}`, token: Address, from: Address) {
  const c = publicClient();
  const receipt = await c.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("Transaksi gagal di chain.");
  const head = await c.getBlockNumber();
  if (head - receipt.blockNumber + 1n < MIN_CONF) throw new Error("Transaksi belum cukup konfirmasi. Coba lagi sebentar.");
  const logs = parseEventLogs({ abi: ERC20, logs: receipt.logs, eventName: "Transfer" })
    .filter((l) => getAddress(l.address) === token && getAddress(l.args.to) === ADDR.treasury() && getAddress(l.args.from) === from);
  const amount = logs.reduce((s, l) => s + l.args.value, 0n);
  if (amount === 0n) throw new Error("Tidak ada transfer ke treasury Oriel dari wallet terverifikasimu di transaksi ini.");
  return { amount, blockNumber: receipt.blockNumber };
}

export async function decimalsOf(token: Address) {
  return Number(await publicClient().readContract({ address: token, abi: ERC20, functionName: "decimals" }));
}
