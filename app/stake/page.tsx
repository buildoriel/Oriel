"use client";
import { useEffect, useState } from "react";
import { stake, unstake } from "@/lib/wallet-client";

const T: [string, number, number][] = [["Builder", 200, 1000], ["Pro", 500, 2500], ["Studio", 2000, 10000]];
const usd = (n: number) => "$" + n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Stake() {
  const [info, setInfo] = useState<any>(null); const [amt, setAmt] = useState(""); const [msg, setMsg] = useState("");
  const load = () => fetch("/api/stake").then((r) => r.json()).then((j) => { setInfo(j); if (!amt) setAmt(String(j.staked ?? 0)); });
  useEffect(() => { load(); }, []);
  const [demo, setDemo] = useState("0.01");
  const twap = info?.twap ?? (info && !info.configured ? parseFloat(demo) || 0 : 0);
  const v = (parseFloat(amt.replace(",", ".")) || 0) * twap;
  const cur = [...T].reverse().find((t) => v >= t[1]) ?? ["Free", 0, 60];
  async function act(kind: "stake" | "unstake") {
    // input = jumlah stake yang diinginkan; selisih dengan stake sekarang menentukan arah
    const diff = (parseFloat(amt.replace(",", ".")) || 0) - (info?.staked ?? 0);
    if (kind === "stake" && diff <= 0) return setMsg("Naikkan jumlah di atas stake sekarang untuk menambah stake.");
    if (kind === "unstake" && diff >= 0) return setMsg("Turunkan jumlah di bawah stake sekarang untuk menarik.");
    const delta = Math.abs(diff);
    try { setMsg("Konfirmasi di wallet"); kind === "stake" ? await stake(String(delta)) : await unstake(String(delta)); setMsg("Selesai. Tier dievaluasi tanggal 1."); load(); }
    catch (e: any) { setMsg(e.shortMessage ?? e.message); }
  }
  return (
    <section className="page">
      <h2>Stake $ORIEL</h2>
      <p className="mute" style={{ marginTop: 12, maxWidth: "56ch" }}>Tier dihitung dari nilai dolar stake-mu, memakai harga rata-rata 7 hari pool $ORIEL di Pons. Dievaluasi setiap tanggal 1.</p>
      {info && !info.configured && <div className="banner" style={{ marginTop: 24 }}><span>Staking aktif setelah $ORIEL diluncurkan di Pons. Kalkulator di bawah memakai harga contoh.</span></div>}
      {info?.configured && !info.walletVerified && <div className="banner" style={{ marginTop: 24 }}><span>Sambungkan wallet yang kamu pakai untuk stake agar tier-mu terbaca.</span><a className="pill sm ink" href="/akun">Sambungkan wallet</a></div>}
      <div className="stake">
        <div className="card">
          <label className="f">Jumlah $ORIEL yang di-stake<div className="inp"><input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></div></label>
          <div className="kv"><span className="mute">Harga TWAP 7 hari</span><span>{info && !info.configured
            ? <input aria-label="Harga contoh per token (USD)" value={demo} onChange={(e) => setDemo(e.target.value)} style={{ width: 90, font: "inherit", border: "1px solid var(--line)", borderRadius: 8, padding: "2px 6px", textAlign: "right" }} />
            : twap ? `$${twap.toPrecision(3)}` : "belum cukup data"}</span><span className="mute">Harga sekarang</span><span>{info?.spot ? `$${info.spot.toPrecision(3)}` : "–"}</span></div>
          <p className="mute" style={{ marginTop: 28, fontSize: 14 }}>Nilai stake</p>
          <div className="big">{usd(v)}</div>
          <div className="ladder">{T.map((t) => (
            <div key={t[0]} className={`rung${t[0] === cur[0] ? " on" : ""}`}><span>{t[0]}</span><span className="t"><i style={{ width: `${Math.min(100, (v / t[1]) * 100)}%` }} /></span><span className="mono">${t[1].toLocaleString("id-ID")}</span></div>))}</div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 24 }}>
            <button className="pill ink" style={{ justifyContent: "center" }} disabled={!info?.configured} onClick={() => act("stake")}>Stake</button>
            <button className="pill" style={{ justifyContent: "center" }} disabled={!info?.configured} onClick={() => act("unstake")}>Unstake</button>
          </div>
          {msg && <p className="mono mute" style={{ marginTop: 12 }}>{msg}</p>}
        </div>
        <div className="card">
          <h3>Posisimu</h3>
          <div className="kv">
            <span className="mute">Tier stake sekarang</span><span>{info?.currentTier ?? "–"}</span>
            <span className="mute">Tier dengan jumlah di atas</span><span>{cur[0]}</span>
            <span className="mute">Kredit per bulan</span><span>{(cur[2] as number).toLocaleString("id-ID")}</span>
            <span className="mute">Batas aman (buffer 10%)</span><span>{cur[1] ? `$${((cur[1] as number) * 0.9).toLocaleString("id-ID")}` : "–"}</span>
            {info?.graceUntil && <><span className="mute">Masa tenggang sampai</span><span>{info.graceUntil.slice(0, 10)}</span></>}
          </div>
          <div className="note">Kalau nilai stake turun di bawah batas aman, kamu tetap di tier ini selama 1 bulan masa tenggang dan mendapat notifikasi sebelum turun tier.</div>
          <div className="note">Unstake kapan saja. Kredit yang sudah diisi bulan ini tetap bisa dipakai. Kredit staker dibiayai dari margin nyata, maksimal 40% margin bulan lalu, dan bisa dibagi proporsional bila staker sangat banyak.</div>
        </div>
      </div>
    </section>
  );
}
