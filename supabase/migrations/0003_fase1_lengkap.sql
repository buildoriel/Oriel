-- =====================================================================
-- Oriel 0003 — melengkapi Fase 1:
--   showcase, GitHub auto-commit, Netlify/Supabase per proyek, kunci agent (anti dobel jalan),
--   pembayaran royalti kreator, klaim kredit Free atomik.
-- =====================================================================

-- ---------- PROYEK ----------
alter table public.projects
  add column showcase_opt_in boolean not null default false, -- pemilik mengizinkan tampil di showcase
  add column featured_at timestamptz,                        -- dipilih tim Oriel untuk halaman utama
  add column github_autocommit boolean not null default false,
  add column netlify_site_id text,
  add column supabase_ref text,                              -- proyek Supabase milik user yang dipakai situs ini
  add column supabase_url text,
  add column supabase_anon_key text;                         -- kunci publik (anon), aman ditaruh di situs
create index on public.projects(featured_at) where featured_at is not null;

-- ---------- KUNCI AGENT ----------
-- Satu user hanya boleh menjalankan satu agent sekaligus: mencegah saldo dipakai ganda
-- oleh dua permintaan paralel dan membatasi beban.
create table public.agent_runs (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','done','error'))
);
create unique index agent_runs_one_active on public.agent_runs(user_id) where finished_at is null;
create index on public.agent_runs(user_id, started_at desc);
alter table public.agent_runs enable row level security;
create policy "own runs" on public.agent_runs for select using ((select auth.uid()) = user_id);

-- Mulai run: membersihkan run macet (> 10 menit) lalu mengunci. Mengembalikan null bila masih ada run aktif.
create or replace function public.begin_agent_run(p_user uuid, p_project uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  update agent_runs set finished_at = now(), status = 'error'
    where user_id = p_user and finished_at is null and started_at < now() - interval '10 minutes';
  insert into agent_runs(user_id, project_id) values (p_user, p_project) returning id into v_id;
  return v_id;
exception when unique_violation then
  return null;
end $$;
revoke all on function public.begin_agent_run(uuid, uuid) from public, anon, authenticated;
grant execute on function public.begin_agent_run(uuid, uuid) to service_role;

-- ---------- KREDIT FREE: klaim sekali, atomik ----------
create or replace function public.claim_free_credits(p_user uuid, p_amount bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update profiles set free_credits_claimed_at = now()
    where id = p_user and free_credits_claimed_at is null and wallet_verified_at is not null;
  if not found then return false; end if;
  perform grant_credits(p_user, p_amount, 'monthly', 'free_grant', 'wallet_verified', '{}');
  return true;
end $$;
revoke all on function public.claim_free_credits(uuid, bigint) from public, anon, authenticated;
grant execute on function public.claim_free_credits(uuid, bigint) to service_role;

-- ---------- ROYALTI KREATOR ----------
alter table public.template_uses add column payout_id bigint references public.creator_payouts(id);
create index on public.template_uses(payout_id) where payout_id is null;
alter table public.creator_payouts add column wallet text, add column period date;

-- pemakaian template: jumlah dipakai dinaikkan atomik
create or replace function public.increment_template_uses(p_template uuid) returns void
language sql security definer set search_path = public as $$
  update templates set uses = uses + 1 where id = p_template
$$;
revoke all on function public.increment_template_uses(uuid) from public, anon, authenticated;
grant execute on function public.increment_template_uses(uuid) to service_role;
