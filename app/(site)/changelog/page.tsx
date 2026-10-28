import Link from "next/link";
import s from "../help.module.css";

export const metadata = { title: "Changelog", description: "What's new in Oriel." };

const ENTRIES: { date: string; title: string; body: React.ReactNode }[] = [
  {
    date: "October 28, 2026",
    title: "A new look, and the tools to run real projects",
    body: <>
      <p>Oriel has a new design, built to stay out of your way while you work. It comes with a set of features for running real projects.</p>
      <ul>
        <li><b>Redesigned workspace:</b> a calmer sidebar with your recent projects and credits, chat next to a live preview, device sizes, and a code view.</li>
        <li><b>Version history:</b> every publish is kept, and you can roll the live site back to any version.</li>
        <li><b>Attachments:</b> add images and text files to a message.</li>
        <li><b>Credit estimates:</b> see roughly what a request will cost before you send it.</li>
        <li><b>Team projects:</b> on Studio, invite editors to a project. Members use their own credits.</li>
        <li><b>Delete projects:</b> deleting a project frees its slot on your plan.</li>
        <li><b>Command palette:</b> press ⌘K to search projects and jump anywhere.</li>
        <li><b>Light and dark themes:</b> choose light, dark, or follow your system.</li>
        <li><b>Email notifications:</b> get an email when a long build finishes or your credits run low.</li>
        <li><b>Help pages:</b> new <Link href="/docs">Docs</Link> and <Link href="/faq">FAQ</Link> pages.</li>
      </ul>
    </>,
  },
  {
    date: "October 2026",
    title: "Oriel launches",
    body: <>
      <p>The first version of Oriel: describe what you want, and an AI agent builds it, hosts it on your own subdomain, and keeps improving it with you through chat.</p>
      <ul>
        <li>Websites, interactive tools, designs, and documents, built and edited through chat.</li>
        <li>Credits that track real AI cost, with Free, Builder, Pro, and Studio plans paid in USDG or $ORIEL.</li>
        <li>Stake $ORIEL instead of subscribing, and share in Oriel&rsquo;s margin.</li>
        <li>Custom domains, a template marketplace with creator royalties, referrals, and connectors for GitHub, Vercel, Netlify, Supabase, Google Drive, and Cloudflare.</li>
      </ul>
    </>,
  },
];

export default function Changelog() {
  return (
    <div className="site-main">
      <div className="page page-narrow">
        <header className={s.head}>
          <span className="eyebrow">Changelog</span>
          <h1 className="h1">What&rsquo;s new</h1>
          <p className="lead">New features and improvements to Oriel.</p>
        </header>
        <div className={s.entries}>
          {ENTRIES.map((e) => (
            <article key={e.title} className={s.entry}>
              <time className={s.date}>{e.date}</time>
              <div><h2>{e.title}</h2>{e.body}</div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
