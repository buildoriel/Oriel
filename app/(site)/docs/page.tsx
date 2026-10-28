import Link from "next/link";
import s from "../help.module.css";

export const metadata = { title: "Docs", description: "How to build, publish, and manage projects on Oriel." };

const TOC: [string, string][] = [
  ["start", "Getting started"], ["prompts", "Writing good prompts"], ["attachments", "Attachments"],
  ["publishing", "Publishing and versions"], ["domains", "Custom domains"], ["connectors", "Connectors"],
  ["teams", "Team projects"], ["credits", "Credits"], ["shortcuts", "Shortcuts and settings"],
];

export default function Docs() {
  return (
    <div className="site-main">
      <div className="page">
        <header className={s.head}>
          <span className="eyebrow">Docs</span>
          <h1 className="h1">Using Oriel</h1>
          <p className="lead">Everything you need to go from a sentence to a live site, and keep improving it.</p>
        </header>
        <div className={s.docs}>
          <nav className={s.toc} aria-label="On this page">
            {TOC.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
          <div className={s.doc}>
            <section id="start">
              <h2>Getting started</h2>
              <ol>
                <li><Link href="/login">Sign in</Link> with your wallet, email, or Google. If you sign in without a wallet, Oriel creates one for you.</li>
                <li>On the Free plan, your first sign-in with a wallet unlocks 60 free credits a month. Signing in only signs a message, with no transaction and no gas fee.</li>
                <li>Describe what you want in the workspace. Oriel creates a project with its own subdomain and starts building.</li>
                <li>Watch the preview update as it works, then ask for changes in the same chat.</li>
                <li>Press <b>Publish</b> when you&rsquo;re happy with it.</li>
              </ol>
            </section>

            <section id="prompts">
              <h2>Writing good prompts</h2>
              <p>Oriel works best when it knows who the site is for, what goes on it, and how it should feel. One clear paragraph beats a list of keywords.</p>
              <div className={s.example}>A one-page site for my ceramics studio in Lisbon. Warm and minimal, off-white background, a serif headline. Sections: a short story about the studio, a 9-piece gallery, opening hours, and a contact form.</div>
              <h3>Tips</h3>
              <ul>
                <li>Start with the whole page, then refine one thing per message: &ldquo;make the headline larger&rdquo;, &ldquo;add a pricing section&rdquo;.</li>
                <li>Name real content (prices, hours, product names) so the agent doesn&rsquo;t invent it.</li>
                <li>Point to what you see: &ldquo;the second button in the hero&rdquo;, &ldquo;the footer on mobile&rdquo;.</li>
                <li>If a change goes the wrong way, say so directly, or roll back to an earlier version.</li>
              </ul>
            </section>

            <section id="attachments">
              <h2>Attachments</h2>
              <p>You can attach images and text files to a message: a logo, product photos, a screenshot of a design you like, or copy you&rsquo;ve already written.</p>
              <p>Attached files are saved into the project, so the agent can place images on the page and use your text as it is. Tell it what each file is for, for example &ldquo;use the attached logo in the header&rdquo;.</p>
            </section>

            <section id="publishing">
              <h2>Publishing and versions</h2>
              <p>The preview shows your latest changes privately. <b>Publish</b> takes a snapshot of the project as a new version and puts it live at <code>your-project.buildoriel.com</code>. Every site is checked automatically before it goes live.</p>
              <p>Each publish is kept. Open the version history from the project menu in the workspace to see earlier versions and roll the live site back to any of them.</p>
              <h3>Downloading and deleting</h3>
              <p>Download any project as a ZIP from the project menu, on every plan. Deleting a project takes its site offline, releases its subdomain, and frees up a project slot on your plan.</p>
            </section>

            <section id="domains">
              <h2>Custom domains</h2>
              <p>Pro includes 1 custom domain and Studio includes unlimited domains. To add one:</p>
              <ol>
                <li>Open <Link href="/connectors">Connectors &amp; domains</Link> and add the domain to a project.</li>
                <li>At your DNS provider, create the CNAME record shown on that page.</li>
                <li>Press <b>Check</b>. Once DNS is found, HTTPS is set up automatically and the domain becomes active.</li>
              </ol>
              <p>On Studio with Cloudflare connected, Oriel creates the DNS record for you. You must own or control any domain you connect.</p>
            </section>

            <section id="connectors">
              <h2>Connectors</h2>
              <p>Connect your own accounts to take your work further:</p>
              <ul>
                <li><b>GitHub</b> (Builder and up): push the project to a repository.</li>
                <li><b>Vercel</b> and <b>Netlify</b> (Pro and up): deploy to your own hosting.</li>
                <li><b>Supabase</b> (Pro and up): give a project a real database.</li>
                <li><b>Google Drive</b> (Pro and up): bring in files from your Drive.</li>
                <li><b>Cloudflare</b> (Studio): manage DNS for custom domains.</li>
              </ul>
              <p>Tokens are stored encrypted and used only for actions you start. Large actions, such as pushing code, deploying, or changing a database, always ask you to confirm first.</p>
            </section>

            <section id="teams">
              <h2>Team projects</h2>
              <p>On Studio, you can invite people to a project as editors from the project menu. They see the project in their sidebar and can chat, preview, publish, and download.</p>
              <p>Members use their own credits and their own plan&rsquo;s models. Only the owner can rename the project, connect domains and services, sell it as a template, manage members, or delete it. One build runs on a project at a time.</p>
            </section>

            <section id="credits">
              <h2>Credits</h2>
              <p>One credit covers $0.01 of AI cost, and each request is charged by what it actually cost. Before you send, the composer shows a rough estimate. Small edits usually cost a few credits, and full builds cost more.</p>
              <p>Monthly credits expire at the end of their period, while top-up credits never expire. You can see every charge in your Account under Credit history. Compare plans and top-up packs on <Link href="/tiers">Plans &amp; credits</Link>, or stake $ORIEL instead of paying monthly on the <Link href="/stake">Stake</Link> page.</p>
            </section>

            <section id="shortcuts">
              <h2>Shortcuts and settings</h2>
              <ul>
                <li><code>⌘ K</code> (or <code>Ctrl K</code>) opens the command palette, where you can search your projects and jump anywhere.</li>
                <li><code>Enter</code> sends a message, and <code>Shift Enter</code> adds a new line.</li>
                <li>Choose a light, dark, or system theme.</li>
                <li>Under Account, then Email notifications, choose whether to get an email when a long build finishes and when your credits run low.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
