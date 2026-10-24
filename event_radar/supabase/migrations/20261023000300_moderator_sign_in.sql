-- Stage 8: moderator sign-in
-- Signed-in users are moderators. This is safe only because new sign-ups are turned off
-- (Authentication → Sign In / Providers → Allow new users to sign up).

-- Moderators may read every post, including waiting and rejected ones.
create policy "Moderators can read every event"
  on public.events
  for select
  to authenticated
  using (true);

-- Moderators may change a post's status, but only to published, waiting, or rejected.
create policy "Moderators can review events"
  on public.events
  for update
  to authenticated
  using (true)
  with check (status in ('published', 'waiting', 'rejected'));

grant select on public.events to authenticated;
grant update (status, status_reason, reviewed_at, reviewed_by) on public.events to authenticated;
