# Oriel

**Build anything. Own a piece of it.** — AI workspace: user menjelaskan lewat chat, agent membangun, hasilnya langsung live di `namaproyek.buildoriel.com`. Bayar dengan kredit (USDG / $ORIEL di Robinhood Chain) atau stake $ORIEL sebagai pengganti langganan.

## Isi repo

| Folder | Isi |
|---|---|
| `brand/` | Logo final: ikon terang/gelap, lockup ikon + wordmark (wordmark sudah dikonversi ke path, tidak butuh font), ikon app, favicon 16/32/48/180/512 + `.ico` |
| `design/mockups/index.html` | Mockup 6 halaman (Home, Workspace, Tiers & Credits, Stake, Templates, Connectors & Domains). Buka di browser; perkecil jendela untuk tampilan HP |
| `app/`, `components/`, `lib/` | Aplikasi Next.js 15 (App Router) |
| `lib/llm/` | Adapter provider AI: OpenRouter (default) atau Anthropic langsung, dipilih lewat `LLM_PROVIDER` |
| `lib/agent/` | Router Haiku, pemilihan model per tier, agent loop + tools, prompt caching, pemotongan kredit |
| `lib/hosting/`, `app/site-host/`, `middleware.ts` | Hosting subdomain, custom domain, preview draf |
| `lib/staking/`, `lib/economics.ts` | Harga pool, TWAP 7 hari, evaluasi tier (buffer 10%, tenggang 1 bulan), anggaran staker 40%, bagi hasil 50/30/20, Merkle |
| `lib/connectors/` | OAuth GitHub/Vercel/Netlify/Supabase/Google Drive, token Cloudflare, enkripsi AES-256-GCM |
| `supabase/migrations/` | Skema lengkap + RLS + fungsi kredit atomik + bucket storage |
| `contracts/` | Foundry: `OrielStaking.sol`, `RevenueDistributor.sol`, tes, skrip deploy |
| `scripts/` | Tes ekonomi, pembuat calldata epoch bagi hasil |

## Arsitektur singkat

```
buildoriel.com ───────────► Next.js (Vercel) ──► Supabase (Postgres, Auth, Storage)
<slug>.buildoriel.com ────► middleware → /site-host/s/<slug> → Storage sites/<id>/v<N>/
domain-user.com (CNAME) ──► middleware → /site-host/d/<host>
preview.buildoriel.com ───► draf proyek (token bertanda tangan, origin terpisah, iframe sandbox)
OpenRouter / Claude API ◄── lib/llm ◄── agent loop (router Haiku 5.5 → model sesuai tier, prompt caching)
Robinhood Chain ◄── verifikasi pembayaran, baca stakedOf, harga pool Pons (cron per jam)
```

Aturan kredit: semua perubahan saldo lewat fungsi Postgres `spend_credits` / `grant_credits` (atomik, row lock, tercatat di `credit_ledger`). Kredit bulanan dipakai lebih dulu, top-up tidak hangus.

## Setup dari nol

### 0. Prasyarat
Node 20+, [Supabase CLI](https://supabase.com/docs/guides/cli), [Foundry](https://book.getfoundry.sh), akun Vercel (plan Pro: dibutuhkan untuk durasi fungsi agent yang panjang dan wildcard domain), domain `buildoriel.com`.

### 1. Lokal
```bash
npm install
cp .env.example .env.local      # isi minimal: Supabase, OPENROUTER_API_KEY, PREVIEW_SIGNING_SECRET
npx tsx scripts/economics.test.ts
npx tsx scripts/llm-adapter.test.ts
npm run dev
```
Subdomain di lokal: `http://namaproyek.localhost:3000`. Preview: set `PREVIEW_ORIGIN=http://preview.localhost:3000`.

### 2. Supabase
1. Buat proyek baru, salin URL, anon key, service role key ke env.
2. `supabase link --project-ref <ref>` lalu `supabase db push` (menjalankan `0001_init.sql` dan `0002_storage.sql`).
3. Authentication → URL Configuration: Site URL `https://buildoriel.com`, Redirect URLs `https://buildoriel.com/auth/callback` dan `http://localhost:3000/auth/callback`.
4. (Opsional) aktifkan provider Google di Authentication → Providers.
5. `npm run db:types` untuk tipe TypeScript dari skema.

### 3. Vercel + DNS
1. Import repo ke Vercel, isi semua env dari `.env.example`.
2. Pindahkan nameserver `buildoriel.com` ke Vercel (wajib untuk sertifikat wildcard).
3. Project → Domains, tambahkan: `buildoriel.com`, `www.buildoriel.com`, `*.buildoriel.com`, `sites.buildoriel.com`, `preview.buildoriel.com`.
4. Isi `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (dipakai untuk menambahkan custom domain user dan HTTPS otomatis).
5. Cron di `vercel.json` aktif otomatis: harga pool per jam, cek domain tiap 15 menit, job bulanan tanggal 1 pukul 00:05 UTC. Isi `CRON_SECRET`.

### 3b. Provider AI
Default `LLM_PROVIDER=openrouter`. Buat API key di openrouter.ai, lalu cek di openrouter.ai/models bahwa slug keempat model Claude sesuai `DEFAULT_MODEL_MAP` di `lib/llm/index.ts` (timpa lewat `OPENROUTER_MODEL_MAP` bila beda). Pastikan Fable 5.1 tersedia sebelum menjual tier Studio.

Permintaan dikunci ke provider Anthropic tanpa fallback (`OPENROUTER_PROVIDER_ORDER=anthropic`): kalau dialihkan ke provider lain, prompt cache tidak kena dan biaya naik. Konsekuensinya, saat Anthropic di OpenRouter gangguan, build ikut gagal alih-alih pindah diam-diam.

Biaya tetap dihitung dari jumlah token dan tabel harga di `lib/agent/models.ts`. Biaya pembelian kredit OpenRouter tidak ikut terhitung di sana, jadi masukkan ke harga model atau anggap pengurang margin. Untuk pindah ke Claude API langsung cukup set `LLM_PROVIDER=anthropic` dan isi `ANTHROPIC_API_KEY`.

### 4. Kontrak (Robinhood Chain)
```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 foundry-rs/forge-std --no-git
forge test
export RH_RPC_URL=... PRIVATE_KEY=... ORIEL_TOKEN_ADDRESS=... USDG_TOKEN_ADDRESS=... DISTRIBUTOR_OWNER=<multisig>
forge script script/Deploy.s.sol --rpc-url robinhood --broadcast
```
Salin alamat hasil deploy ke `STAKING_CONTRACT_ADDRESS` dan `REVSHARE_DISTRIBUTOR_ADDRESS` (dan versi `NEXT_PUBLIC_`). `OrielStaking` tidak punya owner, pause, atau upgrade: unstake selalu bisa. Minta audit sebelum menerima dana besar.

### 4b. RPC Robinhood Chain
Mainnet memakai chain ID 4663. Server memakai RPC Alchemy di `RH_RPC_URL` (berisi API key, hanya di server). Browser dan wallet user memakai RPC publik resmi di `NEXT_PUBLIC_RH_RPC_URL`, karena URL itu ikut tersimpan di wallet user dan terlihat di kode browser. Cek koneksi:
```bash
npx tsx --env-file=.env.local scripts/check-rpc.ts
```
Di dashboard Alchemy, batasi API key ke domain `buildoriel.com` dan IP server, lalu pasang alert pemakaian.

### 5. Harga & TWAP
Isi `ORIEL_POOL_ADDRESS` dan `POOL_TYPE` sesuai pool $ORIEL di Pons. **Cek antarmuka pool Pons**: `lib/staking/price.ts` mendukung pool gaya Uniswap V2 (`getReserves`) dan V3 (`slot0`); kalau Pons memakai bonding curve atau antarmuka lain, ubah `readSpotPriceUsd()`. Tier baru dievaluasi setelah tersedia minimal 70% sampel per jam selama 7 hari.

### 6. Konektor OAuth
Daftarkan aplikasi di tiap penyedia dengan redirect `https://buildoriel.com/api/connectors/<provider>/callback`:

| Penyedia | Cara | Izin minimal |
|---|---|---|
| GitHub | GitHub App (bukan OAuth App), aktifkan "Request user authorization (OAuth) during installation" | Repository: Contents RW, Administration RW (untuk membuat repo), install "Only select repositories" |
| Vercel | Integration (Console → Integrations), isi `VERCEL_INTEGRATION_SLUG` | Deployments |
| Netlify | OAuth application di User settings → Applications | default |
| Supabase | OAuth App di dashboard organisasi | Projects read |
| Google Drive | Google Cloud OAuth client (Web) | `drive.file` saja |
| Cloudflare | Tanpa OAuth: user menempel API Token | `Zone:DNS:Edit` untuk zona tertentu |

Isi `CONNECTOR_ENCRYPTION_KEY` (`openssl rand -base64 32`). Jangan pernah mengganti kunci ini setelah ada token tersimpan.

## Runbook bulanan (tanggal 1)
1. Cron `/api/cron/monthly` menghitung margin bulan lalu, mengevaluasi tier stake, mengisi ulang kredit, membuat alokasi bagi hasil + Merkle root, dan mencatat rencana buyback. Idempoten per periode.
2. `npx tsx --env-file=.env.local scripts/epoch-calldata.ts 2026-10-01` → menghasilkan calldata `approve` + `createEpoch`. Eksekusi dari multisig yang memegang USDG.
3. Buyback: lihat tabel `buybacks` (status `planned`), eksekusi swap USDG→$ORIEL dari multisig di Pons dengan batas slippage, lalu isi `tx_hash` dan status `executed`. Sengaja tidak otomatis: swap otomatis di pool tipis mudah dimanipulasi.
4. Royalti kreator: jumlahkan `template_uses.royalty_usd` per kreator, bayar USDG, catat di `creator_payouts`.

## Yang sudah jalan vs yang masih perlu dikerjakan
Sudah: semua yang tercantum di tabel atas, lolos `tsc`, `next build`, tes ekonomi, dan 4 tes Foundry.

Belum (sengaja, sesuai roadmap atau butuh keputusanmu):
- Beli domain di dalam app (API registrar) — Fase 3, belum dibuat.
- Domain gratis per tahun untuk Studio — butuh registrar; flag `free_domain_per_year` sudah ada di tabel tier.
- Gambar raster — butuh provider image generation lain; agent saat ini memakai SVG/CSS dan slot gambar.
- Bayar dengan $ORIEL di UI — server sudah menerima (`token: "ORIEL"`, dinilai min(spot, TWAP)); tombol UI baru USDG.
- Rate limiting per IP/akun dan antrean job agent (disarankan Upstash/Redis sebelum publik).
- Halaman klaim bagi hasil (data proof sudah tersimpan di `revshare_allocations.proof`).
- Moderasi konten situs user dan alur laporan penyalahgunaan (phishing di subdomain akan merusak reputasi domain).

## Angka yang harus dihitung ulang setelah beta
Semua di `lib/config.ts` dan tabel `tiers`: harga model (`lib/agent/models.ts` — placeholder, verifikasi di docs.claude.com), plafon kredit per aksi (`KIND_LIMITS`), kuota kredit tier, persentase ekonomi, royalti dan referral.
