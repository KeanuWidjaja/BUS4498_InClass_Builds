-- Stage 11: the club list (knowledge).
-- The agent reads this table on every post. Moderators keep it current in
-- Table Editor → clubs, and the next post sees the change with nothing redeployed.

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique check (char_length(name) between 1 and 100),
  nicknames text not null default '',
  usual_place_code text not null default '',
  usual_place_detail text not null default '',
  active boolean not null default true,
  note text not null default ''
);

alter table public.clubs enable row level security;

-- Visitors may see the active clubs, and only their names.
drop policy if exists "Anyone can read active clubs" on public.clubs;
create policy "Anyone can read active clubs"
  on public.clubs for select
  to anon, authenticated
  using (active);

-- Some projects hand every new table to visitors by default. Start from nothing.
revoke all on public.clubs from anon, authenticated;
grant select (id, name, nicknames, active) on public.clubs to anon, authenticated;
grant select, insert, update, delete on public.clubs to service_role;

-- The six made-up clubs the list starts with (see context/clubs.md).
insert into public.clubs (name, nicknames, usual_place_code, usual_place_detail) values
  ('Board Game Guild', 'BGG, board game club, board gamers', 'UU', 'Room 220'),
  ('Mustang Pitch Society', 'MPS, pitch society, pitch club', 'UU-PLAZA', ''),
  ('Women in Finance Circle', 'WIFC, women in finance', 'BUSINESS', 'Room 110'),
  ('Sustainability Crew', 'sustainability club, green crew', 'DEXTER-LAWN', ''),
  ('Accounting Society', 'accounting club, accounting soc', 'BUSINESS', 'Room 212'),
  ('Cal Poly Ski & Snowboard Club', 'ski club, snowboard club, ski and snowboard club', 'UU', 'Room 204')
on conflict (name) do nothing;

-- What the agent looked at before it decided, saved with every post.
alter table public.events
  add column if not exists agent_notes text[] not null default '{}';

-- The moderator's "Clear the board" tool deletes posts.
drop policy if exists "Moderators can delete posts" on public.events;
create policy "Moderators can delete posts"
  on public.events for delete
  to authenticated
  using (true);
grant delete on public.events to authenticated;
