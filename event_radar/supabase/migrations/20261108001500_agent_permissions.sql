-- Week 11: permissions and boundaries (runtime/permissions-plan.md).
-- Every switch and number a moderator may change is one row in agent_permissions.
-- The agent reads the table at the start of every post, so a change needs no redeploy.
-- The fixed limits (the AI models, the 2,000-character post length) are constants in the agent's code.

create table if not exists public.agent_permissions (
  key        text primary key,
  label      text not null,
  kind       text not null check (kind in ('switch', 'number')),
  -- A switch is 1 (on) or 0 (off). A number is a whole number from 0 up.
  value      integer not null,
  reason     text not null check (char_length(btrim(reason)) between 3 and 300),
  changed_by text not null default '',
  updated_at timestamptz not null default now(),
  sort       integer not null default 0,
  constraint agent_permissions_value_fits_kind check (
    (kind = 'switch' and value in (0, 1)) or
    (kind = 'number' and value between 0 and 100000)
  )
);

alter table public.agent_permissions enable row level security;

-- Signed-in moderators may read every row.
drop policy if exists "Moderators can read permissions" on public.agent_permissions;
create policy "Moderators can read permissions"
  on public.agent_permissions for select
  to authenticated
  using (true);

-- Signed-in moderators may change a value, always under their own email and with a reason.
drop policy if exists "Moderators can change permissions" on public.agent_permissions;
create policy "Moderators can change permissions"
  on public.agent_permissions for update
  to authenticated
  using (true)
  with check (changed_by = coalesce(auth.jwt() ->> 'email', '') and char_length(btrim(reason)) >= 3);

-- Some projects hand every new table to visitors by default. Start from nothing.
revoke all on public.agent_permissions from anon, authenticated, service_role;
grant select on public.agent_permissions to authenticated;
grant update (value, reason, changed_by, updated_at) on public.agent_permissions to authenticated;
-- Never #3: the agent may read the switches but never change one. Its key gets select only.
grant select on public.agent_permissions to service_role;

-- A change stamps the time itself, and a new value needs a newly typed reason.
create or replace function public.agent_permissions_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.value is distinct from old.value and btrim(new.reason) = btrim(old.reason) then
    raise exception 'Type a reason for this change first.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists agent_permissions_stamp on public.agent_permissions;
create trigger agent_permissions_stamp
  before update on public.agent_permissions
  for each row execute function public.agent_permissions_stamp();

-- The rows, from the plan's "May, with a limit" list, plus the off switch.
insert into public.agent_permissions (key, label, kind, value, reason, changed_by, sort) values
  ('paused', 'Paused', 'switch', 0,
   'Off: the agent reads posts. Switch it on to stop the agent before any AI call.', 'permissions plan', 0),
  ('auto_publish', 'Publish on its own', 'switch', 1,
   'On: a post that passes every rule goes straight to the website. Off: every post waits for a moderator.', 'permissions plan', 1),
  ('daily_limit', 'Posts per day', 'number', 100,
   'At most 100 posts in any 24 hours; then the agent refuses until tomorrow. A spending limit.', 'permissions plan', 2),
  ('days_ahead', 'Days ahead', 'number', 60,
   'A post for a date further out than this waits for a moderator (rule R8).', 'permissions plan', 3),
  ('new_club_wait_days', 'New-club wait (days)', 'number', 30,
   'Posts from a club added to the list within this many days wait for a moderator. Clubs already on the list count as established.', 'permissions plan', 4)
on conflict (key) do nothing;

-- New-club wait: the clubs already on the list count as established; a club added from now on doesn't.
-- Only the first time the column appears are the clubs on the list marked established, so running
-- this file again never marks a newer club established.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clubs' and column_name = 'established'
  ) then
    alter table public.clubs add column established boolean not null default false;
    update public.clubs set established = true;
  end if;
end;
$$;

-- Never #3: the agent never writes a lesson (a rule). Its key may only read them.
revoke insert, update, delete on public.lessons from service_role;
grant select on public.lessons to service_role;

-- Never #4: the agent never deletes a post. Its key has no delete grant on events.
-- (Moderators keep their own delete, for the Clear the board tool.)
revoke delete on public.events from service_role;
-- TRUNCATE empties a whole table, so the agent's key doesn't get it on events or lessons either.
revoke truncate on public.events from service_role;
revoke truncate on public.lessons from service_role;

-- Never #6, backstop: while Paused is on, the agent's key can't save or change a post.
-- Moderators (authenticated) can still approve and reject while the agent is paused.
create or replace function public.events_refuse_agent_when_paused()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'service_role'
     and exists (select 1 from public.agent_permissions where key = 'paused' and value = 1) then
    raise exception 'The agent is paused.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists events_refuse_agent_when_paused on public.events;
create trigger events_refuse_agent_when_paused
  before insert or update on public.events
  for each row execute function public.events_refuse_agent_when_paused();

-- Never #5, backstop: a published card never shows a phone number, an email address, or a payment
-- handle (@name or $name). The agent removes them in code first; this refuses anything that slips by.
-- NOT VALID: posts already saved aren't checked, only new and changed ones.
alter table public.events drop constraint if exists events_no_contact_on_card;
alter table public.events add constraint events_no_contact_on_card check (
  status <> 'published' or (
    (title || ' ' || club || ' ' || summary || ' ' || place_detail || ' ' || cost)
      !~ '(^|[^0-9])\(?[0-9]{3}\)?[ .-]?[0-9]{3}[ .-]?[0-9]{4}([^0-9]|$)'
    and (title || ' ' || club || ' ' || summary || ' ' || place_detail || ' ' || cost)
      !~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    and (title || ' ' || club || ' ' || summary || ' ' || place_detail || ' ' || cost)
      !~ '(^|[^A-Za-z0-9])[@$][A-Za-z][A-Za-z0-9_-]{2,}'
  )
) not valid;
