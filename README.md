<p align="center">
  <a href="https://buildoriel.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="brand/oriel-lockup-dark.svg">
      <img src="brand/oriel-lockup-light.svg" alt="Oriel" height="56">
    </picture>
  </a>
</p>

<h3 align="center">Build anything. Own a piece of it.</h3>

<p align="center">
  The AI workspace that builds and hosts your sites, designs and documents, on Robinhood Chain.
  <br>
  <a href="https://buildoriel.com"><strong>buildoriel.com</strong></a>
  ·
  <a href="https://buildoriel.com/docs">Docs</a>
  ·
  <a href="https://buildoriel.com/faq">FAQ</a>
  ·
  <a href="https://buildoriel.com/changelog">Changelog</a>
  ·
  <a href="https://x.com/buildoriel">X</a>
</p>

---

## What is Oriel?

Describe what you want in plain words. Oriel's agent plans it, writes it, checks it, and shows a live preview while it works. Publish with one click and it's live at `your-project.buildoriel.com`, or on your own domain. Keep improving it by chatting, the same way you started.

Instead of a subscription, you can **stake $ORIEL** worth a plan and use its credits every month. Stakers also receive a share of the margin in USDG, and can unstake any time.

## Features

**Build**
- **Chat to build:** websites, interactive tools, dashboards, designs (logos, posters, mockups) and documents (proposals, decks, spreadsheets).
- **Right model for each request:** a fast router picks between Claude models by task and plan, with prompt caching to keep costs down.
- **Attachments:** drop in logos, photos, screenshots or text files; the agent can see images.
- **Credit estimate** before you send, and you're charged only for actual usage.
- **Durable builds:** long builds run in a background queue and survive closed tabs and time limits.

**Ship**
- **Instant hosting** on a subdomain, plus custom domains with automatic HTTPS.
- **Version history and rollback**, unpublish, ZIP download.
- **Pre-publish safety scan** that blocks seed-phrase capture, credential theft and crypto miners, and flags suspected phishing for review.
- **Connectors:** GitHub, Vercel, Netlify, Supabase, Google Drive and Cloudflare DNS.

**Work together**
- **Team projects** on Studio: invite editors by email, @handle or wallet.
- **Templates marketplace:** sell a project as a template and earn a USDG royalty every time it's used.
- **Referrals:** earn credits when someone you invite makes their first purchase.

**Own it**
- **Sign in with a wallet**, email or Google (Privy); Oriel creates a wallet for people who don't have one.
- **Pay with USDG or $ORIEL**, or **stake** instead of subscribing.
- **Revenue share** for stakers, claimed on-chain from a Merkle distributor.

**Feel at home**
- A calm, focused workspace with a sidebar, **⌘K command palette**, keyboard shortcuts, and light, dark or system themes.

## How it works

```
buildoriel.com ──────────► Next.js on Vercel ──► Supabase (Postgres + RLS, Storage)
<slug>.buildoriel.com ───► middleware → published version in Storage
your-domain.com ─────────► middleware → same site, via CNAME
preview.buildoriel.com ──► private drafts (signed, sandboxed origin)

Chat ──► job queue (Postgres) ──► agent loop ──► Claude via OpenRouter
                                       └──► writes files, checks them, charges credits per step

Robinhood Chain ◄── payment verification · staking reads · $ORIEL price (hourly TWAP)
```

Every credit change goes through atomic Postgres functions and is recorded in a ledger. Monthly credits are spent first; top-ups never expire.

## Tech stack

| Area | Built with |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Data | Supabase: Postgres with row-level security, Storage, Auth sessions |
| Sign-in | Privy (wallet, email, Google, embedded wallets), bridged to Supabase sessions |
| AI | Claude models through OpenRouter (or the Anthropic API directly) |
| Chain | Robinhood Chain (EVM, chain ID 4663), viem, Solidity contracts built with Foundry |
| Hosting | Vercel (wildcard domains, crons, Analytics, Speed Insights) |
| Email | Resend |

## Repository layout

```
app/
  (site)/          public pages: home, login, docs, FAQ, changelog, legal, report
  (app)/           the product: workspace, templates, connectors, plans, stake, account
  api/             route handlers: chat, jobs, publishing, payments, staking, connectors
  site-host/       serves published sites and custom domains
components/        shell, workspace UI, design system pieces
lib/
  agent/           router, agent loop, tools, job queue, estimates
  llm/             OpenRouter / Anthropic adapter
  hosting/         publishing, versions, storage
  moderation/      pre-publish safety scan
  staking/, economics.ts   price, TWAP, tiers, monthly economics
  connectors/      OAuth connectors and token encryption
contracts/         OrielStaking.sol, RevenueDistributor.sol (Foundry)
supabase/          SQL migrations (schema, RLS, credit functions)
scripts/           tests and operator scripts (payouts, moderation, showcase)
brand/             logo files
docs/              operations guide
```

## Getting started

Requirements: Node 20+, a Supabase project, and an OpenRouter API key.

```bash
git clone https://github.com/buildoriel/Oriel.git
cd Oriel
npm install
cp .env.example .env.local   # fill in Supabase, OpenRouter and PREVIEW_SIGNING_SECRET at minimum
npm run dev
```

Open http://localhost:3000. Projects are served at `http://<slug>.localhost:3000`. Without a Privy app id, the login page falls back to an email link for local development.

Run the checks:

```bash
npm run typecheck
for t in scripts/*.test.ts; do npx tsx "$t"; done
```

Smart contracts:

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 foundry-rs/forge-std --no-git
forge test
```

Full setup (Supabase, Privy, Vercel and DNS, connectors, contracts) and the monthly runbook are in **[docs/OPERATIONS.md](docs/OPERATIONS.md)**.

## Security

Found a vulnerability? Please email **support@buildoriel.com** instead of opening a public issue. To report an abusive site hosted on Oriel, use [buildoriel.com/report](https://buildoriel.com/report).

The staking contract has no owner, pause or upgrade path, so unstaking always works. The contracts have not been audited yet.

## License

No open-source license has been chosen yet, so all rights are reserved.
