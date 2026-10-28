-- =====================================================================
-- Oriel 0006 — project deletion, team members, chat attachments, email preferences, error log
--
-- Additive only (nothing is dropped).
--   * Deleting a project is a soft delete: the row stays (templates and template_uses still point to it),
--     its files, domains and members are removed, the slug is released and the site stops serving.
--   * project_members lets a Studio owner invite editors to a project. Members use their own credits.
--   * app_errors collects client and server errors for monitoring.
-- =====================================================================

-- ---------- SOFT DELETE ----------
alter table public.projects add column deleted_at timestamptz;
create index projects_owner_live on public.projects(owner_id) where deleted_at is null;

-- ---------- TEAM MEMBERS ----------
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index on public.project_members(user_id);
alter table public.project_members enable row level security;

-- security definer so policies on projects can use it without recursing into project_members' own RLS
create or replace function public.is_project_member(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members m where m.project_id = p_project and m.user_id = (select auth.uid()));
$$;

create policy "member sees own memberships" on public.project_members for select using (
  (select auth.uid()) = user_id
  or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "member projects" on public.projects for select using (public.is_project_member(id));
create policy "member files" on public.project_files for select using (public.is_project_member(project_id));
create policy "member versions" on public.project_versions for select using (public.is_project_member(project_id));
create policy "member messages" on public.messages for select using (public.is_project_member(project_id));
create policy "member runs" on public.agent_runs for select using (public.is_project_member(project_id));

-- ---------- CHAT ATTACHMENTS ----------
-- [{ path, name, type, size }] — the files themselves are saved as project files (images as data URLs)
alter table public.messages add column attachments jsonb;

-- ---------- EMAIL PREFERENCES ----------
alter table public.profiles
  add column email_build_done boolean not null default true,
  add column email_low_credits boolean not null default true,
  add column low_credits_emailed_at timestamptz;

-- ---------- ERROR LOG ----------
create table public.app_errors (
  id bigserial primary key,
  source text not null check (source in ('client','server')),
  message text not null,
  stack text,
  url text,
  digest text,
  user_id uuid references public.profiles(id) on delete set null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on public.app_errors(created_at);
alter table public.app_errors enable row level security;  -- no policies: service role only
