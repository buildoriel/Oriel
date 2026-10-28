import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { admin } from "@/lib/supabase/admin";
import { ROOT_DOMAIN } from "@/lib/config";
import { BuildDemo } from "@/components/BuildDemo";
import { HeroPrompt } from "@/components/HeroPrompt";
import { CountUp, RevealObserver } from "@/components/Motion";
import styles from "./home.module.css";

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

const EXAMPLES: [string, string][] = [
  ["Portfolio", "A portfolio site for my ceramics studio, warm and minimal, with a gallery and a contact form"],
  ["Online store", "A small online store for handmade candles with product pages and a cart"],
  ["Dashboard", "A personal finance dashboard with monthly spending charts and a budget table"],
  ["Pitch deck", "A 10-slide pitch deck for a climate fintech startup, clean and minimal"],
];

const KINDS: [IconName, string, string][] = [
  ["globe", "Websites", "Landing pages, portfolios, online stores, blogs, community and business sites. Live on your own subdomain right away."],
  ["chart", "Interactive tools", "Dashboards, calculators, forms, and mini-games. Connect your own Supabase database when you need data."],
  ["palette", "Designs", "Logos, posters, banners, and app mockups, built as code and SVG so you can keep refining them."],
  ["deck", "Documents", "Proposals, whitepapers, slide decks, and spreadsheets. Edit them through chat like everything else."],
];

const STEPS: [string, string][] = [
  ["Describe it", "Tell Oriel what you want in plain words: who it's for, what goes in it, and how it should feel."],
  ["Watch it build", "The agent plans, writes, and checks the work step by step while the preview updates live."],
  ["Publish and refine", "Put it live at a link with one click, then keep improving it through chat."],
];

const SPLIT: [string, number, number, boolean][] = [
  ["Staker credits", 4000, 40, false],
  ["Revenue share to stakers", 3000, 30, true],
  ["Operations", 1800, 18, false],
  ["$ORIEL buyback", 1200, 12, false],
];

export default async function Home() {
  const show = await featured();
  return (
    <div className="site-main">
      <RevealObserver />
      {/* ---------------- hero ---------------- */}
      <section className={`enter ${styles.hero}`}>
        <span className="badge badge-outline">AI workspace on Robinhood Chain</span>
        <h1 className="display">Build anything.<br />Own a piece of it.</h1>
        <p className="lead">Describe what you want. Oriel builds it, puts it live at a link, and keeps improving it with you through chat.</p>

        <HeroPrompt examples={EXAMPLES.map(([, prompt]) => prompt)} className={styles.prompt} noteClassName={styles.note} />

        <div className={styles.examples}>
          {EXAMPLES.map(([label, prompt]) => (
            <Link key={label} className="chip" href={`/workspace/new?prompt=${encodeURIComponent(prompt)}`}>{label}</Link>
          ))}
        </div>
      </section>

      {/* ---------------- demo ---------------- */}
      <section className={styles.demo} data-reveal>
        <BuildDemo />
      </section>

      {/* ---------------- what you can build ---------------- */}
      <section className="section">
        <div className={styles.sectionHead} data-reveal>
          <span className="eyebrow">What you can build</span>
          <h2 className="h1">From a single page to a full product.</h2>
        </div>
        <div className="grid-4">
          {KINDS.map(([icon, title, text], i) => (
            <div key={title} className={`card card-hover ${styles.tile}`} data-reveal style={{ "--d": `${i * 70}ms` } as React.CSSProperties}>
              <span className={styles.tileIcon}><Icon name={icon} /></span>
              <h3 className="h3">{title}</h3>
              <p className="small mute">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className={styles.sectionHead} data-reveal>
          <span className="eyebrow">How it works</span>
          <h2 className="h1">Three steps, no setup.</h2>
        </div>
        <div className="grid-3">
          {STEPS.map(([title, text], i) => (
            <div key={title} className={`stack ${styles.tile}`} data-reveal style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
              <span className={styles.stepNum}>{i + 1}</span>
              <h3 className="h3">{title}</h3>
              <p className="small mute">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- economics ---------------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className={styles.econ}>
          <div className="stack" style={{ gap: 16 }} data-reveal>
            <span className="eyebrow">Stake instead of subscribe</span>
            <h2 className="h1">Use it, earn from it, withdraw any time.</h2>
            <p className="mute">Stake $ORIEL worth a plan and use its credits every month. Stakers also receive a share of the margin in USDG. Unstake whenever you want.</p>
            <div className="row wrap" style={{ marginTop: 8 }}>
              <Link className="btn btn-primary" href="/stake">Calculate your stake</Link>
              <Link className="btn btn-ghost" href="/tiers">See plans<Icon name="arrowRight" /></Link>
            </div>
          </div>
          <div className="card card-lg" aria-label="Example monthly margin split" data-reveal style={{ "--d": "120ms" } as React.CSSProperties}>
            <div className="row-between" style={{ marginBottom: 22 }}>
              <span className="small mute">Example: last month&apos;s gross margin</span>
              <CountUp className="h2 num" value={10_000} prefix="$" duration={1100} onView />
            </div>
            <div className={styles.split}>
              {SPLIT.map(([label, usd, pct, accent], i) => (
                <div key={label} className={styles.splitRow}>
                  <div className="row-between small">
                    <span>{label}</span>
                    <CountUp className="mono" value={usd} prefix="$" duration={1100} onView />
                  </div>
                  <div className="meter"><i className={accent ? "accent" : ""} style={{ width: `${pct}%`, "--d": `${200 + i * 110}ms` } as React.CSSProperties} /></div>
                </div>
              ))}
            </div>
            <p className="xs faint" style={{ marginTop: 20 }}>Illustrative figures. Actual amounts depend on each month&apos;s margin.</p>
          </div>
        </div>
      </section>

      {/* ---------------- showcase ---------------- */}
      {show.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className={styles.sectionHead} data-reveal>
            <span className="eyebrow">Showcase</span>
            <h2 className="h1">Made with Oriel</h2>
          </div>
          <div className="grid-3">
            {show.map((p, i) => (
              <a key={p.id} className={`card card-hover ${styles.shot}`} data-reveal style={{ "--d": `${(i % 3) * 80}ms` } as React.CSSProperties} href={`https://${p.slug}.${ROOT_DOMAIN}`} target="_blank" rel="noreferrer">
                <div className={styles.frame}>
                  <iframe src={`https://${p.slug}.${ROOT_DOMAIN}`} title={p.name} loading="lazy" tabIndex={-1} aria-hidden="true" sandbox="allow-scripts" />
                </div>
                <div className={styles.shotBody}>
                  <span className="h3 truncate">{p.name}</span>
                  <span className="xs mute mono truncate">{p.slug}.{ROOT_DOMAIN}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- final CTA ---------------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className={`card ${styles.cta}`} data-reveal>
          <h2 className="h1">Start with a sentence.</h2>
          <p className="mute" style={{ maxWidth: "46ch" }}>Your first project is free. Describe it, watch it come together, and publish when it&apos;s ready.</p>
          <Link className="btn btn-primary btn-lg" href="/workspace">Start building<Icon name="arrowRight" /></Link>
        </div>
      </section>
    </div>
  );
}
