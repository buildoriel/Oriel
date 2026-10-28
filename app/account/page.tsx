"use client";
import { useEffect, useState } from "react";
import { getAddress, type Address } from "viem";
import { claimRevshare, isClaimed, verifyWallet } from "@/lib/wallet-client";

const REASON: Record<string, string> = {
  monthly_refill: "Monthly refill", topup: "Purchase", free_grant: "Free credits", ai_usage: "AI usage",
  template_use: "Template use", referral_reward: "Referral reward", refund: "Refund", admin_adjust: "Adjustment",
};
const USDG_DEC = Number(process.env.NEXT_PUBLIC_USDG_DECIMALS ?? 6);
const cap = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : "–");
const date = (s: string) => new Date(s).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

export default function Account() {
  const [me, setMe] = useState<any>(null);
  const [ref, setRef] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [rev, setRev] = useState<{ distributor: string | null; allocations: any[] }>({ distributor: null, allocations: [] });
  const [claimed, setClaimed] = useState<Record<number, boolean>>({});
  const [msg, setMsg] = useState(""); const [copied, setCopied] = useState(false);

  const load = async () => {
    const [m, r, n, v] = await Promise.all(["/api/me", "/api/referral", "/api/notifications", "/api/revshare"].map((u) => fetch(u).then((x) => (x.ok ? x.json() : null))));
    setMe(m); setRef(r); setNotes(n?.notifications ?? []); if (v) setRev(v);
    if (v?.distributor && m?.profile?.wallet_address) {
      const st: Record<number, boolean> = {};
      for (const a of v.allocations) st[a.epoch] = await isClaimed(v.distributor, a.epoch, getAddress(a.wallet)).catch(() => false);
      setClaimed(st);
    }
  };
  useEffect(() => { load(); }, []);

  async function connect() {
    setMsg("Sign the message in your wallet");
    try {
      const r = await verifyWallet();
      setMsg(r.freeCredits ? `Wallet connected. +${r.freeCredits} free credits.` : "Wallet connected.");
      load();
    } catch (e: any) { setMsg(e.shortMessage ?? e.message); }
  }
  async function setHandle() {
    const h = prompt("Public handle (shown in the template marketplace):", me?.profile?.handle ?? "");
    if (!h) return;
    const r = await fetch("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: h.trim().toLowerCase() }) });
    setMsg(r.ok ? "Handle saved." : (await r.json()).error); load();
  }
  async function readAll() { await fetch("/api/notifications", { method: "POST" }); load(); }
  async function claim(a: any) {
    setMsg(`Claim revenue share for ${a.period.slice(0, 7)}: confirm in your wallet`);
    try { await claimRevshare(rev.distributor as Address, a.epoch, getAddress(a.wallet), a.amount_raw, a.proof); setMsg("Revenue share claimed."); load(); }
    catch (e: any) { setMsg(e.shortMessage ?? e.message); }
  }
  async function copy() { await navigator.clipboard.writeText(ref.link); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  if (!me) return <section className="page"><h2>Account</h2><p className="mute" style={{ marginTop: 16 }}>Loading…</p></section>;
  const p = me.profile ?? {};
  const unread = notes.filter((n) => !n.read).length;

  return (
    <section className="page">
      <h2>Account</h2>
      <p className="mute mono" style={{ marginTop: 12 }}>{me.email} · {p.handle ? `@${p.handle}` : "no handle yet"} <button className="linkish" onClick={setHandle}>edit</button></p>
      {msg && <p className="mono" role="status" style={{ marginTop: 12 }}>{msg}</p>}
      <div className="acct">
        <div className="card">
          <h3>Credit balance</h3>
          <div className="big" style={{ marginTop: 16 }}>{me.balance.total.toLocaleString("en-US")}</div>
          <div className="kv">
            <span className="mute">Monthly credits (expire on the 1st)</span><span>{me.balance.monthly.toLocaleString("en-US")}</span>
            <span className="mute">Top-up (never expire)</span><span>{me.balance.topup.toLocaleString("en-US")}</span>
            <span className="mute">Active tier</span><span>{cap(me.tier)}</span>
            {p.purchased_tier_until && new Date(p.purchased_tier_until) > new Date() && <><span className="mute">Purchased tier valid until</span><span>{date(p.purchased_tier_until)}</span></>}
            <span className="mute">Tier stake</span><span>{cap(p.staked_tier)}</span>
            {p.grace_until && <><span className="mute">Grace period until</span><span>{date(p.grace_until)}</span></>}
          </div>
          <a className="pill sm" href="/tiers" style={{ marginTop: 20 }}>Top up or upgrade your tier</a>
        </div>

        <div className="card">
          <h3>Wallet</h3>
          {p.wallet_verified_at ? (
            <>
              <p className="mono" style={{ marginTop: 14, wordBreak: "break-all" }}>{p.wallet_address}</p>
              <p className="mute" style={{ fontSize: 14, marginTop: 8 }}>Verified {date(p.wallet_verified_at)}. Used for payments, staking, and revenue share.</p>
            </>
          ) : (
            <>
              <p className="mute" style={{ fontSize: 14, margin: "10px 0 18px" }}>
                Connect a Robinhood Chain wallet to unlock 60 free credits per month. One wallet per account.
                You only sign a message: no transaction and no gas fee.
              </p>
              <button className="pill ink" onClick={connect}>Connect wallet</button>
            </>
          )}
        </div>

        <div className="card">
          <h3>Invite friends</h3>
          <p className="mute" style={{ fontSize: 14, marginTop: 8 }}>You earn credits when someone you invite makes their first purchase.</p>
          {ref?.link && <div className="copy"><code>{ref.link}</code><button className="pill sm" onClick={copy}>{copied ? "Copied" : "Copy"}</button></div>}
          <div className="kv">
            <span className="mute">Invited</span><span>{ref?.invited ?? 0}</span>
            <span className="mute">Credits from referrals</span><span>{(ref?.rewardedCredits ?? 0).toLocaleString("en-US")}</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h3>Notifications{unread > 0 && <span className="dot" aria-label={`${unread} unread`} />}</h3>
            {unread > 0 && <button className="pill sm" onClick={readAll}>Mark as read</button>}
          </div>
          {notes.length === 0 && <p className="mute" style={{ fontSize: 14, marginTop: 12 }}>No notifications yet.</p>}
          <div className="list" style={{ marginTop: 12 }}>{notes.map((n) => (
            <div key={n.id} className="note" style={{ marginTop: 0, color: n.read ? "var(--mute)" : "var(--ink)" }}>
              <span className="mono mute" style={{ fontSize: 11 }}>{date(n.created_at)}</span><br />{n.body}
            </div>))}</div>
        </div>

        <div className="card wide">
          <h3>Revenue share</h3>
          <p className="mute" style={{ fontSize: 14, marginTop: 8 }}>50% of the remaining monthly margin goes to stakers in USDG. Claim any time within 1 year.</p>
          {rev.allocations.length === 0 && <p className="mute" style={{ fontSize: 14, marginTop: 12 }}>No revenue share yet. Stake $ORIEL to start receiving it.</p>}
          <div className="list" style={{ marginTop: 12 }}>{rev.allocations.map((a) => (
            <div key={a.period} className="row-item">
              <span><b>{new Date(a.period).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</b><br />
                <span className="mono mute">{(Number(a.amount_raw) / 10 ** USDG_DEC).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDG</span></span>
              {claimed[a.epoch] ? <span className="mono mute">Claimed</span>
                : <button className="pill sm ink" disabled={!rev.distributor} onClick={() => claim(a)}>Claim</button>}
            </div>))}</div>
        </div>

        <div className="card wide">
          <h3>Credit history</h3>
          {(me.ledger ?? []).length === 0 && <p className="mute" style={{ fontSize: 14, marginTop: 12 }}>No transactions yet.</p>}
          <table className="ledger"><tbody>{(me.ledger ?? []).map((l: any) => (
            <tr key={l.id}><td>{REASON[l.reason] ?? l.reason}<br /><span className="mono mute" style={{ fontSize: 11 }}>{date(l.created_at)} · {l.bucket === "monthly" ? "monthly" : "top-up"}</span></td>
              <td style={{ color: l.delta < 0 ? "var(--ink)" : "#1B7F3B" }}>{l.delta > 0 ? "+" : ""}{Number(l.delta).toLocaleString("en-US")}</td></tr>))}</tbody></table>
        </div>
      </div>
    </section>
  );
}
