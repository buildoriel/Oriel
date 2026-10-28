"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAddress, type Address } from "viem";
import { refreshShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/ui";
import { ThemeToggle } from "@/components/Theme";
import { claimRevshare, isClaimed, verifyWallet } from "@/lib/wallet-client";
import s from "./account.module.css";

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
  const [msg, setMsg] = useState(""); const [copied, setCopied] = useState<"" | "ref" | "wallet">("");
  const [handle, setHandle] = useState<string | null>(null); const [handleErr, setHandleErr] = useState(""); const [saving, setSaving] = useState(false);

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
      load(); refreshShell();
    } catch (e: any) { setMsg(e.shortMessage ?? e.message); }
  }
  async function saveHandle() {
    const h = (handle ?? "").trim().toLowerCase();
    if (!h) return setHandleErr("Enter a handle.");
    setSaving(true); setHandleErr("");
    const r = await fetch("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: h }) });
    setSaving(false);
    if (!r.ok) return setHandleErr((await r.json().catch(() => ({}))).error ?? "Could not save the handle.");
    setHandle(null); setMsg("Handle saved."); load(); refreshShell();
  }
  async function setPref(key: "email_build_done" | "email_low_credits", value: boolean) {
    setMe((m: any) => ({ ...m, profile: { ...m.profile, [key]: value } }));
    const r = await fetch("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ [key]: value }) });
    if (!r.ok) { setMe((m: any) => ({ ...m, profile: { ...m.profile, [key]: !value } })); setMsg("Could not save your email preference. Try again."); }
  }
  async function readAll() { await fetch("/api/notifications", { method: "POST" }); load(); refreshShell(); }
  async function claim(a: any) {
    setMsg(`Claim revenue share for ${a.period.slice(0, 7)}: confirm in your wallet`);
    try { await claimRevshare(rev.distributor as Address, a.epoch, getAddress(a.wallet), a.amount_raw, a.proof); setMsg("Revenue share claimed."); load(); }
    catch (e: any) { setMsg(e.shortMessage ?? e.message); }
  }
  async function copy(text: string, what: "ref" | "wallet") { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1500); }

  if (!me) return (
    <div className="page">
      <div className="page-head"><div><h1 className="h1">Account</h1><p className="mute">Loading…</p></div></div>
      <div className="grid-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 180 }} />)}</div>
    </div>
  );
  const p = me.profile ?? {};
  const unread = notes.filter((n) => !n.read).length;
  const ledger: any[] = me.ledger ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h1">Account</h1>
          <p className="mute">{[me.email, p.handle ? `@${p.handle}` : "no handle yet"].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-sm" onClick={() => { setHandleErr(""); setHandle(p.handle ?? ""); }}><Icon name="pencil" />Edit handle</button>
          <a className="btn btn-sm btn-ghost" href="/logout"><Icon name="logout" />Sign out</a>
        </div>
      </div>
      {msg && <div className="callout" role="status" style={{ marginBottom: 16 }}><Icon name="info" /><span className="callout-body">{msg}</span></div>}

      <div className="grid-2">
        <section className="card card-lg">
          <div className="card-head"><h2 className="h3">Credit balance</h2><span className="badge">{cap(me.tier)}</span></div>
          <div className={`${s.balance} num`}>{me.balance.total.toLocaleString("en-US")}</div>
          <div className={s.rows}>
            <div><span>Monthly credits (expire on the 1st)</span><span className="mono">{me.balance.monthly.toLocaleString("en-US")}</span></div>
            <div><span>Top-up (never expire)</span><span className="mono">{me.balance.topup.toLocaleString("en-US")}</span></div>
            <div><span>Active tier</span><span>{cap(me.tier)}</span></div>
            {p.purchased_tier_until && new Date(p.purchased_tier_until) > new Date() && <div><span>Purchased tier valid until</span><span>{date(p.purchased_tier_until)}</span></div>}
            <div><span>Tier from stake</span><span>{cap(p.staked_tier)}</span></div>
            {p.grace_until && <div><span>Grace period until</span><span>{date(p.grace_until)}</span></div>}
          </div>
          <Link className="btn btn-sm" href="/tiers" style={{ marginTop: 16 }}>Top up or upgrade<Icon name="arrowRight" /></Link>
        </section>

        <section className="card card-lg">
          <div className="card-head"><h2 className="h3">Wallet</h2>{p.wallet_verified_at && <span className="badge badge-ok"><span className="dot dot-ok" />Verified</span>}</div>
          {p.wallet_verified_at ? (
            <div className="stack">
              <div className={s.address}>
                <span>{p.wallet_address}</span>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => copy(p.wallet_address, "wallet")} aria-label="Copy wallet address">
                  <Icon name={copied === "wallet" ? "check" : "copy"} /></button>
              </div>
              <p className="small mute">Verified {date(p.wallet_verified_at)}. Used for payments, staking, and revenue share.</p>
            </div>
          ) : (
            <div className="stack">
              <p className="small mute">Connect a Robinhood Chain wallet to unlock 60 free credits per month. One wallet per account. You only sign a message: no transaction and no gas fee.</p>
              <div><button type="button" className="btn btn-primary" onClick={connect}><Icon name="wallet" />Connect wallet</button></div>
            </div>
          )}
        </section>

        <section className="card card-lg">
          <div className="card-head"><h2 className="h3">Invite friends</h2></div>
          <p className="small mute" style={{ marginBottom: 14 }}>You earn credits when someone you invite makes their first purchase.</p>
          {ref?.link && (
            <div className="input-group" style={{ marginBottom: 6 }}>
              <input className="input mono" readOnly value={ref.link} aria-label="Referral link" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginRight: 4 }} onClick={() => copy(ref.link, "ref")}>
                <Icon name={copied === "ref" ? "check" : "copy"} />{copied === "ref" ? "Copied" : "Copy"}</button>
            </div>
          )}
          <div className={s.rows}>
            <div><span>Invited</span><span className="mono">{ref?.invited ?? 0}</span></div>
            <div><span>Credits from referrals</span><span className="mono">{(ref?.rewardedCredits ?? 0).toLocaleString("en-US")}</span></div>
          </div>
        </section>

        <section className="card card-lg">
          <div className="card-head">
            <h2 className="h3 row" style={{ gap: 8 }}>Notifications{unread > 0 && <span className="dot" aria-label={`${unread} unread`} />}</h2>
            {unread > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={readAll}>Mark all read</button>}
          </div>
          {notes.length === 0 ? <p className="small mute">No notifications yet.</p> : (
            <div className="divide">{notes.map((n) => (
              <div key={n.id} className={`list-row ${s.note}${n.read ? ` ${s.read}` : ""}`}>
                {n.read ? <span /> : <span className="dot" aria-label="Unread" />}
                <div className="small"><div className="xs faint" style={{ marginBottom: 2 }}>{date(n.created_at)}</div>{n.body}</div>
              </div>))}</div>
          )}
        </section>

        <section className={`card card-lg ${s.wide}`}>
          <div className="row-between wrap" style={{ gap: 16 }}>
            <span><h2 className="h3">Appearance</h2><span className="small mute">Follow your device, or always use light or dark.</span></span>
            <ThemeToggle />
          </div>
        </section>

        <section className={`card card-lg ${s.wide}`}>
          <div className="card-head"><h2 className="h3">Email notifications</h2></div>
          <div className={s.prefs}>
            {([
              ["email_build_done", "Build finished", "When a build that took more than a minute is done, or stops with an error."],
              ["email_low_credits", "Low credits", "When your balance drops below 15% of your plan's monthly credits. At most once a week."],
            ] as const).map(([key, label, hint]) => (
              <label key={key} className={s.pref}>
                <span><span className={s.prefLabel}>{label}</span><span className="small mute">{hint}</span></span>
                <input type="checkbox" role="switch" className={s.switch} checked={p[key] !== false} onChange={(e) => setPref(key, e.target.checked)} />
              </label>
            ))}
          </div>
        </section>

        <section className={`card card-lg ${s.wide}`}>
          <div className="card-head" style={{ alignItems: "flex-start" }}>
            <div>
              <h2 className="h3">Revenue share</h2>
              <p className="small mute" style={{ marginTop: 6 }}>50% of the remaining monthly margin goes to stakers in USDG. Claim any time within 1 year.</p>
            </div>
          </div>
          {rev.allocations.length === 0 ? (
            <div className="empty"><Icon name="chart" /><span>No revenue share yet. Stake $ORIEL to start receiving it.</span></div>
          ) : (
            <div className={s.scroll}><table className="table">
              <thead><tr><th>Month</th><th className="r">Amount</th><th className="r">Status</th></tr></thead>
              <tbody>{rev.allocations.map((a) => (
                <tr key={a.period}>
                  <td>{new Date(a.period).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</td>
                  <td className="r mono">{(Number(a.amount_raw) / 10 ** USDG_DEC).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDG</td>
                  <td className="r">{claimed[a.epoch] ? <span className="badge badge-ok">Claimed</span>
                    : <button type="button" className="btn btn-primary btn-sm" disabled={!rev.distributor} onClick={() => claim(a)}>Claim</button>}</td>
                </tr>))}</tbody>
            </table></div>
          )}
        </section>

        <section className={`card card-lg ${s.wide}`}>
          <div className="card-head"><h2 className="h3">Credit history</h2></div>
          {ledger.length === 0 ? (
            <div className="empty"><Icon name="clock" /><span>No transactions yet.</span></div>
          ) : (
            <div className={s.scroll}><table className="table">
              <thead><tr><th>Activity</th><th className="hide-mobile">Date</th><th className="hide-mobile">Bucket</th><th className="r">Credits</th></tr></thead>
              <tbody>{ledger.map((l) => (
                <tr key={l.id}>
                  <td>{REASON[l.reason] ?? l.reason}<div className="xs mute"><span className="only-mobile">{date(l.created_at)} · {l.bucket === "monthly" ? "monthly" : "top-up"}</span></div></td>
                  <td className="small mute hide-mobile">{date(l.created_at)}</td>
                  <td className="small mute hide-mobile">{l.bucket === "monthly" ? "Monthly" : "Top-up"}</td>
                  <td className="r mono" style={{ color: l.delta < 0 ? "var(--ink)" : "var(--ok)" }}>{l.delta > 0 ? "+" : ""}{Number(l.delta).toLocaleString("en-US")}</td>
                </tr>))}</tbody>
            </table></div>
          )}
        </section>
      </div>

      <Modal open={handle !== null} onClose={() => setHandle(null)} title="Public handle"
        footer={<>
          <button type="button" className="btn" onClick={() => setHandle(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={saveHandle}>{saving && <span className="spinner" aria-hidden />}Save</button>
        </>}>
        <p>Shown on templates you publish in the marketplace.</p>
        <label className="field">
          <span className="label">Handle</span>
          <span className="input-group"><span className="addon">@</span>
            <input className="input" autoFocus value={handle ?? ""} maxLength={24} onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveHandle(); } }} /></span>
          <span className="hint">3 to 24 characters: lowercase letters, numbers, and underscores.</span>
        </label>
        {handleErr && <p className="err" role="alert">{handleErr}</p>}
      </Modal>
    </div>
  );
}
