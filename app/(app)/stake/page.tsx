"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { TokenCA } from "@/components/TokenCA";
import { stake, unstake } from "@/lib/wallet-client";
import s from "./stake.module.css";

const T: [string, number, number][] = [["Builder", 200, 1000], ["Pro", 500, 2500], ["Studio", 2000, 10000]];
const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Stake() {
  const [info, setInfo] = useState<any>(null); const [amt, setAmt] = useState(""); const [msg, setMsg] = useState("");
  const load = () => fetch("/api/stake").then((r) => r.json()).then((j) => { setInfo(j); if (!amt) setAmt(String(j.staked ?? 0)); });
  useEffect(() => { load(); }, []);
  const [demo, setDemo] = useState("0.01");
  const twap = info?.twap ?? (info && !info.configured ? parseFloat(demo) || 0 : 0);
  const v = (parseFloat(amt.replace(",", ".")) || 0) * twap;
  const cur = [...T].reverse().find((t) => v >= t[1]) ?? ["Free", 0, 60];
  async function act(kind: "stake" | "unstake") {
    // input = desired stake amount; the difference from the current stake sets the direction
    const diff = (parseFloat(amt.replace(",", ".")) || 0) - (info?.staked ?? 0);
    if (kind === "stake" && diff <= 0) return setMsg("Enter an amount above your current stake to add more.");
    if (kind === "unstake" && diff >= 0) return setMsg("Enter an amount below your current stake to withdraw.");
    const delta = Math.abs(diff);
    try {
      setMsg("Confirm in your wallet");
      const r = kind === "stake" ? await stake(String(delta)) : await unstake(String(delta));
      setMsg(`${kind === "stake" ? "Staked" : "Unstaked"} (transaction ${r.transactionHash.slice(0, 10)}…). Tiers are evaluated on the 1st of each month.`);
      load();
    }
    catch (e: any) { setMsg(e.shortMessage ?? e.message); }
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h1">Stake $ORIEL</h1>
          <p className="lead">Your tier is set by the dollar value of your stake, using the 7-day average price of the $ORIEL pool on Pons. Evaluated on the 1st of each month.</p>
          <div style={{ marginTop: 14 }}><TokenCA /></div>
        </div>
      </div>

      {info && !info.configured && (
        <div className="callout callout-accent" style={{ marginBottom: 16 }}><Icon name="info" />
          <span className="callout-body">Staking goes live once $ORIEL launches on Pons. The calculator below uses an example price.</span></div>
      )}
      {info?.configured && !info.walletVerified && (
        <div className="callout" style={{ marginBottom: 16, alignItems: "center" }}><Icon name="wallet" />
          <span className="callout-body grow">Connect the wallet you stake with so your tier can be read.</span>
          <Link className="btn btn-primary btn-sm" href="/account">Connect wallet</Link></div>
      )}

      <div className={s.layout}>
        <section className="card card-lg">
          <label className="field">
            <span className="label">Amount to stake</span>
            <span className="input-group">
              <input className="input" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0" />
              <span className="addon">$ORIEL</span>
            </span>
          </label>
          <div className={s.rows} style={{ marginTop: 14 }}>
            <div><span>7-day TWAP price</span><span className="mono">{info && !info.configured
              ? <input className={`input mono ${s.demo}`} aria-label="Example price per token (USD)" inputMode="decimal" value={demo} onChange={(e) => setDemo(e.target.value)} />
              : twap ? `$${twap.toPrecision(3)}` : <span className="mute">not enough data yet</span>}</span></div>
            <div><span>Current price</span><span className="mono">{info?.spot ? `$${info.spot.toPrecision(3)}` : "–"}</span></div>
          </div>

          <p className="eyebrow" style={{ marginTop: 26 }}>Stake value</p>
          <div className={`${s.value} num`}>{usd(v)}</div>

          <div className={s.ladder}>{T.map((t) => (
            <div key={t[0]} className={`${s.rung}${t[0] === cur[0] ? ` ${s.on}` : ""}`}>
              <span>{t[0]}</span>
              <div className="meter"><i className={v >= t[1] ? "accent" : ""} style={{ width: `${Math.min(100, (v / t[1]) * 100)}%` }} /></div>
              <span className="mono xs">${t[1].toLocaleString("en-US")}</span>
            </div>))}</div>

          <div className={s.actions}>
            <button type="button" className="btn btn-primary" disabled={!info?.configured} onClick={() => act("stake")}>Stake</button>
            <button type="button" className="btn" disabled={!info?.configured} onClick={() => act("unstake")}>Unstake</button>
          </div>
          {msg && <p className="xs mute" role="status" style={{ marginTop: 12 }}>{msg}</p>}
        </section>

        <div className="stack">
          <section className="card card-lg">
            <h2 className="h3" style={{ marginBottom: 6 }}>Your position</h2>
            <div className={s.rows}>
              <div><span>Current stake tier</span><span>{info?.currentTier ?? "–"}</span></div>
              <div><span>Tier at the amount above</span><span>{cur[0]}</span></div>
              <div><span>Credits per month</span><span className="mono">{(cur[2] as number).toLocaleString("en-US")}</span></div>
              <div><span>Safe threshold (10% buffer)</span><span className="mono">{cur[1] ? `$${((cur[1] as number) * 0.9).toLocaleString("en-US")}` : "–"}</span></div>
              {info?.graceUntil && <div><span>Grace period until</span><span className="mono">{info.graceUntil.slice(0, 10)}</span></div>}
            </div>
          </section>
          <div className="callout"><Icon name="shield" />
            <span className="callout-body small">If your stake value drops below the safe threshold, you keep this tier for a 1-month grace period and get notified before any downgrade.</span></div>
          <div className="callout"><Icon name="clock" />
            <span className="callout-body small">Unstake any time. Credits already granted this month stay usable. Staker credits are funded by real margin, at most 40% of last month&apos;s margin, and are scaled down proportionally if there are many stakers.</span></div>
        </div>
      </div>
    </div>
  );
}
