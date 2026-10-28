-- Oriel 0008 — sign-in through Privy (wallet, email, Google). The Privy user id maps to one Supabase account.
alter table public.profiles add column privy_did text unique;
comment on column public.profiles.privy_did is 'Privy user id (did:privy:...) linked to this account';
