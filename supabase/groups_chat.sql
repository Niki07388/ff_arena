-- ============================================================================
--  GROUPS (ROOMS) + GROUP CHAT
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
--  Run this AFTER schema.sql and fix_rls.sql. Safe to re-run.
--
--  WHY: Free Fire custom rooms hold 12 squads. A 24-squad tournament needs two
--  rooms, so the organizer splits registered squads into groups, and each group
--  gets its own room credentials and its own private chat.
--
--  ACCESS MODEL:
--    Groups + membership .... readable by anyone (public draw / bracket)
--                             only the tournament organizer can create or edit
--    Chat messages .......... readable ONLY by that group's members
--                             (the organizer, and captains with a squad in it)
--                             never readable by the public or by other groups
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Groups — one per custom room
-- ----------------------------------------------------------------------------
create table if not exists public.groups (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null,
  room_id       text,
  room_password text,
  max_teams     int  not null default 12,
  created_at    timestamptz not null default now()
);

create index if not exists groups_tournament_idx on public.groups(tournament_id);

-- Group names are unique inside a tournament ("Group A" twice is a mistake)
create unique index if not exists groups_tournament_name_key
  on public.groups (tournament_id, lower(name));


-- ----------------------------------------------------------------------------
-- 2. Group membership — which squads are in which room
-- ----------------------------------------------------------------------------
create table if not exists public.group_teams (
  group_id   uuid not null references public.groups(id) on delete cascade,
  team_id    uuid not null references public.teams(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, team_id)
);

-- A squad can only sit in ONE room. Without this a team could be added twice
-- and would appear in two rooms at the same time.
create unique index if not exists group_teams_team_key on public.group_teams (team_id);

create index if not exists group_teams_group_idx on public.group_teams(group_id);


-- ----------------------------------------------------------------------------
-- 3. Chat messages
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  sender_id   uuid references auth.users(id) on delete set null,
  sender_name text not null,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists messages_group_created_idx
  on public.messages (group_id, created_at);


-- ----------------------------------------------------------------------------
-- 4. Helpers
-- ----------------------------------------------------------------------------

-- Is the caller the organizer of the tournament this group belongs to?
create or replace function public.is_group_organizer(g_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
      from public.groups g
      join public.tournaments t on t.id = g.tournament_id
     where g.id = g_id
       and t.created_by = auth.uid()
  );
$fn$;

-- Is the caller allowed in this group's chat?
-- Either the organizer, or a captain whose squad sits in the group.
create or replace function public.is_group_member(g_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select
    public.is_group_organizer(g_id)
    or exists (
      select 1
        from public.group_teams gt
        join public.teams tm on tm.id = gt.team_id
       where gt.group_id = g_id
         and tm.registered_by = auth.uid()
    );
$fn$;

-- Refuse to overfill a room. Enforced in the database so it holds even if the
-- UI is bypassed.
create or replace function public.enforce_group_capacity()
returns trigger
language plpgsql
as $fn$
declare
  cap      int;
  occupied int;
begin
  select max_teams into cap from public.groups where id = new.group_id;
  select count(*)  into occupied from public.group_teams where group_id = new.group_id;

  if occupied >= cap then
    raise exception 'This room is full (% of % squads).', occupied, cap
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

drop trigger if exists group_teams_capacity on public.group_teams;
create trigger group_teams_capacity
  before insert on public.group_teams
  for each row execute function public.enforce_group_capacity();


-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================
alter table public.groups      enable row level security;
alter table public.group_teams enable row level security;
alter table public.messages    enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
     where schemaname = 'public'
       and tablename in ('groups', 'group_teams', 'messages')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ---- GROUPS: public to read, organizer to manage ----
create policy groups_public_read on public.groups
  for select using (true);

create policy groups_organizer_insert on public.groups
  for insert to authenticated
  with check (public.is_tournament_owner(tournament_id));

create policy groups_organizer_update on public.groups
  for update to authenticated
  using      (public.is_tournament_owner(tournament_id))
  with check (public.is_tournament_owner(tournament_id));

create policy groups_organizer_delete on public.groups
  for delete to authenticated
  using (public.is_tournament_owner(tournament_id));

-- ---- GROUP MEMBERSHIP: public to read, organizer to assign ----
create policy group_teams_public_read on public.group_teams
  for select using (true);

create policy group_teams_organizer_insert on public.group_teams
  for insert to authenticated
  with check (public.is_group_organizer(group_id));

create policy group_teams_organizer_delete on public.group_teams
  for delete to authenticated
  using (public.is_group_organizer(group_id));

-- ---- MESSAGES: private to the group ----
create policy messages_member_read on public.messages
  for select to authenticated
  using (public.is_group_member(group_id));

-- You may only post as yourself, and only into a group you belong to.
create policy messages_member_insert on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_group_member(group_id));

-- Delete your own message; the organizer can moderate any of them.
create policy messages_own_or_organizer_delete on public.messages
  for delete to authenticated
  using (sender_id = auth.uid() or public.is_group_organizer(group_id));


-- ============================================================================
-- 6. GRANTS
--    Chat is never exposed to signed-out visitors.
-- ============================================================================
grant select on public.groups      to anon, authenticated;
grant select on public.group_teams to anon, authenticated;
grant insert, update, delete on public.groups      to authenticated;
grant insert, delete          on public.group_teams to authenticated;

revoke all on public.messages from anon;
grant select, insert, delete on public.messages to authenticated;


-- ============================================================================
-- 7. REALTIME — push new chat messages to everyone in the room
-- ============================================================================
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;   -- already added, fine
  when undefined_object then
    raise notice 'supabase_realtime publication not found; chat will fall back to polling.';
end $$;

-- Realtime still applies RLS, so a subscriber only receives messages for
-- groups they belong to.
alter table public.messages replica identity full;


-- ============================================================================
-- 8. VERIFICATION — every row must read PASS
-- ============================================================================
with rls as (
  select c.relname::text as tbl,
         c.relrowsecurity as enabled,
         (select count(*) from pg_policies p
           where p.schemaname='public' and p.tablename=c.relname)::int as policies
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname in ('groups','group_teams','messages')
)
select 'RLS on + policies: ' || tbl as check,
       case when enabled and policies>0 then 'PASS ('||policies||')' else 'FAIL' end as result
  from rls
union all
select 'anon CANNOT read chat messages',
       case when has_table_privilege('anon','public.messages','SELECT') then 'FAIL' else 'PASS' end
union all
select 'anon can read group draw',
       case when has_table_privilege('anon','public.groups','SELECT') then 'PASS' else 'FAIL' end
union all
select 'room capacity trigger installed',
       case when exists (select 1 from pg_trigger where tgname='group_teams_capacity')
            then 'PASS' else 'FAIL' end
order by 1;
