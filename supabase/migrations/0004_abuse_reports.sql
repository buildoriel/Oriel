-- =====================================================================
-- Oriel 0004 — abuse reports and project suspension (takedown)
-- Anyone can report a site hosted on Oriel; the Oriel team reviews and can suspend it.
-- A suspended project is not served (subdomain and custom domains) and cannot be republished.
-- =====================================================================

alter table public.projects
  add column suspended_at timestamptz,
  add column suspended_reason text;

create table public.abuse_reports (
  id bigserial primary key,
  url text not null,
  hostname text not null,
  project_id uuid references public.projects(id) on delete set null,  -- resolved from the hostname when possible
  category text not null check (category in ('phishing','malware','scam','impersonation','illegal','spam','other')),
  details text not null default '' check (length(details) <= 2000),
  reporter_email text check (reporter_email is null or length(reporter_email) <= 254),
  reporter_user_id uuid references public.profiles(id) on delete set null,
  ip_hash text not null,                                               -- salted hash, used only for rate limiting
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.abuse_reports(status, created_at desc);
create index on public.abuse_reports(project_id);
create index on public.abuse_reports(ip_hash, created_at desc);
-- server-only table: no client policies
alter table public.abuse_reports enable row level security;
