-- A Free account's first build runs on the Builder model once, and Oriel pays the difference.
-- Set when that build starts, so it is used at most once per account.
alter table public.profiles add column if not exists welcome_build_at timestamptz;
