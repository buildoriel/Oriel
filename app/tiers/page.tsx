import Link from "next/link";
import { BuyButton } from "@/components/BuyButton";

export const metadata = { title: "Tiers & Credits" };
const TIERS = [
  { id: "free", name: "Free", credits: "60", price: "$0", stake: null, items: ["About 3 quick builds or 20 edits", "1 project on a subdomain", "Download as ZIP", "Wallet verification required"] },
  { id: "builder", name: "Builder", credits: "1,000", price: "$20", usd: 20, stake: "$200", items: ["About 4 full builds, 100 edits", "5 projects", "GitHub connector", "Revenue share when you stake"] },
  { id: "pro", name: "Pro", credits: "2,500", price: "$50", usd: 50, stake: "$500", feat: true, items: ["About 8 builds + 1 premium", "20 projects, 1 custom domain", "GitHub, Vercel, Netlify, Supabase, Drive", "Larger revenue share when you stake"] },
  { id: "studio", name: "Studio", credits: "10,000", price: "$200", usd: 200, stake: "$2,000", items: ["About 15 premium builds", "Unlimited projects and custom domains", "All connectors incl. Cloudflare DNS", "Largest revenue share when you stake", "1 free domain per year (coming soon)"] },
];

export default function Tiers() {
  return (
    <section className="page">
      <h2>Tiers &amp; Credits</h2>
      <p className="mute" style={{ marginTop: 12, maxWidth: "56ch" }}>Pay monthly, or stake $ORIEL worth 10x the monthly price. The AI model is picked automatically for each request, up to your tier's limit. Revenue share is paid to stakers only, in USDG.</p>
      <div className="grid tiers">
        {TIERS.map((t) => (
          <div key={t.id} className={`card tier${t.feat ? " feat" : ""}`}>
            <div><h3>{t.name}</h3><p className="mono mute">{t.credits} credits / month</p></div>
            <div className="price">{t.price}{t.usd && <small> / month</small>}</div>
            {t.stake && <div className="or">or stake worth <b>{t.stake}</b></div>}
            <ul>{t.items.map((i) => <li key={i}>{i}</li>)}</ul>
            <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
              {t.usd ? <><BuyButton product={t.id} usd={t.usd} label={`Pay ${t.price} USDG`} ink={t.feat} /><Link className="pill sm" href="/stake" style={{ justifyContent: "center" }}>Stake</Link></>
                : <Link className="pill" href="/workspace" style={{ justifyContent: "center" }}>Start free</Link>}
            </div>
          </div>))}
      </div>
      <div className="two">
        <div className="card"><h3 style={{ marginBottom: 8 }}>Estimated cost</h3><p className="mono mute">1 credit = $0.02. Charged by actual AI usage.</p>
          <table className="cost"><tbody>{[["Small edit", "~1"], ["Quick site build", "~10"], ["Full site build", "~210"], ["Premium build", "~420"], ["Large multi-page project", "~3,100"]].map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody></table></div>
        <div className="card"><h3 style={{ marginBottom: 8 }}>Top-up</h3><p className="mute" style={{ fontSize: 14, marginBottom: 18 }}>Never expire. Pay with USDG or $ORIEL on Robinhood Chain.</p>
          <div className="grid packs">{[["pack_500", "500", 10], ["pack_2500", "2,500", 50], ["pack_10000", "10,000", 200]].map(([id, n, usd]) => (
            <div key={id as string} className="card pack" style={{ padding: 20 }}><div className="n">{n}</div><p className="mono mute" style={{ marginBottom: 14 }}>credits</p><BuyButton product={id as string} usd={usd as number} label={`$${usd}`} /></div>))}</div></div>
      </div>
    </section>
  );
}
