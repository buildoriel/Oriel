# Oriel operations

Setup, deployment and the monthly runbook. For an overview of the project, see the [README](../README.md).

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
npm install                     # .npmrc sets legacy-peer-deps (Privy's optional peers)
cp .env.example .env.local      # minimum: Supabase, OPENROUTER_API_KEY, PREVIEW_SIGNING_SECRET
for t in scripts/*.test.ts; do npx tsx "$t"; done
npm run dev
```
Without `NEXT_PUBLIC_PRIVY_APP_ID` the login page falls back to an email link, which is handy for local development.
Local subdomains: `http://projectname.localhost:3000`. Previews: set `PREVIEW_ORIGIN=http://preview.localhost:3000`.

### 2. Supabase
1. Create a new project and copy the URL, anon key, and service role key into the env.
2. `supabase link --project-ref <ref>` then `supabase db push` (runs every file in `supabase/migrations/`, currently `0001` through `0009`).
3. Authentication → URL Configuration: Site URL `https://buildoriel.com`, Redirect URLs `https://buildoriel.com/auth/callback` and `http://localhost:3000/auth/callback`.
4. Sign-in goes through Privy (next section), so no Supabase social providers are needed.
5. `npm run db:types` regenerates `lib/database.types.ts` after any schema change (commit the result).

### 2b. Sign-in (Privy)
People sign in with Privy (wallet, email or Google). `/api/auth/privy` verifies the Privy identity token (ES256, Privy JWKS or `PRIVY_VERIFICATION_KEY`) and starts a normal Supabase session, so RLS and `requireUser()` work unchanged. Accounts match by Privy id, then by verified email; wallet-only accounts get a placeholder `@users.buildoriel.com` address that never receives mail. A signed-in wallet is linked to the account and unlocks the Free credits once.

In the Privy dashboard: enable Wallet, Email and Google; add `https://buildoriel.com` to the allowed domains; turn on **Return user data in an identity token**; enable Ethereum embedded wallets for users without a wallet. Then set `NEXT_PUBLIC_PRIVY_APP_ID`.

### 2c. Email
Notifications (build finished, low credits) are sent through Resend when `RESEND_API_KEY` is set; add the domain in Resend and create its DNS records first. Incoming mail for `@buildoriel.com` is forwarded by ImprovMX (MX + SPF records on the apex).

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
**From the browser (no tooling):** sign in and open `/admin/deploy`. Connect a wallet with some ETH on Robinhood Chain, enter the $ORIEL, USDG and treasury addresses (each is checked on-chain), then deploy `OrielStaking` and `RevenueDistributor`. The page reads each contract back after deploying and gives you the env block to paste into Vercel. The bytecode comes from `lib/contracts/artifacts.json`; rebuild it after changing a contract with `npx tsx scripts/compile-contracts.ts` (solc 0.8.24, optimizer 200 runs, EVM `paris`). `scripts/contracts.test.ts` runs both contracts in an in-memory EVM.

**With Foundry:**
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
| GitHub | GitHub App (not an OAuth App), enable "Request user authorization (OAuth) during installation", turn off the webhook, install on "Any account", generate a private key (GitHub requires one before installs), set `GITHUB_APP_SLUG` | Repository: Contents RW, Administration RW (to create repos), install with "Only select repositories" |
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

## Agent job queue
A chat message is queued (`agent_runs`, phase `queued`) and the API returns immediately with a run id; the workspace polls `/api/jobs/<id>` for progress. A worker (`POST /api/jobs/work`, authenticated with `CRON_SECRET`) claims the run with a lease, runs agent steps for up to `AGENT_SLICE_SECONDS`, saves the agent state and files, charges credits for that slice, then hands off to a fresh invocation. Long builds therefore are not limited by the 300-second function limit, and closing the tab does not stop them.

- Failure handling: a failed slice retries after 60 seconds (up to 6 attempts); a dead worker's lease expires and `/api/cron/jobs` (every minute) restarts it. Files written before the failure are kept.
- At most `AGENT_MAX_CONCURRENCY` builds run at once; the rest wait and the workspace shows their place in the queue.
- Stop: the build finishes its current step, saves, and charges only for work done.
- The every-minute cron needs Vercel Pro. On another host, call `GET /api/cron/jobs` with `Authorization: Bearer $CRON_SECRET` every minute.

## Pre-publish safety scan
Every publish runs `lib/moderation/scan.ts` on the project files:
- **Blocks** publishing (findings shown to the owner): seed phrase or private key fields, crypto miners, passwords sent to Telegram/Discord/Slack bots, and links listed by Google Safe Browsing (when `GOOGLE_SAFE_BROWSING_KEY` is set; fails open if Google is unreachable).
- **Allows but reports** (an `auto_scan` abuse report for moderators): brand-name login pages, password forms posting off-site, wallet drainer patterns (unlimited approvals, `setApprovalForAll`, Permit signatures, `eth_sign`), obfuscated scripts, silent redirects, hidden iframes.

Rules are in one file and covered by `scripts/scan.test.ts` (including legitimate pages that must not be flagged). Tune them as real reports come in.

## Abuse reports and takedowns
Anyone can report a hosted site at `/report` (linked in the footer and on suspended pages). Review and act with:
```bash
npx tsx --env-file=.env.local scripts/moderation.ts                          # open reports, grouped by site
npx tsx --env-file=.env.local scripts/moderation.ts suspend <slug> "<reason>"  # 451 on all its domains, no republish, owner notified
npx tsx --env-file=.env.local scripts/moderation.ts restore <slug>
npx tsx --env-file=.env.local scripts/moderation.ts dismiss <report_id>
```
Check open reports daily: phishing on `*.buildoriel.com` can get the whole domain blocklisted by browsers and email providers.

## Credit & tier rules (summary)
- Free: 60 credits/month, unlocked by the first sign-in with a wallet (or by verifying a wallet on `/account`; signing a message, no gas). One wallet per account.
- Purchased tier: valid for 30 days from payment; its credits are granted at payment and are not reset on the 1st while the period is active.
- Stake tier: evaluated on the 1st (7-day TWAP, 10% buffer, 1-month grace period). Before the token launches, or when there are too few price samples, the last stake tier is kept and revenue share is held; credit refills still run.
- Paying with $ORIEL: the token amount comes from `/api/credits/quote` (the lower of spot and TWAP, + 3%). Overpayment comes back as top-up credits; underpayment (price drop) is converted into top-up credits, so user funds are never lost.
- One running build per user (`agent_runs` table), at most `AGENT_RUNS_PER_HOUR` per hour.

## Open items
- Buying domains inside the app and the free yearly domain for Studio: needs a registrar reseller account; the `free_domain_per_year` flag already exists in the tiers table.
- Per-IP rate limiting for public endpoints (Vercel Firewall or Upstash recommended before launch). Per-account limits already exist.
- Image moderation for generated or uploaded images (the scan covers code and text only).
- Legal review of `/terms` and `/privacy`, plus the operating entity and governing law, before launch.
- Token launch: payments, staking and revenue share stay off ("Payments open soon") until the $ORIEL, USDG, treasury, pool and contract addresses are set.

## Numbers to recompute after beta
Everything in `lib/config.ts` and the `tiers` table: model prices (`lib/agent/models.ts` — placeholders, verify at docs.claude.com), per-action credit caps (`KIND_LIMITS`), tier credit quotas, economic percentages, royalties and referrals.
