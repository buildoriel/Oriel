-- Small key/value store for app state the server discovers at runtime (e.g. the official $ORIEL token address).
-- Server only: RLS on, no policies, so only the service role can read or write it.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
