"use client";
import { createWalletClient, createPublicClient, custom, fallback, http, parseAbi, parseUnits, getAddress, type Abi, type Address, type Hex } from "viem";

const chain = {
  id: Number(process.env.NEXT_PUBLIC_RH_CHAIN_ID ?? 4663), name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  // Public RPC: this URL is saved in the user's wallet when adding the network, so it must not contain an API key
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RH_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: process.env.NEXT_PUBLIC_RH_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com" } },
} as const;

const ERC20 = parseAbi(["function transfer(address,uint256) returns (bool)", "function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)", "function decimals() view returns (uint8)", "function balanceOf(address) view returns (uint256)"]);
const STAKE = parseAbi(["function stake(uint256)", "function unstake(uint256)", "function stakedOf(address) view returns (uint256)"]);

export const TOKENS = {
  USDG: process.env.NEXT_PUBLIC_USDG_TOKEN_ADDRESS as Address,
  ORIEL: process.env.NEXT_PUBLIC_ORIEL_TOKEN_ADDRESS as Address,
};
const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as Address;
const STAKING = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS as Address;

/** Which payment tokens are live (addresses configured). Until then the buttons say payments open soon. */
// $ORIEL payments wait for a week of price data (7-day TWAP): turned on with NEXT_PUBLIC_ORIEL_PAYMENTS=on
export const PAYMENTS = {
  USDG: !!TOKENS.USDG && !!TREASURY,
  ORIEL: !!TOKENS.ORIEL && !!TREASURY && process.env.NEXT_PUBLIC_ORIEL_PAYMENTS === "on",
  STAKING: !!TOKENS.ORIEL && !!STAKING,
};

type Eip1193 = { request: (a: { method: string; params?: any[] }) => Promise<any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
let provide: (() => Promise<Eip1193>) | null = null;

/** The Privy wallet (embedded or external) registers here; without it a browser extension wallet is used. */
export function registerWalletProvider(fn: (() => Promise<Eip1193>) | null) { provide = fn; }

/**
 * Chain reads go to our same-origin proxy first (wallet in-app browsers can stall on the public RPC),
 * then to the public RPC. Short timeouts so a stuck request becomes an error instead of an endless spinner.
 */
const reads = () => fallback([
  http(typeof location === "undefined" ? undefined : `${location.origin}/api/rpc`, { timeout: 10_000, retryCount: 1 }),
  http(undefined, { timeout: 10_000, retryCount: 1 }),
]);

async function wallet() {
  const eth = provide ? await provide() : (window as any).ethereum;
  if (!eth) throw new Error("No wallet found. Sign in again, or install a wallet that supports Robinhood Chain.");
  const w = createWalletClient({ chain, transport: custom(eth) });
  const [account] = await w.requestAddresses();
  try { await w.switchChain({ id: chain.id }); } catch { await w.addChain({ chain }); }
  return { w, account: getAddress(account), pub: createPublicClient({ chain, transport: reads() }) };
}

/** Public reads on Robinhood Chain (no wallet needed). */
export const chainClient = () => createPublicClient({ chain, transport: reads() });
export const EXPLORER = chain.blockExplorers.default.url;
export const CHAIN_ID = chain.id;

/** The connected wallet address (switches the wallet to Robinhood Chain). */
export async function connectedAddress() { return (await wallet()).account; }

/** Deploy a contract from the connected wallet and wait for it to be mined. */
export async function deployContract(abi: Abi, bytecode: Hex, args: readonly unknown[]) {
  const { w, account, pub } = await wallet();
  const hash = await w.deployContract({ account, chain, abi, bytecode, args });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("The deployment transaction failed.");
  return { address: getAddress(receipt.contractAddress), hash, from: account };
}

export async function connectAndSign(message: string) {
  const { w, account } = await wallet();
  return { address: account, signature: await w.signMessage({ account, message }) };
}

/** Send tokens to the treasury, wait for the receipt, return the hash for server verification. */
export async function payToTreasury(token: keyof typeof TOKENS, amount: string) {
  const { w, account, pub } = await wallet();
  const dec = await pub.readContract({ address: TOKENS[token], abi: ERC20, functionName: "decimals" });
  const hash = await w.writeContract({ account, address: TOKENS[token], abi: ERC20, functionName: "transfer", args: [TREASURY, parseUnits(amount, dec)] });
  await pub.waitForTransactionReceipt({ hash, confirmations: 3 });
  return hash;
}

export async function stake(amount: string) {
  const { w, account, pub } = await wallet();
  const dec = await pub.readContract({ address: TOKENS.ORIEL, abi: ERC20, functionName: "decimals" });
  const v = parseUnits(amount, dec);
  const allowance = await pub.readContract({ address: TOKENS.ORIEL, abi: ERC20, functionName: "allowance", args: [account, STAKING] });
  if (allowance < v) await pub.waitForTransactionReceipt({ hash: await w.writeContract({ account, address: TOKENS.ORIEL, abi: ERC20, functionName: "approve", args: [STAKING, v] }) });
  return pub.waitForTransactionReceipt({ hash: await w.writeContract({ account, address: STAKING, abi: STAKE, functionName: "stake", args: [v] }) });
}

export async function unstake(amount: string) {
  const { w, account, pub } = await wallet();
  const dec = await pub.readContract({ address: TOKENS.ORIEL, abi: ERC20, functionName: "decimals" });
  return pub.waitForTransactionReceipt({ hash: await w.writeContract({ account, address: STAKING, abi: STAKE, functionName: "unstake", args: [parseUnits(amount, dec)] }) });
}

/** Sign the nonce message, then verify on the server. Returns the Free credits granted (0 if already claimed). */
export async function verifyWallet(): Promise<{ wallet: string; freeCredits: number }> {
  const n = await fetch("/api/wallet/nonce", { method: "POST" });
  if (!n.ok) throw new Error((await n.json().catch(() => ({}))).error ?? "Could not request a nonce.");
  const { message } = await n.json();
  const sig = await connectAndSign(message);
  const v = await fetch("/api/wallet/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sig) });
  const j = await v.json();
  if (!v.ok) throw new Error(j.error);
  return j;
}

const DIST = parseAbi([
  "function claim(uint256 epoch, address account, uint256 amount, bytes32[] proof)",
  "function claimed(uint256 epoch, address account) view returns (bool)",
]);

/** Revenue share claim status in the contract (read through the public RPC). */
export async function isClaimed(distributor: Address, epoch: number, account: Address) {
  const pub = createPublicClient({ chain, transport: reads() });
  return pub.readContract({ address: distributor, abi: DIST, functionName: "claimed", args: [BigInt(epoch), account] });
}

/** Claim one epoch's USDG revenue share. Anyone may send it; funds always go to `account`. */
export async function claimRevshare(distributor: Address, epoch: number, account: Address, amountRaw: string, proof: `0x${string}`[]) {
  const { w, account: from, pub } = await wallet();
  const hash = await w.writeContract({ account: from, address: distributor, abi: DIST, functionName: "claim", args: [BigInt(epoch), account, BigInt(amountRaw), proof] });
  return pub.waitForTransactionReceipt({ hash });
}
