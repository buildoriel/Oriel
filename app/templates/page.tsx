"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CATS = [["", "Semua"], ["landing", "Landing page"], ["store", "Toko"], ["portfolio", "Portofolio"], ["dashboard", "Dashboard"], ["deck", "Deck"]];

export default function Templates() {
  const [cat, setCat] = useState(""); const [items, setItems] = useState<any[]>([]); const [err, setErr] = useState("");
  const router = useRouter();
  useEffect(() => { fetch(`/api/templates${cat ? `?category=${cat}` : ""}`).then((r) => r.json()).then((j) => setItems(j.templates)); }, [cat]);
  async function use(t: any) {
    const slug = prompt("Alamat proyek baru (huruf kecil, angka, tanda hubung):", `${t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(16).slice(2, 6)}`);
    if (!slug) return;
    const r = await fetch(`/api/templates/${t.id}/use`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug }) });
    const j = await r.json(); r.ok ? router.push(`/workspace/${j.projectId}`) : setErr(j.error);
  }
  return (
    <section className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
        <div><h2>Templates</h2><p className="mute" style={{ marginTop: 12, maxWidth: "52ch" }}>Mulai dari karya orang lain. Kreator menerima royalti USDG setiap kali template-nya dipakai.</p></div>
        <a className="pill" href="/workspace">Jual template dari proyekmu</a>
      </div>
      <div className="tbar">{CATS.map(([id, l]) => <button key={id} className={`pill sm${cat === id ? " ink" : ""}`} onClick={() => setCat(id)}>{l}</button>)}</div>
      {err && <p className="err">{err}</p>}
      {items.length === 0 && <p className="mute">Belum ada template di kategori ini. Publish proyekmu lalu jual sebagai template pertama.</p>}
      <div className="grid tpl">{items.map((t) => (
        <button key={t.id} className="card tc" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => use(t)}>
          <div className="thumb"><i /><i /><i /></div>
          <div className="bd"><h3>{t.title}</h3><p className="mute" style={{ fontSize: 14 }}>{t.description}</p>
            <div className="ft"><span>oleh @{t.profiles?.handle ?? "kreator"} · {t.uses} pakai</span><span className="mono">{t.price_credits} kredit</span></div></div>
        </button>))}</div>
    </section>
  );
}
