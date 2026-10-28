import Link from "next/link";
import { BuyButton } from "@/components/BuyButton";
import { Icon } from "@/components/Icon";
import s from "./tiers.module.css";

export const metadata = { title: "Plans & credits" };

type Plan = { id: string; name: string; credits: string; price: string; usd?: number; stake: string | null; featured?: boolean; blurb: string; items: string[] };
const PLANS: Plan[] = [
  { id: "free", name: "Free", credits: "60", price: "$0", stake: null, blurb: "Try Oriel on a small project.",
    items: ["About 3 quick builds or 20 edits", "1 project on a subdomain", "Download as ZIP", "Wallet verification required"] },
  { id: "builder", name: "Builder", credits: "1,000", price: "$20", usd: 20, stake: "$200", blurb: "For personal sites and side projects.",
    items: ["About 4 full builds, 100 edits", "5 projects", "GitHub connector", "Revenue share when you stake"] },
  { id: "pro", name: "Pro", credits: "2,500", price: "$50", usd: 50, stake: "$500", featured: true, blurb: "For people who ship every week.",
    items: ["About 8 builds + 1 premium", "20 projects, 1 custom domain", "GitHub, Vercel, Netlify, Supabase, Drive", "Larger revenue share when you stake"] },
  { id: "studio", name: "Studio", credits: "10,000", price: "$200", usd: 200, stake: "$2,000", blurb: "For teams and agencies.",
    items: ["About 15 premium builds", "Unlimited projects and custom domains", "All connectors incl. Cloudflare DNS", "Largest revenue share when you stake", "1 free domain per year (coming soon)"] },
];
const COSTS: [string, string][] = [["Small edit", "~1"], ["Quick site build", "~10"], ["Full site build", "~210"], ["Premium build", "~420"], ["Large multi-page project", "~3,100"]];
const PACKS: [string, string, number][] = [["pack_500", "500", 10], ["pack_2500", "2,500", 50], ["pack_10000", "10,000", 200]];

export default function Plans() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h1">Plans &amp; credits</h1>
          <p className="lead">Pay monthly, or stake $ORIEL worth 10x the monthly price. Oriel picks the AI model for each request, up to your plan&apos;s limit.</p>
        </div>
      </div>

      <div className={s.plans}>
        {PLANS.map((p) => (
          <div key={p.id} className={`card ${s.plan}${p.featured ? ` ${s.featured}` : ""}`}>
            <div className="stack" style={{ gap: 6 }}>
              <div className="row-between">
                <h2 className="h3">{p.name}</h2>
                {p.featured && <span className="badge badge-accent">Most popular</span>}
              </div>
              <p className="small mute">{p.blurb}</p>
            </div>
            <div>
              <div className={s.price}>{p.price}{p.usd ? <small>/ month</small> : null}</div>
              <p className="xs mute mono" style={{ marginTop: 8 }}>{p.credits} credits / month</p>
            </div>
            {p.stake && <div className={s.stakeLine}>or stake $ORIEL worth <b>{p.stake}</b></div>}
            <ul className={s.features}>{p.items.map((i) => <li key={i}><Icon name="check" />{i}</li>)}</ul>
            <div className={s.actions}>
              {p.usd ? (
                <>
                  <BuyButton product={p.id} usd={p.usd} label={`Pay ${p.price} in USDG`} primary={p.featured} />
                  <Link className="btn btn-ghost btn-sm" href="/stake">Stake instead</Link>
                </>
              ) : <Link className="btn btn-block" href="/workspace">Start free</Link>}
            </div>
          </div>
        ))}
      </div>
      <p className="small mute" style={{ marginTop: 16 }}>Revenue share is paid to stakers only, in USDG.</p>

      <div className={`${s.section} ${s.lower}`}>
        <section className="card card-lg">
          <div className="card-head" style={{ alignItems: "flex-start" }}>
            <div>
              <h2 className="h2">Estimated cost per request</h2>
              <p className="small mute" style={{ marginTop: 6 }}>1 credit = $0.02. You are charged for actual AI usage.</p>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Request</th><th className="r">Credits</th></tr></thead>
            <tbody>{COSTS.map(([a, b]) => <tr key={a}><td>{a}</td><td className="r mono">{b}</td></tr>)}</tbody>
          </table>
        </section>

        <section className="card card-lg">
          <div className="card-head" style={{ alignItems: "flex-start" }}>
            <div>
              <h2 className="h2">Top-up credits</h2>
              <p className="small mute" style={{ marginTop: 6 }}>Never expire. Pay with USDG or $ORIEL on Robinhood Chain.</p>
            </div>
          </div>
          <div className={s.packs}>
            {PACKS.map(([id, n, usd]) => (
              <div key={id} className={`panel ${s.pack}`}>
                <div className={s.packAmount}>{n}</div>
                <p className="xs mute" style={{ marginBottom: 12 }}>credits</p>
                <BuyButton product={id} usd={usd} label={`$${usd}`} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
