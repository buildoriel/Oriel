import Link from "next/link";
import { BuyButton } from "@/components/BuyButton";

export const metadata = { title: "Tiers & Credits" };
const TIERS = [
  { id: "free", name: "Free", credits: "60", price: "$0", stake: null, items: ["Sekitar 3 build cepat atau 20 edit", "1 proyek di subdomain", "Download ZIP", "Wajib verifikasi wallet"] },
  { id: "builder", name: "Builder", credits: "1.000", price: "$20", usd: 20, stake: "$200", items: ["Sekitar 4 build penuh, 100 edit", "5 proyek", "Konektor GitHub", "Bagi hasil"] },
  { id: "pro", name: "Pro", credits: "2.500", price: "$50", usd: 50, stake: "$500", feat: true, items: ["Sekitar 8 build + 1 premium", "20 proyek, custom domain", "GitHub, Vercel, Netlify, Supabase, Drive", "Bagi hasil lebih besar"] },
  { id: "studio", name: "Studio", credits: "10.000", price: "$200", usd: 200, stake: "$2.000", items: ["Sekitar 15 build premium", "Proyek dan domain tanpa batas", "1 domain gratis per tahun", "Semua konektor, bagi hasil terbesar"] },
];

export default function Tiers() {
  return (
    <section className="page">
      <h2>Tiers &amp; Credits</h2>
      <p className="mute" style={{ marginTop: 12, maxWidth: "56ch" }}>Beli bulanan, atau stake $ORIEL senilai 10x harga bulanan. Model AI dipilih otomatis sesuai permintaan, sampai batas tier-mu.</p>
      <div className="grid tiers">
        {TIERS.map((t) => (
          <div key={t.id} className={`card tier${t.feat ? " feat" : ""}`}>
            <div><h3>{t.name}</h3><p className="mono mute">{t.credits} kredit / bulan</p></div>
            <div className="price">{t.price}{t.usd && <small> / bulan</small>}</div>
            {t.stake && <div className="or">atau stake senilai <b>{t.stake}</b></div>}
            <ul>{t.items.map((i) => <li key={i}>{i}</li>)}</ul>
            <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
              {t.usd ? <><BuyButton product={t.id} usd={t.usd} label={`Bayar ${t.price} USDG`} ink={t.feat} /><Link className="pill sm" href="/stake" style={{ justifyContent: "center" }}>Stake</Link></>
                : <Link className="pill" href="/workspace" style={{ justifyContent: "center" }}>Mulai gratis</Link>}
            </div>
          </div>))}
      </div>
      <div className="two">
        <div className="card"><h3 style={{ marginBottom: 8 }}>Perkiraan biaya</h3><p className="mono mute">1 kredit = $0,02. Dipotong sesuai pemakaian AI sebenarnya.</p>
          <table className="cost"><tbody>{[["Edit kecil", "~1"], ["Build web cepat", "~10"], ["Build web penuh", "~210"], ["Build premium", "~420"], ["Proyek besar multi-halaman", "~3.100"]].map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody></table></div>
        <div className="card"><h3 style={{ marginBottom: 8 }}>Top-up</h3><p className="mute" style={{ fontSize: 14, marginBottom: 18 }}>Tidak hangus. Bayar dengan USDG atau $ORIEL di Robinhood Chain.</p>
          <div className="grid packs">{[["pack_500", "500", 10], ["pack_2500", "2.500", 50], ["pack_10000", "10.000", 200]].map(([id, n, usd]) => (
            <div key={id as string} className="card pack" style={{ padding: 20 }}><div className="n">{n}</div><p className="mono mute" style={{ marginBottom: 14 }}>kredit</p><BuyButton product={id as string} usd={usd as number} label={`$${usd}`} /></div>))}</div></div>
      </div>
    </section>
  );
}
