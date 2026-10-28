import Link from "next/link";
import { Icon } from "@/components/Icon";
import { AddressRow } from "@/components/AddressRow";
import { cachedTokenStats } from "@/lib/token-stats";
import s from "./token.module.css";

export const revalidate = 60;
export const metadata = {
  title: "$ORIEL",
  description: "The official $ORIEL token and contract addresses, with live supply, burn, price and staking data from Robinhood Chain.",
};

const num = (n: number | null, digits = 0) => (n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: digits }));
const compact = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 }));
function usd(n: number | null) {
  if (n == null) return "—";
  if (n >= 0.01) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
  return `$${n.toPrecision(3)}`;   // tiny prices: keep three significant digits
}

export default async function TokenPage() {
  const t = await cachedTokenStats();
  const pct = (v: number | null) => (v == null || !t.supply ? "" : `${((v / 1_000_000_000) * 100).toFixed(2)}% of the initial supply`);
  return (
    <div className="site-main">
      <div className="page">
        <header className={s.head}>
          <span className="eyebrow">$ORIEL</span>
          <h1 className="h1">The token behind Oriel</h1>
          <p className="lead">Stake $ORIEL instead of paying a subscription, use your plan&apos;s credits every month, and receive a share of the margin in USDG. These are the only official addresses.</p>
        </header>

        {!t.token ? (
          <div className="callout callout-accent"><Icon name="info" /><span className="callout-body">$ORIEL hasn&apos;t launched yet. The official address will appear here and on the home page as soon as it does.</span></div>
        ) : (
          <>
            <div className={s.stats}>
              <div className={`card ${s.stat}`}><span className="small mute">Price</span><b className="num">{usd(t.priceUsd)}</b><span className="xs faint">Spot price on the Pons curve</span></div>
              <div className={`card ${s.stat}`}><span className="small mute">Supply</span><b className="num">{compact(t.supply)}</b><span className="xs faint">ORIEL in existence</span></div>
              <div className={`card ${s.stat}`}><span className="small mute">Burned</span><b className="num">{compact(t.burned)}</b><span className="xs faint">{pct(t.burned)}</span></div>
              <div className={`card ${s.stat}`}><span className="small mute">Staked</span><b className="num">{compact(t.staked)}</b><span className="xs faint">{t.staked == null ? "" : `${num(t.staked)} ORIEL in the staking contract`}</span></div>
            </div>

            <section className="card card-lg" style={{ marginBottom: 20 }}>
              <div className="card-head"><h2 className="h3">Official contracts</h2><span className="badge">Robinhood Chain</span></div>
              <AddressRow label="$ORIEL token" note="ERC-20, 18 decimals" address={t.token} kind="token" />
              {t.staking && <AddressRow label="Staking" note="OrielStaking" address={t.staking} />}
              {t.distributor && <AddressRow label="Revenue share" note="RevenueDistributor (USDG)" address={t.distributor} />}
              {t.pool && <AddressRow label="Pons curve" note="Where $ORIEL trades" address={t.pool} />}
            </section>

            <div className={s.cols}>
              <section className="card card-lg">
                <h2 className="h3">How it works</h2>
                <ul className={s.list}>
                  <li><b>Stake for a plan.</b> Stake $ORIEL worth 10 times a plan&apos;s monthly price ($200 Builder, $500 Pro, $2,000 Studio) and get its credits every month.</li>
                  <li><b>Valued fairly.</b> Your stake is valued with the 7-day average price, on the 1st of each month. $ORIEL launched on October 28, 2026, so the first assignment with a full week of price data is on December 1.</li>
                  <li><b>Revenue share.</b> Each month, after staker credits, half of the remaining margin goes to stakers in USDG. It depends on real margin and can be zero.</li>
                </ul>
                <div className="row wrap" style={{ marginTop: 18 }}>
                  <Link className="btn btn-primary" href="/stake">Stake $ORIEL</Link>
                  <Link className="btn btn-ghost" href="/faq">Read the FAQ<Icon name="arrowRight" /></Link>
                </div>
              </section>

              <section className="card card-lg">
                <h2 className="h3">Security</h2>
                <ul className={s.list}>
                  <li><b>Your stake is yours.</b> The staking contract has no owner and can&apos;t be paused or upgraded. Only your wallet can withdraw your stake.</li>
                  <li><b>Open source.</b> Both contracts are in the <a className="link" href="https://github.com/buildoriel/Oriel/tree/main/contracts" target="_blank" rel="noreferrer">public repository</a>, and the deployed bytecode matches it.</li>
                  <li><b>Not audited yet.</b> Stake what you&apos;re comfortable with.</li>
                  <li><b>Watch for fakes.</b> Only trust the addresses on this page and those posted by <a className="link" href="https://x.com/buildoriel" target="_blank" rel="noreferrer">@buildoriel</a>. We will never DM you or ask for your seed phrase.</li>
                </ul>
              </section>
            </div>
            <p className="xs faint" style={{ marginTop: 18 }}>Read live from Robinhood Chain, refreshed every minute. Nothing here is financial advice.</p>
          </>
        )}
      </div>
    </div>
  );
}
