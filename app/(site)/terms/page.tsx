import Link from "next/link";
import { CONTACT_EMAIL, LegalPage } from "@/components/Legal";

export const metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms govern your use of Oriel, the AI workspace at buildoriel.com, and the sites it hosts. By creating an account you agree to them.</p>

      <h3>1. Eligibility and accounts</h3>
      <p>You must be at least 18 and able to form a binding contract. You are responsible for your account and for what happens under it. Free credits are limited to one account per person and one verified wallet per account.</p>

      <h3>2. Credits and payments</h3>
      <ul>
        <li>Credits pay for AI usage and are deducted based on the actual cost of each request. Estimates shown in the app are approximate.</li>
        <li>Monthly credits (from Free, a purchased tier, or staking) expire at the end of their period. Top-up credits do not expire while your account is active.</li>
        <li>Payments are made on-chain in USDG or $ORIEL on Robinhood Chain and are final once confirmed. Credits have no cash value, cannot be transferred, and are not refundable except where the law requires.</li>
        <li>We may change prices, credit costs, and tier benefits for future periods with notice.</li>
      </ul>

      <h3>3. Staking, tiers, and revenue share</h3>
      <ul>
        <li>Staking deposits $ORIEL into a smart contract that has no owner and cannot be paused or upgraded; only your wallet can withdraw your stake, at any time. Tiers are evaluated monthly from the 7-day average price, as described on the Stake page.</li>
        <li>Revenue share depends on Oriel&rsquo;s actual margin each month and may be zero. It is not a promise of profit, interest, or return. Staker credits may be scaled down when demand exceeds the monthly budget.</li>
        <li>$ORIEL is not an investment product and nothing on Oriel is financial advice. Token prices can fall to zero. Smart contracts and blockchains carry technical risks, including bugs and network outages. You use them at your own risk.</li>
        <li>You are responsible for complying with the laws that apply to you, including tax laws. Do not use Oriel&rsquo;s crypto features where they are prohibited.</li>
      </ul>

      <h3>4. Your content</h3>
      <p>You own the projects you create, including the AI-generated files, to the extent the law allows. You give Oriel a license to store, process, host, and display your content as needed to run the service, and to show projects you opt into the showcase. If you sell a template, buyers get a license to use and modify it for their own projects.</p>

      <h3>5. Acceptable use</h3>
      <p>Do not use Oriel to build or host anything that:</p>
      <ul>
        <li>phishes, collects credentials or seed phrases, drains wallets, or distributes malware;</li>
        <li>scams, defrauds, or impersonates a person, company, or brand;</li>
        <li>is illegal, infringes others&rsquo; rights, or exploits minors;</li>
        <li>sends spam or abuses Oriel&rsquo;s infrastructure, rate limits, or free credits.</li>
      </ul>
      <p>We may remove content, suspend sites, or close accounts that break these rules, with or without notice. Anyone can <Link href="/report">report a site</Link>.</p>

      <h3>6. AI output</h3>
      <p>AI can make mistakes. Review what Oriel builds before you rely on it, especially code, legal or financial text, and anything you publish.</p>

      <h3>7. Connectors and third parties</h3>
      <p>When you connect GitHub, Vercel, Netlify, Supabase, Google Drive, or Cloudflare, those services&rsquo; own terms apply. Large actions such as pushing code, deploying, or running database changes only happen after you confirm them.</p>

      <h3>8. Custom domains</h3>
      <p>You must own or control any domain you connect. You are responsible for its DNS records and renewal.</p>

      <h3>9. Availability and changes</h3>
      <p>We work to keep Oriel running but do not guarantee it will be uninterrupted or error-free. We may change or discontinue features. Download your projects regularly; ZIP export is available on every tier.</p>

      <h3>10. Disclaimers and liability</h3>
      <p>Oriel is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent the law allows, Oriel is not liable for indirect or consequential damages, lost profits, lost data, or token losses, and our total liability is limited to the amount you paid us in the 3 months before the claim.</p>

      <h3>11. Termination</h3>
      <p>You can stop using Oriel at any time. We may suspend or end access for violations of these terms. Sections 3 through 10 survive termination.</p>

      <h3>12. Changes to these terms</h3>
      <p>We will notify you in the app before material changes take effect. Continuing to use Oriel after that means you accept the new terms.</p>

      <h3>Contact</h3>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </LegalPage>
  );
}
