-- Stage 12: the club's earlier posts (memory of what happened).
-- An update can replace a club's earlier post, so the website never shows both.

-- A fifth status: "replaced", for a post a newer update took over.
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('published', 'waiting', 'rejected', 'archived', 'replaced'));

-- replaced_by: the newer post that took over this one.
-- updates_id: on a waiting update, the earlier post it will replace once a moderator approves it.
alter table public.events
  add column if not exists replaced_by uuid references public.events (id) on delete set null,
  add column if not exists updates_id uuid references public.events (id) on delete set null;

-- Moderators may now also mark a post "replaced" (when they approve an update).
drop policy if exists "Moderators can review events" on public.events;
create policy "Moderators can review events"
  on public.events for update
  to authenticated
  using (true)
  with check (status in ('published', 'waiting', 'rejected', 'replaced'));
