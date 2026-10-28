# Oriel

**Build anything. Own a piece of it.** — An AI workspace: people describe what they want in chat, the agent builds it, and the result goes live right away at `projectname.buildoriel.com`. Pay with credits (USDG / $ORIEL on Robinhood Chain) or stake $ORIEL instead of subscribing.

## What's in the repo

| Folder | Contents |
|---|---|
| `brand/` | Final logo: light/dark icon, icon + wordmark lockup (wordmark converted to paths, no font needed), app icon, favicons 16/32/48/180/512 + `.ico` |
| `design/mockups/index.html` | Mockups of the 6 pages (Home, Workspace, Tiers & Credits, Stake, Templates, Connectors & Domains). Open in a browser; shrink the window for the mobile view |
| `app/`, `components/`, `lib/` | Next.js 15 app (App Router) |
| `lib/llm/` | AI provider adapter: OpenRouter (default) or Anthropic directly, chosen with `LLM_PROVIDER` |
| `lib/agent/` | Haiku router, per-tier model selection, agent loop + tools, prompt caching, credit charging, raster images (`generate_image`), GitHub auto-commit |
| `lib/hosting/`, `app/site-host/`, `middleware.ts` | Subdomain hosting, custom domains, draft previews |
| `lib/staking/`, `lib/economics.ts` | Pool price, 7-day TWAP, tier evaluation (10% buffer, 1-month grace period), 40% staker budget, 50/30/20 revenue split, Merkle |
| `lib/connectors/` | OAuth for GitHub/Vercel/Netlify/Supabase/Google Drive, Cloudflare token, AES-256-GCM encryption |
| `supabase/migrations/` | Full schema + RLS + atomic credit functions + storage bucket |
| `contracts/` | Foundry: `OrielStaking.sol`, `RevenueDistributor.sol`, tests, deploy script |
| `app/account/` | Account page: wallet verification (activates the 60 Free credits), balance + history, referrals, notifications, revenue share claims, handle |
| `scripts/` | Tests, revenue share epoch calldata, creator royalty payouts, showcase curation |

## Architecture at a glance

```
buildoriel.com ───────────► Next.js (Vercel) ──► Supabase (Postgres, Auth, Storage)
<slug>.buildoriel.com ────► middleware → /site-host/s/<slug> → Storage sites/<id>/v<N>/
user-domain.com (CNAME) ──► middleware → /site-host/d/<host>
preview.buildoriel.com ───► project drafts (signed token, separate origin, sandboxed iframe)
OpenRouter / Claude API ◄── lib/llm ◄── agent loop (Haiku 5.5 router → tier-appropriate model, prompt caching)
Robinhood Chain ◄── payment verification, stakedOf reads, Pons pool price (hourly cron)
```

Credit rule: every balance change goes through the Postgres functions `spend_credits` / `grant_credits` (atomic, row lock, recorded in `credit_ledger`). Monthly credits are spent first; top-ups never expire.

## Setup from scratch

### 0. Prerequisites
Node 20+, [Supabase CLI](https://supabase.com/docs/guides/cli), [Foundry](https://book.getfoundry.sh), a Vercel account (Pro plan: needed for long agent function durations and wildcard domains), the `buildoriel.com` domain.

### 1. Local
```bash
npm install
cp .env.example .env.local      # minimum: Supabase, OPENROUTER_API_KEY, PREVIEW_SIGNING_SECRET
npx tsx scripts/economics.test.ts
npx tsx scripts/llm-adapter.test.ts
npx tsx scripts/agent-tools.test.ts
npx tsx scripts/hosting.test.ts
npm run dev
```
Local subdomains: `http://projectname.localhost:3000`. Previews: set `PREVIEW_ORIGIN=http://preview.localhost:3000`.

### 2. Supabase
1. Create a new project and copy the URL, anon key, and service role key into the env.
2. `supabase link --project-ref <ref>` then `supabase db push` (runs `0001_init.sql`, `0002_storage.sql`, `0003_fase1_lengkap.sql`).
3. Authentication → URL Configuration: Site URL `https://buildoriel.com`, Redirect URLs `https://buildoriel.com/auth/callback` and `http://localhost:3000/auth/callback`.
4. (Optional) enable the Google provider under Authentication → Providers.
5. `npm run db:types` to generate TypeScript types from the schema.

### 3. Vercel + DNS
1. Import the repo into Vercel and fill in every variable from `.env.example`.
2. Move the `buildoriel.com` nameservers to Vercel (required for the wildcard certificate).
3. Project → Domains, add: `buildoriel.com`, `www.buildoriel.com`, `*.buildoriel.com`, `sites.buildoriel.com`, `preview.buildoriel.com`.
4. Fill in `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (used to add users' custom domains and issue HTTPS automatically).
5. The crons in `vercel.json` run automatically: pool price every hour, domain checks every 15 minutes, the monthly job on the 1st at 00:05 UTC. Set `CRON_SECRET`.

### 3b. AI provider
Default is `LLM_PROVIDER=openrouter`. Create an API key at openrouter.ai, then check on openrouter.ai/models that the slugs of the four Claude models match `DEFAULT_MODEL_MAP` in `lib/llm/index.ts` (override with `OPENROUTER_MODEL_MAP` if they differ). Make sure Fable 5.1 is available before selling the Studio tier.

Requests are pinned to the Anthropic provider with no fallback (`OPENROUTER_PROVIDER_ORDER=anthropic`): if they were routed to another provider, the prompt cache would miss and costs would rise. The trade-off is that when Anthropic on OpenRouter has an outage, builds fail instead of silently switching.

Raster images: set `IMAGE_MODEL` to an image model slug on OpenRouter (e.g. `google/gemini-2.5-flash-image`). The agent can then call `generate_image` (max 4 per request); the cost is charged to the user's credits. Leave it empty to turn the feature off.

Costs are still computed from token counts and the price table in `lib/agent/models.ts`. OpenRouter's credit purchase fee is not included there, so either fold it into the model prices or treat it as a margin reduction. To switch to the Claude API directly, set `LLM_PROVIDER=anthropic` and fill in `ANTHROPIC_API_KEY`.

### 4. Contracts (Robinhood Chain)
```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 foundry-rs/forge-std --no-git
forge test
export RH_RPC_URL=... PRIVATE_KEY=... ORIEL_TOKEN_ADDRESS=... USDG_TOKEN_ADDRESS=... DISTRIBUTOR_OWNER=<multisig>
forge script script/Deploy.s.sol --rpc-url robinhood --broadcast
```
Copy the deployed addresses into `STAKING_CONTRACT_ADDRESS` and `REVSHARE_DISTRIBUTOR_ADDRESS` (and their `NEXT_PUBLIC_` versions). `OrielStaking` has no owner, pause, or upgrade path: unstaking always works. Get an audit before accepting significant funds.

### 4b. Robinhood Chain RPC
Mainnet uses chain ID 4663. The server uses the Alchemy RPC in `RH_RPC_URL` (it contains an API key, server only). Browsers and user wallets use the official public RPC in `NEXT_PUBLIC_RH_RPC_URL`, because that URL is saved in users' wallets and visible in browser code. Check the connection:
```bash
npx tsx --env-file=.env.local scripts/check-rpc.ts
```
In the Alchemy dashboard, restrict the API key to the `buildoriel.com` domain and the server IPs, and set up usage alerts.

### 5. Price & TWAP
Set `ORIEL_POOL_ADDRESS` and `POOL_TYPE` to match the $ORIEL pool on Pons. **Check the Pons pool interface**: `lib/staking/price.ts` supports Uniswap V2-style pools (`getReserves`) and V3-style pools (`slot0`); if Pons uses a bonding curve or another interface, change `readSpotPriceUsd()`. Tiers are only evaluated once at least 70% of hourly samples over 7 days are available.

### 6. OAuth connectors
Register an app with each provider using the redirect `https://buildoriel.com/api/connectors/<provider>/callback`:

| Provider | How | Minimum permissions |
|---|---|---|
| GitHub | GitHub App (not an OAuth App), enable "Request user authorization (OAuth) during installation" | Repository: Contents RW, Administration RW (to create repos), install with "Only select repositories" |
| Vercel | Integration (Console → Integrations), set `VERCEL_INTEGRATION_SLUG` | Deployments |
| Netlify | OAuth application under User settings → Applications | default |
| Supabase | OAuth App in the organization dashboard | Read projects + API keys (for the site's URL & anon key), write database (the "apply schema" button) |
| Google Drive | Google Cloud OAuth client (Web) | `drive.file` only |
| Cloudflare | No OAuth: the user pastes an API Token | `Zone:DNS:Edit` for specific zones |

Set `CONNECTOR_ENCRYPTION_KEY` (`openssl rand -base64 32`). Never change this key once tokens are stored.

## Monthly runbook (the 1st)
1. The `/api/cron/monthly` cron computes last month's margin, evaluates stake tiers, refills credits, builds the revenue share allocations + Merkle root, and records the planned buyback. Idempotent per period.
2. `npx tsx --env-file=.env.local scripts/epoch-calldata.ts 2026-10-01` → produces the `approve` + `createEpoch` calldata. Execute it from the multisig that holds the USDG.
3. Buyback: check the `buybacks` table (status `planned`), execute the USDG→$ORIEL swap on Pons from the multisig with a slippage limit, then fill in `tx_hash` and set the status to `executed`. Deliberately not automated: automatic swaps on a thin pool are easy to manipulate.
4. Creator royalties: `npx tsx --env-file=.env.local scripts/creator-payouts.ts` (preview + `USDG.transfer` calldata), then `--commit` to record `creator_payouts` (pending). After the multisig sends, run `--paid <payout_id> <tx_hash>`. Royalties below `PAYOUT_MIN_USD` or without a verified wallet are held until the next month.

## Showcase curation
Project owners opt in with the showcase checkbox in the workspace. The Oriel team then picks:
```bash
npx tsx --env-file=.env.local scripts/showcase.ts            # candidates (* = currently shown)
npx tsx --env-file=.env.local scripts/showcase.ts add <slug>
npx tsx --env-file=.env.local scripts/showcase.ts remove <slug>
```

## Credit & tier rules (summary)
- Free: 60 credits/month, active once the wallet is verified on the Account page (`/account`; signing a message, no gas). One wallet per account.
- Purchased tier: valid for 30 days from payment; its credits are granted at payment and are not reset on the 1st while the period is active.
- Stake tier: evaluated on the 1st (7-day TWAP, 10% buffer, 1-month grace period). Before the token launches, or when there are too few price samples, the last stake tier is kept and revenue share is held; credit refills still run.
- Paying with $ORIEL: the token amount comes from `/api/credits/quote` (the lower of spot and TWAP, + 3%). Overpayment comes back as top-up credits; underpayment (price drop) is converted into top-up credits, so user funds are never lost.
- One running build per user (`agent_runs` table), at most `AGENT_RUNS_PER_HOUR` per hour.

## What works vs. what's left
Done: everything listed in the table above; passes `tsc`, `next build`, the economics tests, AI adapter tests, agent tools tests, hosting tests, and SQL function tests (credits, agent lock, Free claim) against the Supabase database.

Not yet (intentional, per the roadmap or pending a decision):
- Buying domains inside the app and the free yearly domain for Studio — Phase 3, needs a registrar choice (e.g. Namecheap, Porkbun, Cloudflare Registrar) and a reseller account; the `free_domain_per_year` flag already exists in the tiers table.
- An agent job queue outside the request (the agent currently runs inside the SSE request, `maxDuration` 300 seconds max). For longer large projects, move it to a worker (e.g. Inngest/Trigger.dev/Upstash QStash).
- Per-IP rate limiting for public endpoints (Vercel Firewall or Upstash recommended before launch). Per-account limits already exist.
- Content moderation for user sites and an abuse report flow (phishing on subdomains would damage the domain's reputation).

## Numbers to recompute after beta
Everything in `lib/config.ts` and the `tiers` table: model prices (`lib/agent/models.ts` — placeholders, verify at docs.claude.com), per-action credit caps (`KIND_LIMITS`), tier credit quotas, economic percentages, royalties and referrals.
