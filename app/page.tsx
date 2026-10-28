import Link from "next/link";
import { OrielIcon } from "@/components/Logo";
import { admin } from "@/lib/supabase/admin";
import { ROOT_DOMAIN } from "@/lib/config";

export const revalidate = 300;

/** Showcase: projects whose owner opted in AND that the Oriel team picked (featured_at set). */
async function featured() {
  try {
    const { data } = await admin().from("projects").select("id, name, slug")
      .eq("showcase_opt_in", true).not("featured_at", "is", null).not("published_version", "is", null)
      .order("featured_at", { ascending: false }).limit(6);
    return (data ?? []) as { id: string; name: string; slug: string }[];
  } catch { return []; }
}

export default async function Home() {
  const show = await featured();
  return (
    <section className="page">
      <div className="hero">
        <div>
          <h1>Build anything. Own a piece of it.</h1>
          <p className="lead">Describe what you want. Oriel builds it, puts it live at a link, and you keep changing it through chat.</p>
          <form className="prompt" action="/workspace/new">
            <input name="prompt" aria-label="What do you want to build" placeholder="A portfolio site for my ceramics studio" />
            <button className="pill ink" type="submit">Build</button>
          </form>
          <p className="mono mute" style={{ marginTop: 14 }}>60 free credits every month. No credit card.</p>
        </div>
        <div className="build" aria-label="Example build in progress">
          <div className="bh"><OrielIcon size={18} /><span className="url">claystudio.buildoriel.com</span><span className="mono mute">142 / 210</span></div>
          <div className="blocks"><div className="blk done w2" /><div className="blk done w4" /><div className="blk done w6" /><div className="blk done w3" /><div className="blk lit w3" /><div className="blk w4" /><div className="blk w2" /></div>
          <ol className="steps">
            <li><span>Page plan</span><span>done</span></li><li><span>Hero + navigation</span><span>done</span></li>
            <li className="now"><span>Work gallery</span><span>writing</span></li><li><span>Contact form</span><span>queued</span></li>
          </ol>
        </div>
      </div>
      <div className="grid trio">
        {[["Any website", "Landing pages, online stores, blogs, community sites, business sites. Live right away on your own subdomain.", ["Portfolio", "Store", "Blog"]],
          ["Interactive tools", "Dashboards, calculators, forms, mini-games. Connect them to your own Supabase database.", ["Dashboard", "Form", "Game"]],
          ["Design and documents", "Logos, posters, banners, app mockups, proposals, decks. All editable again through chat.", ["Logo", "Poster", "Deck"]]]
          .map(([t, d, k]) => (
            <div className="card" key={t as string}><h3>{t}</h3><p className="mute">{d}</p>
              <div className="kinds">{(k as string[]).map((x) => <span key={x}>{x}</span>)}</div></div>))}
      </div>
      {show.length > 0 && (
        <div style={{ marginTop: 96 }}>
          <h2>Made with Oriel</h2>
          <div className="grid show">{show.map((p) => (
            <a key={p.id} className="card tc" href={`https://${p.slug}.${ROOT_DOMAIN}`} target="_blank" rel="noreferrer">
              <div className="frame"><iframe src={`https://${p.slug}.${ROOT_DOMAIN}`} title={p.name} loading="lazy" tabIndex={-1} aria-hidden="true" sandbox="allow-scripts" /></div>
              <div className="bd"><h3>{p.name}</h3><span className="mono mute">{p.slug}.{ROOT_DOMAIN}</span></div>
            </a>))}</div>
        </div>)}
      <div className="econ">
        <div>
          <h2>Stake instead of subscribe.</h2>
          <p className="mute" style={{ marginTop: 18, maxWidth: "40ch" }}>Lock $ORIEL worth a tier, use its credits every month, withdraw any time. Stakers also receive a share of the margin in stablecoins.</p>
          <Link className="pill" style={{ marginTop: 24 }} href="/stake">Calculate your stake</Link>
        </div>
        <div className="flow" aria-label="Example monthly margin split">
          <div className="row"><span>Last month's gross margin</span><span className="mono">$10,000</span></div>
          {[["Staker credits", "$4,000", 40, ""], ["Revenue share to stakers", "$3,000", 30, "a"], ["Operations", "$1,800", 18, ""], ["$ORIEL buyback", "$1,200", 12, ""]].map(([l, v, w, c]) => (
            <div className="row" key={l as string}><span>{l}</span><span className="mono">{v}</span><div className="bar2"><i className={c as string} style={{ width: `${w}%` }} /></div></div>))}
        </div>
      </div>
    </section>
  );
}
