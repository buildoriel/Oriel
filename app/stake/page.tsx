"use client";
import { useEffect, useState } from "react";
import { stake, unstake } from "@/lib/wallet-client";

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
    try { setMsg("Confirm in your wallet"); kind === "stake" ? await stake(String(delta)) : await unstake(String(delta)); setMsg("Done. Tiers are evaluated on the 1st of each month."); load(); }
    catch (e: any) { setMsg(e.shortMessage ?? e.message); }
  }
  return (
    <section className="page">
      <h2>Stake $ORIEL</h2>
      <p className="mute" style={{ marginTop: 12, maxWidth: "56ch" }}>Your tier is set by the dollar value of your stake, using the 7-day average price of the $ORIEL pool on Pons. Evaluated on the 1st of each month.</p>
      {info && !info.configured && <div className="banner" style={{ marginTop: 24 }}><span>Staking goes live once $ORIEL launches on Pons. The calculator below uses an example price.</span></div>}
      {info?.configured && !info.walletVerified && <div className="banner" style={{ marginTop: 24 }}><span>Connect the wallet you stake with so your tier can be read.</span><a className="pill sm ink" href="/account">Connect wallet</a></div>}
      <div className="stake">
        <div className="card">
          <label className="f">$ORIEL amount to stake<div className="inp"><input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></div></label>
          <div className="kv"><span className="mute">7-day TWAP price</span><span>{info && !info.configured
            ? <input aria-label="Example price per token (USD)" value={demo} onChange={(e) => setDemo(e.target.value)} style={{ width: 90, font: "inherit", border: "1px solid var(--line)", borderRadius: 8, padding: "2px 6px", textAlign: "right" }} />
            : twap ? `$${twap.toPrecision(3)}` : "not enough data yet"}</span><span className="mute">Current price</span><span>{info?.spot ? `$${info.spot.toPrecision(3)}` : "–"}</span></div>
          <p className="mute" style={{ marginTop: 28, fontSize: 14 }}>Stake value</p>
          <div className="big">{usd(v)}</div>
          <div className="ladder">{T.map((t) => (
            <div key={t[0]} className={`rung${t[0] === cur[0] ? " on" : ""}`}><span>{t[0]}</span><span className="t"><i style={{ width: `${Math.min(100, (v / t[1]) * 100)}%` }} /></span><span className="mono">${t[1].toLocaleString("en-US")}</span></div>))}</div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 24 }}>
            <button className="pill ink" style={{ justifyContent: "center" }} disabled={!info?.configured} onClick={() => act("stake")}>Stake</button>
            <button className="pill" style={{ justifyContent: "center" }} disabled={!info?.configured} onClick={() => act("unstake")}>Unstake</button>
          </div>
          {msg && <p className="mono mute" style={{ marginTop: 12 }}>{msg}</p>}
        </div>
        <div className="card">
          <h3>Your position</h3>
          <div className="kv">
            <span className="mute">Current stake tier</span><span>{info?.currentTier ?? "–"}</span>
            <span className="mute">Tier at the amount above</span><span>{cur[0]}</span>
            <span className="mute">Credits per month</span><span>{(cur[2] as number).toLocaleString("en-US")}</span>
            <span className="mute">Safe threshold (10% buffer)</span><span>{cur[1] ? `$${((cur[1] as number) * 0.9).toLocaleString("en-US")}` : "–"}</span>
            {info?.graceUntil && <><span className="mute">Grace period until</span><span>{info.graceUntil.slice(0, 10)}</span></>}
          </div>
          <div className="note">If your stake value drops below the safe threshold, you keep this tier for a 1-month grace period and get notified before any downgrade.</div>
          <div className="note">Unstake any time. Credits already granted this month stay usable. Staker credits are funded by real margin, at most 40% of last month's margin, and are scaled down proportionally if there are many stakers.</div>
        </div>
      </div>
    </section>
  );
}
