-- Oriel 0009 — subdomains used by email (Resend: send, rsend, links) and auth pages can't be project slugs.
insert into public.reserved_slugs(slug) values ('send'),('rsend'),('links'),('email'),('auth'),('login'),('logout') on conflict do nothing;
