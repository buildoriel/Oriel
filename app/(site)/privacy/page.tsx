import { CONTACT_EMAIL, LegalPage } from "@/components/Legal";

export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>This policy explains what Oriel (&ldquo;we&rdquo;) collects when you use buildoriel.com and the sites hosted on it, why we collect it, and the choices you have.</p>

      <h3>What we collect</h3>
      <ul>
        <li><b>Account data:</b> you sign in through Privy with a wallet, an email address, or Google. We receive your Privy user id, your email address if you used one (or the email of your Google account), and your wallet address. If you sign in without a wallet, Privy creates one for you; Oriel never sees its private key.</li>
        <li><b>Wallet data:</b> the public wallet address linked to your account (by signing in with it or signing a message), and the on-chain transactions you send to Oriel (payments, staking, claims). Blockchain data is public by nature.</li>
        <li><b>Project data:</b> your chat messages with the agent, the files you attach (images and text files), the files the agent creates, every published version, and the sites you publish. Members you add to a team project can see and change that project; the project owner can see members&rsquo; email addresses.</li>
        <li><b>Usage data:</b> credit balance and history, AI usage per request (model, token counts, cost), and basic server logs. We use Vercel Web Analytics and Speed Insights (cookieless, aggregate page views and performance) and keep error reports (message, page, browser) to fix bugs.</li>
        <li><b>Connector data:</b> when you connect GitHub, Vercel, Netlify, Supabase, Google Drive, or Cloudflare, we store access tokens encrypted (AES-256-GCM) and use them only for the actions you start.</li>
        <li><b>Abuse reports:</b> the report you submit, an optional email, and a salted hash of your IP address used only to limit spam.</li>
      </ul>

      <h3>How we use it</h3>
      <ul>
        <li>To run the service: build and host your projects, charge and refill credits, evaluate tiers, and pay revenue share and creator royalties.</li>
        <li>To email you about your account: when a long build finishes and when your credits run low. You can turn these off on your Account page.</li>
        <li>To prevent abuse: one wallet per Free account, rate limits, and reviewing reported sites.</li>
        <li>To improve Oriel using aggregate usage numbers. We do not sell your personal data and we do not use it for advertising.</li>
      </ul>

      <h3>AI processing</h3>
      <p>Your requests and project files are sent to our AI providers (Anthropic models, accessed directly or through OpenRouter, and an image generation provider when images are created) to produce results. They process this data on our behalf under their own terms.</p>

      <h3>Who we share data with</h3>
      <p>Only the service providers we need to operate: Privy (sign-in and wallets), Supabase (database, sessions, storage), Vercel (application and site hosting, domains, analytics), our AI providers, Resend (account emails), ImprovMX (forwarding mail sent to our addresses), Alchemy (blockchain access), and the third-party services you choose to connect. We may disclose data if the law requires it or to protect users from harm.</p>

      <h3>Cookies</h3>
      <p>We use essential cookies and browser storage only: your sign-in session (Oriel and Privy), a 10-minute cookie that protects connector sign-ins, a 30-day cookie that remembers a referral link you followed, and your light or dark theme choice. No advertising or cross-site tracking cookies.</p>

      <h3>Retention and deletion</h3>
      <p>We keep your data while your account is active. You can delete a project from its menu, which takes its site offline and removes its files, and disconnect connectors at any time, which deletes their tokens. To delete your whole account, email us. Payment and credit records may be kept as long as needed for accounting. Data already written to a public blockchain cannot be deleted.</p>

      <h3>Your rights</h3>
      <p>Depending on where you live, you may have the right to access, correct, export, or delete your personal data, and to object to some processing. Email us and we will respond within 30 days.</p>

      <h3>Children</h3>
      <p>Oriel is not for anyone under 18.</p>

      <h3>Changes</h3>
      <p>If we change this policy in a meaningful way, we will notify you in the app before the change takes effect.</p>

      <h3>Contact</h3>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </LegalPage>
  );
}
