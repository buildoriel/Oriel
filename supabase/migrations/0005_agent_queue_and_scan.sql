-- =====================================================================
-- Oriel 0005 — durable agent job queue + automatic pre-publish scan reports
--
-- Agent runs no longer live inside one HTTP request. A chat message enqueues a run; workers process it
-- in slices of a few minutes, saving state between slices, so long builds survive function time limits,
-- closed tabs, and crashes. Progress is written to agent_run_events and polled by the workspace.
--
-- Additive only (nothing is dropped): the existing status column keeps its values
--   running = unfinished (see phase), done, error (error = 'cancelled' for runs the user stopped)
-- and the new phase column says whether an unfinished run is waiting or being worked on.
-- =====================================================================

-- ---------- AGENT RUNS AS A QUEUE ----------
alter table public.agent_runs
  add column message text not null default '',
  add column phase text not null default 'queued' check (phase in ('queued','working')),
  add column state jsonb,                                  -- resumable agent state between slices
  add column lease_until timestamptz,                      -- worker lease while working; retry backoff while queued
  add column attempts int not null default 0,
  add column cancel_requested boolean not null default false,
  add column error text;
create index agent_runs_runnable on public.agent_runs(started_at) where finished_at is null;

create table public.agent_run_events (
  id bigserial primary key,
  run_id bigint not null references public.agent_runs(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.agent_run_events(run_id, id);
alter table public.agent_run_events enable row level security;
create policy "own run events" on public.agent_run_events for select using (
  exists (select 1 from public.agent_runs r where r.id = run_id and r.user_id = (select auth.uid())));

-- Enqueue a run. One unfinished run per user (unique index agent_runs_one_active).
-- Runs stuck for 15+ minutes without a live worker are closed first. Returns null if a run is still active.
-- (Replaces the 2-argument begin_agent_run from 0003, which the app no longer calls.)
create or replace function public.enqueue_agent_run(p_user uuid, p_project uuid, p_message text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  update agent_runs set finished_at = now(), status = 'error', error = 'stalled'
    where user_id = p_user and finished_at is null
      and coalesce(lease_until, started_at) < now() - interval '15 minutes';
  insert into agent_runs(user_id, project_id, message, status, phase) values (p_user, p_project, p_message, 'running', 'queued')
    returning id into v_id;
  return v_id;
exception when unique_violation then
  return null;
end $$;
revoke all on function public.enqueue_agent_run(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.enqueue_agent_run(uuid, uuid, text) to service_role;

-- Atomically claim a run for one worker slice. Fails (returns false) when another worker holds a live lease,
-- the run is backing off after an error, it already finished, or the global concurrency limit is reached.
create or replace function public.claim_agent_run(p_run bigint, p_lease_seconds int, p_max_working int) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from agent_runs where phase = 'working' and finished_at is null and lease_until > now()) >= p_max_working
  then return false; end if;
  update agent_runs
    set phase = 'working', lease_until = now() + make_interval(secs => p_lease_seconds), attempts = attempts + 1
    where id = p_run and finished_at is null and (lease_until is null or lease_until < now());
  return found;
end $$;
revoke all on function public.claim_agent_run(bigint, int, int) from public, anon, authenticated;
grant execute on function public.claim_agent_run(bigint, int, int) to service_role;

-- ---------- AUTOMATIC SCAN REPORTS ----------
-- Reports created by the pre-publish scanner are marked so moderators can tell them apart.
alter table public.abuse_reports add column source text not null default 'user' check (source in ('user','auto_scan'));
