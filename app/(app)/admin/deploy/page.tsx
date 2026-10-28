"use client";
import { useEffect, useState } from "react";
import { formatEther, getAddress, isAddress, parseAbi, type Abi, type Address, type Hex } from "viem";
import artifacts from "@/lib/contracts/artifacts.json";
import { CHAIN_ID, EXPLORER, chainClient, connectedAddress, deployContract } from "@/lib/wallet-client";
import { Icon } from "@/components/Icon";

type Kind = "OrielStaking" | "RevenueDistributor";
type TokenInfo = { symbol: string; decimals: number } | { error: string } | null;
type Deployed = { address: Address; hash: Hex; checked?: string };

const ERC20 = parseAbi(["function symbol() view returns (string)", "function decimals() view returns (uint8)"]);
const SAVED = "oriel-deploy";
const env = {
  oriel: process.env.NEXT_PUBLIC_ORIEL_TOKEN_ADDRESS ?? "",
  usdg: process.env.NEXT_PUBLIC_USDG_TOKEN_ADDRESS ?? "",
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "",
  staking: process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS ?? "",
};
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const link = (kind: "address" | "tx", v: string) => `${EXPLORER}/${kind}/${v}`;

async function tokenInfo(a: string): Promise<TokenInfo> {
  if (!isAddress(a)) return null;
  const c = chainClient();
  try {
    if (!(await c.getCode({ address: a }))) return { error: "No contract at this address on Robinhood Chain." };
    const [symbol, decimals] = await Promise.all([
      c.readContract({ address: a, abi: ERC20, functionName: "symbol" }),
      c.readContract({ address: a, abi: ERC20, functionName: "decimals" }),
    ]);
    return { symbol, decimals };
  } catch (e: any) {
    if (/timed? ?out|fetch|network|HTTP request failed/i.test(String(e?.shortMessage ?? e?.message))) return { error: "Couldn't reach Robinhood Chain. Check your connection and edit the address to retry." };
    return { error: "This contract doesn't look like an ERC-20 token." };
  }
}

/**
 * One-time deployment of Oriel's contracts from the operator's own wallet. Nothing secret passes through the
 * server: the compiled bytecode ships with the page, the wallet signs, and the resulting addresses are shown to copy.
 */
export default function DeployContracts() {
  const [wallet, setWallet] = useState<{ address: Address; eth: string } | null>(null);
  const [form, setForm] = useState({ oriel: env.oriel, usdg: env.usdg, treasury: env.treasury, pool: "" });
  const [info, setInfo] = useState<{ oriel: TokenInfo; usdg: TokenInfo; treasury: "contract" | "wallet" | null }>({ oriel: null, usdg: null, treasury: null });
  const [done, setDone] = useState<Partial<Record<Kind, Deployed>>>({});
  const [busy, setBusy] = useState<Kind | "connect" | null>(null);
  const [err, setErr] = useState("");
  const [stage, setStage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(SAVED) ?? "{}"); if (s.done) setDone(s.done); if (s.form) setForm((f) => ({ ...f, ...s.form })); } catch { /* fresh start */ } }, []);
  useEffect(() => { try { localStorage.setItem(SAVED, JSON.stringify({ done, form })); } catch { /* private mode */ } }, [done, form]);
  // prefill $ORIEL with the address detected from the dev wallet's launch
  useEffect(() => {
    fetch("/api/token").then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (j?.address) setForm((f) => (f.oriel ? f : { ...f, oriel: j.address }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const [oriel, usdg] = await Promise.all([tokenInfo(form.oriel), tokenInfo(form.usdg)]);
      let treasury: "contract" | "wallet" | null = null;
      if (isAddress(form.treasury)) treasury = (await chainClient().getCode({ address: form.treasury }).catch(() => undefined)) ? "contract" : "wallet";
      setInfo({ oriel, usdg, treasury });
    }, 400);
    return () => clearTimeout(t);
  }, [form.oriel, form.usdg, form.treasury]);

  async function connect() {
    setBusy("connect"); setErr(""); setStage("Approve the connection and the switch to Robinhood Chain in your wallet…");
    try {
      const address = await connectedAddress();
      setStage("Reading the ETH balance…");
      // a failed balance read shouldn't block deployment: the wallet itself shows the gas cost
      const eth = await chainClient().getBalance({ address }).then(formatEther).catch(() => "");
      setWallet({ address, eth });
    } catch (e: any) { setErr(e.shortMessage ?? e.message); }
    setBusy(null); setStage("");
  }

  async function deploy(kind: Kind) {
    setBusy(kind); setErr("");
    try {
      const art = (artifacts as unknown as Record<Kind, { abi: Abi; bytecode: Hex }>)[kind];
      const args = kind === "OrielStaking" ? [getAddress(form.oriel)] : [getAddress(form.usdg), getAddress(form.treasury)];
      const d = await deployContract(art.abi, art.bytecode, args);
      // read the constructor values back from the chain before handing out the address
      const c = chainClient();
      const checked = kind === "OrielStaking"
        ? `token() = ${await c.readContract({ address: d.address, abi: art.abi, functionName: "token" })}`
        : `usdg() = ${await c.readContract({ address: d.address, abi: art.abi, functionName: "usdg" })}, owner() = ${await c.readContract({ address: d.address, abi: art.abi, functionName: "owner" })}`;
      setDone((x) => ({ ...x, [kind]: { address: d.address, hash: d.hash, checked } }));
      if (wallet) setWallet({ ...wallet, eth: formatEther(await c.getBalance({ address: wallet.address })) });
    } catch (e: any) { setErr(e.shortMessage ?? e.message); }
    setBusy(null);
  }

  const okToken = (t: TokenInfo) => !!t && !("error" in t);
  const canStaking = !!wallet && isAddress(form.oriel) && okToken(info.oriel);
  const canDist = !!wallet && isAddress(form.usdg) && okToken(info.usdg) && isAddress(form.treasury);
  const lines = [
    ["ORIEL_TOKEN_ADDRESS", form.oriel], ["NEXT_PUBLIC_ORIEL_TOKEN_ADDRESS", form.oriel],
    ["ORIEL_POOL_ADDRESS", form.pool],
    ["USDG_TOKEN_ADDRESS", form.usdg], ["NEXT_PUBLIC_USDG_TOKEN_ADDRESS", form.usdg],
    ["TREASURY_ADDRESS", form.treasury], ["NEXT_PUBLIC_TREASURY_ADDRESS", form.treasury],
    ["STAKING_CONTRACT_ADDRESS", done.OrielStaking?.address ?? ""], ["NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS", done.OrielStaking?.address ?? ""],
    ["REVSHARE_DISTRIBUTOR_ADDRESS", done.RevenueDistributor?.address ?? ""],
  ].map(([k, v]) => `${k}=${v}`).join("\n");

  const field = (key: keyof typeof form, label: string, hint: React.ReactNode, status?: React.ReactNode) => (
    <label className="field">
      <span className="label">{label}</span>
      <input className="input mono" value={form[key]} spellCheck={false} autoCapitalize="off" placeholder="0x…"
        onChange={(e) => setForm({ ...form, [key]: e.target.value.trim() })} />
      <span className="hint">{status ?? hint}</span>
    </label>
  );
  const tokenStatus = (t: TokenInfo, v: string) => !v ? null : !isAddress(v) ? <span style={{ color: "var(--bad)" }}>Not a valid address.</span>
    : !t ? "Checking…" : "error" in t ? <span style={{ color: "var(--bad)" }}>{t.error}</span>
    : <span style={{ color: "var(--ok)" }}>Found {t.symbol} ({t.decimals} decimals).</span>;

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1 className="h1">Deploy contracts</h1>
          <p className="mute">Deploy Oriel&apos;s staking vault and revenue-share distributor on Robinhood Chain (chain {CHAIN_ID}) from your own wallet. You pay a small gas fee in ETH. Do this once.</p>
        </div>
      </div>

      <div className="callout" style={{ marginBottom: 20 }}>
        <Icon name="shield" />
        <div className="callout-body small">
          Contracts: <b>OrielStaking</b> (no owner, can&apos;t be paused or upgraded; only each wallet can withdraw its own stake) and <b>RevenueDistributor</b> (owned by the treasury; stakers claim USDG with Merkle proofs).
          Compiled with {artifacts.meta.compiler.split("+")[0]}, OpenZeppelin {artifacts.meta.openzeppelin}. Not audited yet.
        </div>
      </div>

      <section className="card card-lg stack" style={{ gap: 14, marginBottom: 16 }}>
        <div className="card-head"><h2 className="h3">1. Connect the deployer wallet</h2>{wallet && <span className="badge badge-ok"><span className="dot dot-ok" />Connected</span>}</div>
        {wallet ? (
          <p className="small">
            <a className="link mono" href={link("address", wallet.address)} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all" }}>{wallet.address}</a>
            <span className="mute"> · {wallet.eth ? `${Number(wallet.eth).toFixed(5)} ETH on Robinhood Chain` : "balance unavailable"}</span>
            {wallet.eth && Number(wallet.eth) === 0 && <span style={{ color: "var(--bad)" }}> · add a little ETH for gas first</span>}
          </p>
        ) : (
          <button className="btn btn-primary" onClick={connect} disabled={busy === "connect"} style={{ justifySelf: "start" }}>
            {busy === "connect" ? <span className="spinner" /> : <Icon name="wallet" />}Connect wallet
          </button>
        )}
        {stage && <p className="small mute">{stage}</p>}
      </section>

      <section className="card card-lg stack" style={{ gap: 14, marginBottom: 16 }}>
        <div className="card-head"><h2 className="h3">2. Addresses</h2></div>
        {field("oriel", "$ORIEL token", "The token contract created when you launched on Pons.", tokenStatus(info.oriel, form.oriel))}
        {field("usdg", "USDG token", "The official USDG token contract on Robinhood Chain.", tokenStatus(info.usdg, form.usdg))}
        {field("treasury", "Treasury (owner of the distributor)", "A Safe multisig is strongly recommended.",
          !form.treasury ? null : !isAddress(form.treasury) ? <span style={{ color: "var(--bad)" }}>Not a valid address.</span>
            : info.treasury === "contract" ? <span style={{ color: "var(--ok)" }}>Contract wallet (e.g. Safe multisig).</span>
            : info.treasury === "wallet" ? <span style={{ color: "var(--warn)" }}>A regular wallet. Works, but a Safe multisig is safer for treasury funds.</span> : "Checking…")}
        {field("pool", "$ORIEL pool on Pons (optional)", "Used for the price feed; not needed to deploy.")}
      </section>

      {(["OrielStaking", "RevenueDistributor"] as Kind[]).map((k, i) => {
        const d = done[k];
        const can = k === "OrielStaking" ? canStaking : canDist;
        const existing = k === "OrielStaking" && env.staking;
        return (
          <section key={k} className="card card-lg stack" style={{ gap: 12, marginBottom: 16 }}>
            <div className="card-head">
              <h2 className="h3">{i + 3}. Deploy {k}</h2>
              {d && <span className="badge badge-ok"><span className="dot dot-ok" />Deployed</span>}
            </div>
            <p className="small mute">{k === "OrielStaking" ? "Needs the $ORIEL token address." : "Needs the USDG token and treasury addresses."}</p>
            {existing && !d && <p className="small" style={{ color: "var(--warn)" }}>Oriel is already configured with a staking contract at {short(env.staking)}. Deploying again creates a second one.</p>}
            {d ? (
              <div className="small stack" style={{ gap: 4 }}>
                <span>Address: <a className="link mono" href={link("address", d.address)} target="_blank" rel="noreferrer">{d.address}</a></span>
                <span className="mute">Transaction: <a className="link mono" href={link("tx", d.hash)} target="_blank" rel="noreferrer">{short(d.hash)}</a></span>
                {d.checked && <span className="mute mono xs">Checked on-chain: {d.checked}</span>}
              </div>
            ) : (
              <button className="btn btn-primary" disabled={!can || !!busy} onClick={() => deploy(k)} style={{ justifySelf: "start" }}>
                {busy === k ? <span className="spinner" /> : <Icon name="rocket" />}{busy === k ? "Confirm in your wallet…" : `Deploy ${k}`}
              </button>
            )}
          </section>
        );
      })}

      {err && <div className="callout callout-bad" role="alert" style={{ marginBottom: 16 }}><Icon name="alert" /><span className="callout-body">{err}</span></div>}

      <section className="card card-lg stack" style={{ gap: 12 }}>
        <div className="card-head">
          <h2 className="h3">5. Send these to the Oriel team</h2>
          <button className="btn btn-sm" onClick={async () => { await navigator.clipboard.writeText(lines).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            <Icon name={copied ? "check" : "copy"} />{copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="small mute">These are public addresses, safe to share. Once they are set in Vercel, payments and staking turn on.</p>
        <pre className="mono xs" style={{ margin: 0, padding: 14, background: "var(--surface-2)", borderRadius: "var(--r)", overflowX: "auto", whiteSpace: "pre" }}>{lines}</pre>
      </section>
    </div>
  );
}
