import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CONTACT_EMAIL } from "@/components/Legal";
import s from "../help.module.css";

export const metadata = { title: "FAQ", description: "Answers about Oriel credits, plans, staking, revenue share, publishing, and your data." };

const GROUPS: { title: string; items: [string, React.ReactNode][] }[] = [
  {
    title: "Credits and plans",
    items: [
      ["What is a credit?", <>
        <p>Credits pay for AI usage. One credit covers $0.01 of AI cost, and each request is charged by what it actually cost, so a small edit uses a few credits and a full build uses more.</p>
        <p>Each request also has a cap, so one message can&rsquo;t drain your balance.</p>
      </>],
      ["How many credits does each plan include?", <>
        <p>Free includes 60 credits a month, Builder 1,000, Pro 2,500 and Studio 10,000. Free credits require a verified wallet, limited to one wallet per account. See <Link href="/tiers">Plans &amp; credits</Link> for everything each plan includes.</p>
      </>],
      ["Do credits expire?", <>
        <p>Monthly credits, from Free, a paid plan, or staking, expire at the end of their period. Top-up credits never expire while your account is active.</p>
      </>],
      ["How do I pay?", <>
        <p>On-chain, in USDG or $ORIEL on Robinhood Chain. Payments are final once confirmed. Plans last 30 days, and top-up packs come in 500, 2,500, and 10,000 credits.</p>
      </>],
      ["Can I get a refund?", <>
        <p>Credits have no cash value and aren&rsquo;t refundable, except where the law requires it. See the <Link href="/terms">Terms</Link> for details.</p>
      </>],
      ["Which AI models does Oriel use?", <>
        <p>Oriel picks the model for each request, up to your plan&rsquo;s limit. Small edits use Haiku 5.5 on every plan. Builds use Sonnet 5.5 on Builder and Pro, and Opus 5.5 on Studio. Large projects can use Opus 5.5 on Pro (a few times a month) and Fable 5.1 on Studio. Free uses Haiku 5.5.</p>
      </>],
    ],
  },
  {
    title: "Staking and revenue share",
    items: [
      ["How does staking replace a subscription?", <>
        <p>Stake $ORIEL worth 10 times a plan&rsquo;s monthly price and you get that plan&rsquo;s credits every month: $200 for Builder, $500 for Pro, $2,000 for Studio. Your stake is valued with the 7-day average price, on the 1st of each month.</p>
        <p>If the value drops, you keep your tier while it stays above 90% of the threshold. Below that, you get a one-month grace period and a notification before any downgrade.</p>
      </>],
      ["Can I withdraw my stake?", <>
        <p>Yes, any time. The staking contract has no owner and can&rsquo;t be paused or upgraded. Only your wallet can withdraw your stake.</p>
      </>],
      ["What is revenue share?", <>
        <p>Each month, staker credits are funded from real margin, up to 40% of last month&rsquo;s margin. They are scaled down proportionally if demand is higher.</p>
        <p>Of what remains, 50% goes to stakers as revenue share in USDG, 30% to operations, and 20% to $ORIEL buybacks. You can claim your share from your Account page within a year.</p>
        <p>Revenue share depends on actual margin and can be zero. It is not a promise of profit, and nothing on Oriel is financial advice.</p>
      </>],
    ],
  },
  {
    title: "Building and publishing",
    items: [
      ["Where does my site live?", <>
        <p>Every project gets its own subdomain on buildoriel.com. Publishing creates a new version and puts it live there. You can roll back to any earlier version from the workspace.</p>
      </>],
      ["Can I use my own domain?", <>
        <p>Yes, on Pro (1 custom domain) and Studio (unlimited). Add the domain under <Link href="/connectors">Connectors &amp; domains</Link> and point a CNAME record at Oriel. HTTPS is set up automatically.</p>
        <p>On Studio, if you connect Cloudflare, Oriel can create the DNS record for you.</p>
      </>],
      ["Which services can I connect?", <>
        <p>Builder can connect GitHub. Pro adds Vercel, Netlify, Supabase, and Google Drive. Studio adds Cloudflare DNS.</p>
        <p>Large actions, such as pushing code, deploying, or running database changes, only happen after you confirm them.</p>
      </>],
      ["How do templates work?", <>
        <p>Any published project can be listed as a template, free or for a price in credits. When someone uses your template, you earn a royalty. Browse what others have made on the <Link href="/templates">Templates</Link> page.</p>
      </>],
      ["Can I work on a project with my team?", <>
        <p>On Studio, you can invite people to a project as editors. Each member uses their own credits.</p>
      </>],
      ["How many projects can I have?", <>
        <p>Free includes 1 project, Builder 5, Pro 20, and Studio is unlimited. Deleting a project frees up its slot.</p>
      </>],
    ],
  },
  {
    title: "Your work and your data",
    items: [
      ["Who owns what Oriel builds?", <>
        <p>You do. You own the projects you create, including the AI-generated files, to the extent the law allows. You can download any project as a ZIP on every plan.</p>
      </>],
      ["What happens to my data?", <>
        <p>Your requests and project files are sent to our AI providers to produce results. Connector tokens are stored encrypted and used only for actions you start. We don&rsquo;t sell your personal data or use it for advertising.</p>
        <p>The <Link href="/privacy">Privacy Policy</Link> has the full details.</p>
      </>],
      ["How do I report a site?", <>
        <p>Use <Link href="/report">Report a site</Link>. Every site is also scanned automatically before it&rsquo;s published.</p>
      </>],
    ],
  },
];

export default function Faq() {
  return (
    <div className="site-main">
      <div className="page page-narrow">
        <header className={s.head}>
          <span className="eyebrow">Help</span>
          <h1 className="h1">Frequently asked questions</h1>
          <p className="lead">Can&rsquo;t find your answer here? Read the <Link href="/docs">docs</Link> or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        </header>
        {GROUPS.map((g) => (
          <section key={g.title} className={s.group}>
            <h2 className={s.groupTitle}>{g.title}</h2>
            {g.items.map(([q, a]) => (
              <details key={q} className={s.qa}>
                <summary>{q}<Icon name="chevronDown" /></summary>
                <div className={s.answer}>{a}</div>
              </details>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
