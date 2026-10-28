-- Oriel 0007 — look up an Oriel user by email (team invites). Service role only.
create or replace function public.user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email)) limit 1;
$$;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
