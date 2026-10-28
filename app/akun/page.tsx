"use client";
import { useEffect, useState } from "react";
import { getAddress, type Address } from "viem";
import { claimRevshare, isClaimed, verifyWallet } from "@/lib/wallet-client";

const REASON: Record<string, string> = {
  monthly_refill: "Isi ulang bulanan", topup: "Pembelian", free_grant: "Kredit Free", ai_usage: "Pemakaian AI",
  template_use: "Pakai template", referral_reward: "Hadiah referral", refund: "Pengembalian", admin_adjust: "Penyesuaian",
};
const USDG_DEC = Number(process.env.NEXT_PUBLIC_USDG_DECIMALS ?? 6);
const cap = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : "–");
const date = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default function Akun() {
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
    setMsg("Tanda tangani pesan di wallet");
    try {
      const r = await verifyWallet();
      setMsg(r.freeCredits ? `Wallet tersambung. +${r.freeCredits} kredit Free.` : "Wallet tersambung.");
      load();
    } catch (e: any) { setMsg(e.shortMessage ?? e.message); }
  }
  async function setHandle() {
    const h = prompt("Handle publik (tampil di marketplace template):", me?.profile?.handle ?? "");
    if (!h) return;
    const r = await fetch("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: h.trim().toLowerCase() }) });
    setMsg(r.ok ? "Handle disimpan." : (await r.json()).error); load();
  }
  async function readAll() { await fetch("/api/notifications", { method: "POST" }); load(); }
  async function claim(a: any) {
    setMsg(`Klaim bagi hasil ${a.period.slice(0, 7)}: konfirmasi di wallet`);
    try { await claimRevshare(rev.distributor as Address, a.epoch, getAddress(a.wallet), a.amount_raw, a.proof); setMsg("Bagi hasil diklaim."); load(); }
    catch (e: any) { setMsg(e.shortMessage ?? e.message); }
  }
  async function copy() { await navigator.clipboard.writeText(ref.link); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  if (!me) return <section className="page"><h2>Akun</h2><p className="mute" style={{ marginTop: 16 }}>Memuat…</p></section>;
  const p = me.profile ?? {};
  const unread = notes.filter((n) => !n.read).length;

  return (
    <section className="page">
      <h2>Akun</h2>
      <p className="mute mono" style={{ marginTop: 12 }}>{me.email} · {p.handle ? `@${p.handle}` : "belum ada handle"} <button className="linkish" onClick={setHandle}>ubah</button></p>
      {msg && <p className="mono" role="status" style={{ marginTop: 12 }}>{msg}</p>}
      <div className="acct">
        <div className="card">
          <h3>Saldo kredit</h3>
          <div className="big" style={{ marginTop: 16 }}>{me.balance.total.toLocaleString("id-ID")}</div>
          <div className="kv">
            <span className="mute">Kredit bulanan (hangus tanggal 1)</span><span>{me.balance.monthly.toLocaleString("id-ID")}</span>
            <span className="mute">Top-up (tidak hangus)</span><span>{me.balance.topup.toLocaleString("id-ID")}</span>
            <span className="mute">Tier aktif</span><span>{cap(me.tier)}</span>
            {p.purchased_tier_until && new Date(p.purchased_tier_until) > new Date() && <><span className="mute">Tier dibeli berlaku sampai</span><span>{date(p.purchased_tier_until)}</span></>}
            <span className="mute">Tier stake</span><span>{cap(p.staked_tier)}</span>
            {p.grace_until && <><span className="mute">Masa tenggang sampai</span><span>{date(p.grace_until)}</span></>}
          </div>
          <a className="pill sm" href="/tiers" style={{ marginTop: 20 }}>Top-up atau naikkan tier</a>
        </div>

        <div className="card">
          <h3>Wallet</h3>
          {p.wallet_verified_at ? (
            <>
              <p className="mono" style={{ marginTop: 14, wordBreak: "break-all" }}>{p.wallet_address}</p>
              <p className="mute" style={{ fontSize: 14, marginTop: 8 }}>Terverifikasi {date(p.wallet_verified_at)}. Dipakai untuk pembayaran, stake, dan bagi hasil.</p>
            </>
          ) : (
            <>
              <p className="mute" style={{ fontSize: 14, margin: "10px 0 18px" }}>
                Sambungkan wallet Robinhood Chain untuk mengaktifkan 60 kredit Free per bulan. Satu wallet hanya untuk satu akun.
                Cukup tanda tangan pesan, tanpa transaksi dan tanpa biaya gas.
              </p>
              <button className="pill ink" onClick={connect}>Sambungkan wallet</button>
            </>
          )}
        </div>

        <div className="card">
          <h3>Ajak teman</h3>
          <p className="mute" style={{ fontSize: 14, marginTop: 8 }}>Kamu dapat kredit saat orang yang kamu undang melakukan pembelian pertamanya.</p>
          {ref?.link && <div className="copy"><code>{ref.link}</code><button className="pill sm" onClick={copy}>{copied ? "Tersalin" : "Salin"}</button></div>}
          <div className="kv">
            <span className="mute">Diundang</span><span>{ref?.invited ?? 0}</span>
            <span className="mute">Kredit dari referral</span><span>{(ref?.rewardedCredits ?? 0).toLocaleString("id-ID")}</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h3>Notifikasi{unread > 0 && <span className="dot" aria-label={`${unread} belum dibaca`} />}</h3>
            {unread > 0 && <button className="pill sm" onClick={readAll}>Tandai dibaca</button>}
          </div>
          {notes.length === 0 && <p className="mute" style={{ fontSize: 14, marginTop: 12 }}>Belum ada notifikasi.</p>}
          <div className="list" style={{ marginTop: 12 }}>{notes.map((n) => (
            <div key={n.id} className="note" style={{ marginTop: 0, color: n.read ? "var(--mute)" : "var(--ink)" }}>
              <span className="mono mute" style={{ fontSize: 11 }}>{date(n.created_at)}</span><br />{n.body}
            </div>))}</div>
        </div>

        <div className="card wide">
          <h3>Bagi hasil</h3>
          <p className="mute" style={{ fontSize: 14, marginTop: 8 }}>50% dari sisa margin bulanan dibagikan ke staker dalam USDG. Klaim kapan saja dalam 1 tahun.</p>
          {rev.allocations.length === 0 && <p className="mute" style={{ fontSize: 14, marginTop: 12 }}>Belum ada bagi hasil. Stake $ORIEL untuk ikut menerima.</p>}
          <div className="list" style={{ marginTop: 12 }}>{rev.allocations.map((a) => (
            <div key={a.period} className="row-item">
              <span><b>{new Date(a.period).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</b><br />
                <span className="mono mute">{(Number(a.amount_raw) / 10 ** USDG_DEC).toLocaleString("id-ID", { maximumFractionDigits: 2 })} USDG</span></span>
              {claimed[a.epoch] ? <span className="mono mute">Sudah diklaim</span>
                : <button className="pill sm ink" disabled={!rev.distributor} onClick={() => claim(a)}>Klaim</button>}
            </div>))}</div>
        </div>

        <div className="card wide">
          <h3>Riwayat kredit</h3>
          {(me.ledger ?? []).length === 0 && <p className="mute" style={{ fontSize: 14, marginTop: 12 }}>Belum ada transaksi.</p>}
          <table className="ledger"><tbody>{(me.ledger ?? []).map((l: any) => (
            <tr key={l.id}><td>{REASON[l.reason] ?? l.reason}<br /><span className="mono mute" style={{ fontSize: 11 }}>{date(l.created_at)} · {l.bucket === "monthly" ? "bulanan" : "top-up"}</span></td>
              <td style={{ color: l.delta < 0 ? "var(--ink)" : "#1B7F3B" }}>{l.delta > 0 ? "+" : ""}{Number(l.delta).toLocaleString("id-ID")}</td></tr>))}</tbody></table>
        </div>
      </div>
    </section>
  );
}
