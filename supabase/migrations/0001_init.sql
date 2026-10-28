-- =====================================================================
-- Oriel — skema awal (Fase 1 + tabel yang disiapkan untuk Fase 2/3)
-- Semua penulisan saldo kredit WAJIB lewat fungsi spend_credits/grant_credits.
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- TIER ----------
create table public.tiers (
  id text primary key check (id in ('free','builder','pro','studio')),
  rank int not null unique,
  monthly_credits int not null,
  price_usd numeric(12,2) not null,
  stake_usd numeric(12,2),                 -- null = tidak bisa via stake
  max_projects int,                        -- null = tanpa batas
  max_custom_domains int not null default 0, -- -1 = tanpa batas
  free_domain_per_year boolean not null default false,
  revshare_weight numeric(6,3) not null default 0,
  connectors text[] not null default '{}',
  model_edit text not null,
  model_build text not null,
  model_large text not null,
  premium_build_quota int not null default 0  -- jumlah build dengan model di atas default (Pro: Opus "sesekali")
);
insert into public.tiers values
 ('free',   0,    60,   0,  null,   1,  0, false, 0,     '{}',
   'claude-haiku-5-5','claude-haiku-5-5','claude-haiku-5-5', 0),
 ('builder',1,  1000,  20,   200,   5,  0, false, 1.0,   '{github}',
   'claude-haiku-5-5','claude-sonnet-5-5','claude-sonnet-5-5', 0),
 ('pro',    2,  2500,  50,   500,  20,  1, false, 1.25,  '{github,vercel,netlify,supabase,google_drive}',
   'claude-haiku-5-5','claude-sonnet-5-5','claude-opus-5-5', 2),
 ('studio', 3, 10000, 200,  2000, null, -1, true,  1.5,  '{github,vercel,netlify,supabase,google_drive,cloudflare}',
   'claude-haiku-5-5','claude-opus-5-5','claude-fable-5-1', 0);

-- ---------- PROFIL ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  wallet_address text unique check (wallet_address is null or wallet_address ~ '^0x[0-9a-f]{40}$'),
  wallet_verified_at timestamptz,
  referral_code text unique not null default substr(encode(extensions.gen_random_bytes(6),'hex'),1,8),
  referred_by uuid references public.profiles(id),
  purchased_tier text references public.tiers(id),
  purchased_tier_until timestamptz,
  staked_tier text not null default 'free' references public.tiers(id),
  grace_until timestamptz,                -- masa tenggang turun tier stake
  premium_builds_used int not null default 0,
  free_credits_claimed_at timestamptz,
  created_at timestamptz not null default now()
);

-- tier efektif = tertinggi antara tier dibeli (masih aktif) dan tier stake
create or replace function public.effective_tier(p_user uuid) returns text
language sql stable set search_path = public as $$
  select t.id from public.tiers t, public.profiles p
  where p.id = p_user and t.id in (
    p.staked_tier,
    case when p.purchased_tier_until > now() then p.purchased_tier else 'free' end)
  order by t.rank desc limit 1
$$;

create table public.wallet_nonces (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  nonce text not null,
  expires_at timestamptz not null
);

-- ---------- KREDIT ----------
-- monthly: diisi ulang tiap tanggal 1 (hangus di akhir bulan)
-- topup:   dibeli, tidak hangus
create table public.credit_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  monthly bigint not null default 0 check (monthly >= 0),
  topup bigint not null default 0 check (topup >= 0),
  updated_at timestamptz not null default now()
);

create type public.credit_reason as enum
 ('monthly_refill','topup','free_grant','ai_usage','template_use','referral_reward','refund','admin_adjust');

create table public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta bigint not null,
  bucket text not null check (bucket in ('monthly','topup')),
  reason public.credit_reason not null,
  ref_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.credit_ledger(user_id, created_at desc);

-- pembayaran on-chain (USDG / $ORIEL di Robinhood Chain)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  chain_id int not null,
  tx_hash text not null unique,
  token text not null check (token in ('USDG','ORIEL')),
  amount_raw numeric(78,0) not null,
  usd_value numeric(14,4) not null,
  kind text not null check (kind in ('topup','tier_month')),
  product text not null,            -- 'pack_500' | 'pack_2500' | 'pack_10000' | 'builder' | 'pro' | 'studio'
  credits bigint not null default 0,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);
create index on public.payments(user_id);
create index on public.payments(created_at);

-- biaya AI aktual (dasar perhitungan margin)
create table public.ai_usage (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id),
  project_id uuid,
  action_kind text not null check (action_kind in ('route','edit','build','large')),
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd numeric(12,6) not null,
  credits bigint not null,
  funded_by text not null default 'paid' check (funded_by in ('paid','staker','free')),
  created_at timestamptz not null default now()
);
create index on public.ai_usage(created_at);
create index on public.ai_usage(user_id);

-- ---------- PROYEK & HOSTING ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'),
  kind text not null default 'web',
  published_version int,
  template_id uuid,
  github_repo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.projects(owner_id);

-- slug yang tidak boleh dipakai (subdomain sistem)
create table public.reserved_slugs (slug text primary key);
insert into public.reserved_slugs values
 ('www'),('app'),('api'),('sites'),('admin'),('mail'),('docs'),('status'),('blog'),('cdn'),('static'),('oriel'),('help'),('support'),('preview');

create table public.project_files (
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null check (path !~ '\.\.' and path !~ '^/'),
  content text not null,
  updated_at timestamptz not null default now(),
  primary key (project_id, path)
);

create table public.project_versions (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  version int not null,
  file_count int not null,
  bytes bigint not null,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table public.messages (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  action_kind text,
  model text,
  credits bigint,
  created_at timestamptz not null default now()
);
create index on public.messages(project_id, id);

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  hostname text not null unique check (hostname ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  status text not null default 'pending' check (status in ('pending','dns_ok','active','failed')),
  last_error text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.domains(owner_id);
create index on public.domains(project_id);

-- ---------- KONEKTOR ----------
create table public.connectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('github','vercel','netlify','supabase','google_drive','cloudflare')),
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz,
  scopes text,
  account_label text,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- ---------- STAKING & EKONOMI ----------
create table public.price_samples (
  id bigserial primary key,
  sampled_at timestamptz not null default now(),
  price_usd numeric(24,12) not null check (price_usd > 0),
  block_number bigint
);
create index on public.price_samples(sampled_at desc);

create table public.tier_evaluations (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  period date not null,
  staked_raw numeric(78,0) not null,
  twap_usd numeric(24,12) not null,
  stake_value_usd numeric(14,4) not null,
  prev_tier text not null,
  new_tier text not null,
  grace_until timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, period)
);

create table public.monthly_economics (
  period date primary key,          -- bulan yang DIPROSES (bulan lalu)
  revenue_usd numeric(14,4) not null,
  ai_cost_usd numeric(14,4) not null,
  margin_usd numeric(14,4) not null,
  staker_budget_usd numeric(14,4) not null,
  staker_demand_usd numeric(14,4) not null,
  staker_scale numeric(8,6) not null,
  staker_used_usd numeric(14,4) not null,
  revshare_usd numeric(14,4) not null,
  ops_usd numeric(14,4) not null,
  buyback_usd numeric(14,4) not null,
  merkle_root text,
  created_at timestamptz not null default now()
);

create table public.revshare_allocations (
  period date not null references public.monthly_economics(period),
  user_id uuid not null references public.profiles(id),
  wallet text not null,
  amount_raw numeric(78,0) not null,
  proof jsonb,
  primary key (period, wallet)
);
create index on public.revshare_allocations(user_id);

create table public.buybacks (
  id bigserial primary key,
  period date not null references public.monthly_economics(period),
  usd_amount numeric(14,4) not null,
  status text not null default 'planned' check (status in ('planned','executed','cancelled')),
  tx_hash text,
  executed_at timestamptz
);

-- ---------- TEMPLATE & REFERRAL ----------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  source_project_id uuid not null references public.projects(id),
  source_version int not null,
  title text not null,
  description text not null default '',
  category text not null default 'landing',
  price_credits int not null check (price_credits between 0 and 5000),
  uses int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.projects add constraint projects_template_fk foreign key (template_id) references public.templates(id);

create table public.template_uses (
  id bigserial primary key,
  template_id uuid not null references public.templates(id),
  user_id uuid not null references public.profiles(id),
  project_id uuid not null references public.projects(id),
  credits bigint not null,
  royalty_usd numeric(14,4) not null,
  created_at timestamptz not null default now()
);

create table public.creator_payouts (
  id bigserial primary key,
  creator_id uuid not null references public.profiles(id),
  amount_usd numeric(14,4) not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  tx_hash text,
  created_at timestamptz not null default now()
);

create table public.referrals (
  id bigserial primary key,
  referrer_id uuid not null references public.profiles(id),
  referred_id uuid not null unique references public.profiles(id),
  rewarded boolean not null default false,
  reward_credits bigint,
  created_at timestamptz not null default now(),
  check (referrer_id <> referred_id)
);

create table public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, read);

-- =====================================================================
-- FUNGSI KREDIT (atomik, hanya untuk service_role)
-- =====================================================================
create or replace function public.grant_credits(
  p_user uuid, p_amount bigint, p_bucket text, p_reason public.credit_reason,
  p_ref text default null, p_meta jsonb default '{}')
returns bigint language plpgsql security definer set search_path = public as $$
declare v_total bigint;
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  insert into credit_balances(user_id) values (p_user) on conflict do nothing;
  if p_bucket = 'monthly' then
    update credit_balances set monthly = monthly + p_amount, updated_at = now() where user_id = p_user;
  else
    update credit_balances set topup = topup + p_amount, updated_at = now() where user_id = p_user;
  end if;
  insert into credit_ledger(user_id, delta, bucket, reason, ref_id, meta)
    values (p_user, p_amount, p_bucket, p_reason, p_ref, p_meta);
  select monthly + topup into v_total from credit_balances where user_id = p_user;
  return v_total;
end $$;

-- memotong kredit bulanan dulu, lalu top-up. Gagal jika saldo kurang.
create or replace function public.spend_credits(
  p_user uuid, p_amount bigint, p_reason public.credit_reason,
  p_ref text default null, p_meta jsonb default '{}')
returns bigint language plpgsql security definer set search_path = public as $$
declare b credit_balances; from_m bigint; from_t bigint;
begin
  if p_amount <= 0 then return (select monthly + topup from credit_balances where user_id = p_user); end if;
  select * into b from credit_balances where user_id = p_user for update;
  if not found or b.monthly + b.topup < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;
  from_m := least(b.monthly, p_amount);
  from_t := p_amount - from_m;
  update credit_balances set monthly = monthly - from_m, topup = topup - from_t, updated_at = now()
    where user_id = p_user;
  if from_m > 0 then insert into credit_ledger(user_id, delta, bucket, reason, ref_id, meta)
    values (p_user, -from_m, 'monthly', p_reason, p_ref, p_meta); end if;
  if from_t > 0 then insert into credit_ledger(user_id, delta, bucket, reason, ref_id, meta)
    values (p_user, -from_t, 'topup', p_reason, p_ref, p_meta); end if;
  return b.monthly + b.topup - p_amount;
end $$;

-- mengganti saldo bulanan (kredit bulan lalu yang tersisa hangus)
create or replace function public.reset_monthly_credits(p_user uuid, p_amount bigint, p_period date)
returns void language plpgsql security definer set search_path = public as $$
declare old bigint;
begin
  insert into credit_balances(user_id) values (p_user) on conflict do nothing;
  select monthly into old from credit_balances where user_id = p_user for update;
  update credit_balances set monthly = p_amount, updated_at = now() where user_id = p_user;
  insert into credit_ledger(user_id, delta, bucket, reason, ref_id, meta)
    values (p_user, p_amount - old, 'monthly', 'monthly_refill', p_period::text,
            jsonb_build_object('expired', old, 'granted', p_amount));
end $$;

revoke all on function public.grant_credits(uuid, bigint, text, public.credit_reason, text, jsonb) from public, anon, authenticated;
revoke all on function public.spend_credits(uuid, bigint, public.credit_reason, text, jsonb) from public, anon, authenticated;
revoke all on function public.reset_monthly_credits(uuid, bigint, date) from public, anon, authenticated;
grant execute on function public.grant_credits(uuid, bigint, text, public.credit_reason, text, jsonb) to service_role;
grant execute on function public.spend_credits(uuid, bigint, public.credit_reason, text, jsonb) to service_role;
grant execute on function public.reset_monthly_credits(uuid, bigint, date) to service_role;

-- profil + saldo otomatis saat user mendaftar
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id) values (new.id);
  insert into credit_balances(user_id) values (new.id);
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- RLS: klien hanya membaca miliknya sendiri. Semua tulis lewat API (service_role).
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.credit_balances enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.payments enable row level security;
alter table public.ai_usage enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.project_versions enable row level security;
alter table public.messages enable row level security;
alter table public.domains enable row level security;
alter table public.connectors enable row level security;
alter table public.tier_evaluations enable row level security;
alter table public.revshare_allocations enable row level security;
alter table public.templates enable row level security;
alter table public.template_uses enable row level security;
alter table public.referrals enable row level security;
alter table public.notifications enable row level security;
alter table public.wallet_nonces enable row level security;
alter table public.creator_payouts enable row level security;
alter table public.tiers enable row level security;
alter table public.price_samples enable row level security;
alter table public.monthly_economics enable row level security;
alter table public.buybacks enable row level security;
alter table public.reserved_slugs enable row level security;

create policy "own profile" on public.profiles for select using ((select auth.uid()) = id);
create policy "own balance" on public.credit_balances for select using ((select auth.uid()) = user_id);
create policy "own ledger" on public.credit_ledger for select using ((select auth.uid()) = user_id);
create policy "own payments" on public.payments for select using ((select auth.uid()) = user_id);
create policy "own usage" on public.ai_usage for select using ((select auth.uid()) = user_id);
create policy "own projects" on public.projects for select using ((select auth.uid()) = owner_id);
create policy "own files" on public.project_files for select using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "own versions" on public.project_versions for select using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "own messages" on public.messages for select using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "own domains" on public.domains for select using ((select auth.uid()) = owner_id);
-- token konektor TIDAK pernah dibaca klien; hanya metadata lewat view
create view public.my_connectors with (security_invoker = true) as
  select id, user_id, provider, account_label, scopes, created_at from public.connectors;
create policy "own connectors meta" on public.connectors for select using ((select auth.uid()) = user_id);
revoke select on public.connectors from authenticated, anon;
grant select (id, user_id, provider, account_label, scopes, created_at) on public.connectors to authenticated;
create policy "own evals" on public.tier_evaluations for select using ((select auth.uid()) = user_id);
create policy "own revshare" on public.revshare_allocations for select using ((select auth.uid()) = user_id);
create policy "public templates" on public.templates for select using (published or (select auth.uid()) = creator_id);
create policy "own template uses" on public.template_uses for select using ((select auth.uid()) = user_id);
create policy "own referrals" on public.referrals for select using ((select auth.uid()) = referrer_id or (select auth.uid()) = referred_id);
create policy "own notifications" on public.notifications for select using ((select auth.uid()) = user_id);
create policy "own payouts" on public.creator_payouts for select using ((select auth.uid()) = creator_id);
create policy "tiers public" on public.tiers for select using (true);
create policy "economics public" on public.monthly_economics for select using (true);
create policy "buybacks public" on public.buybacks for select using (true);
