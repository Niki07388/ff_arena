-- ============================================================================
--  FREE FIRE TOURNAMENT PLATFORM — SCHEMA + ROW LEVEL SECURITY
--  Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run
--
--  Safe to re-run. It repairs an existing database in place:
--   * converts legacy `text` id columns to real `uuid`
--   * adds the foreign keys PostgREST needs to join tournaments → teams/matches
--   * drops the old publicly-readable password table
--   * enables Row Level Security with per-owner rules
-- ============================================================================
--
--  ACCESS MODEL (enforced by the database, not just the UI):
--
--    Anyone (even logged out) ....... can READ tournaments, teams, matches
--    Any logged-in user ............. can CREATE a tournament (becomes organizer)
--                                     can REGISTER their own squad into any event
--                                     can EDIT/DELETE only the squads they registered
--    Organizer (tournament creator) . can EDIT/DELETE their own tournament
--                                     can ENTER MATCH SCORES for it
--                                     can CHANGE SCORING SETTINGS for it
--                                     can EDIT/DELETE any squad in their event
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Remove the old insecure hand-rolled auth tables
--    These stored weak password hashes that anyone could read with the public key.
-- ----------------------------------------------------------------------------
drop table if exists public.verification_codes cascade;
drop table if exists public.users cascade;


-- ----------------------------------------------------------------------------
-- 1. Helper: force a column to be a real `uuid`
--    Your tables were created with `text` id columns. Foreign keys to
--    auth.users(id) and tournaments(id) cannot exist until these are uuid,
--    and without those foreign keys PostgREST cannot join the tables at all.
--    Anything that is not a well-formed uuid is set to NULL rather than failing.
-- ----------------------------------------------------------------------------
create or replace function public.__ensure_uuid_column(p_table text, p_column text)
returns void
language plpgsql
as $fn$
declare
  col_type text;
begin
  select data_type into col_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = p_table
     and column_name  = p_column;

  if col_type is null then
    execute format('alter table public.%I add column %I uuid', p_table, p_column);

  elsif col_type <> 'uuid' then
    -- A text default (e.g. gen_random_uuid()::text) cannot be cast to uuid and
    -- would abort the ALTER, so remove it first. Step 7 re-adds proper defaults.
    execute format('alter table public.%I alter column %I drop default', p_table, p_column);

    execute format(
      $q$alter table public.%I
           alter column %I type uuid
           using (case
                    when %I::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    then %I::text::uuid
                    else null
                  end)$q$,
      p_table, p_column, p_column, p_column);
  end if;
end;
$fn$;


-- ----------------------------------------------------------------------------
-- 2. Profiles — public display info for auth users
--    (auth.users is never readable from the browser, so mirror the safe bits)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email, display_name)
select id, email, split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 3. Base tables (created only if this is a fresh project)
-- ----------------------------------------------------------------------------
create table if not exists public.tournaments (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  date           date,
  room_id        text,
  room_password  text,
  total_matches  int  not null default 5,
  scoring_rules  jsonb not null default
                   '{"perKillPoints": 1, "placementPoints": [12,9,8,7,6,5,4,3,2,1,0,0]}'::jsonb,
  created_by     uuid,
  created_at     timestamptz not null default now()
);

create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid,
  name          text not null,
  logo          text,
  captain       text,
  phone         text,
  players       jsonb not null default '[]'::jsonb,
  registered_by uuid,
  created_at    timestamptz not null default now()
);

create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid,
  match_number  int not null,
  entries       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- The old pin column is obsolete now that real auth exists
alter table public.tournaments drop column if exists admin_pin;

-- Make sure the newer columns exist on legacy tables
alter table public.teams add column if not exists registered_by uuid;
alter table public.teams add column if not exists phone text;


-- ----------------------------------------------------------------------------
-- 4. Drop existing foreign keys BEFORE changing column types.
--    A key cannot straddle a uuid and a text column, so converting one side
--    while an old key is still attached would abort the migration.
--    Done dynamically because legacy constraints may carry any name.
-- ----------------------------------------------------------------------------
do $$
declare
  fk record;
begin
  for fk in
    select con.conname, cls.relname
      from pg_constraint con
      join pg_class cls on cls.oid = con.conrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
     where con.contype = 'f'
       and ns.nspname  = 'public'
       and cls.relname in ('tournaments', 'teams', 'matches')
  loop
    execute format('alter table public.%I drop constraint %I', fk.relname, fk.conname);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 5. Normalise every id column to uuid
--    THIS is what fixes: "operator does not exist: uuid = text"
-- ----------------------------------------------------------------------------
select public.__ensure_uuid_column('tournaments', 'id');
select public.__ensure_uuid_column('tournaments', 'created_by');
select public.__ensure_uuid_column('teams',       'id');
select public.__ensure_uuid_column('teams',       'tournament_id');
select public.__ensure_uuid_column('teams',       'registered_by');
select public.__ensure_uuid_column('matches',     'id');
select public.__ensure_uuid_column('matches',     'tournament_id');


-- ----------------------------------------------------------------------------
-- 6. Clear rows that point at records which no longer exist
--    (your old tournament referenced the users table dropped in step 0 —
--     see the CLAIM step at the bottom to take ownership of it again)
-- ----------------------------------------------------------------------------
update public.tournaments t
   set created_by = null
 where t.created_by is not null
   and not exists (select 1 from auth.users u where u.id = t.created_by);

update public.teams tm
   set registered_by = null
 where tm.registered_by is not null
   and not exists (select 1 from auth.users u where u.id = tm.registered_by);

-- Orphaned children would block the foreign keys added next
delete from public.teams
 where tournament_id is null
    or not exists (select 1 from public.tournaments t where t.id = tournament_id);

delete from public.matches
 where tournament_id is null
    or not exists (select 1 from public.tournaments t where t.id = tournament_id);


-- ----------------------------------------------------------------------------
-- 7. Foreign keys
--    PostgREST uses these to resolve the embedded
--    `tournaments -> teams / matches` select the app now issues in one request.
-- ----------------------------------------------------------------------------
alter table public.tournaments alter column id set default gen_random_uuid();
alter table public.teams       alter column id set default gen_random_uuid();
alter table public.matches     alter column id set default gen_random_uuid();

alter table public.tournaments drop constraint if exists tournaments_created_by_fkey;
alter table public.tournaments
  add constraint tournaments_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;

alter table public.teams drop constraint if exists teams_tournament_id_fkey;
alter table public.teams
  add constraint teams_tournament_id_fkey
  foreign key (tournament_id) references public.tournaments(id) on delete cascade;

alter table public.teams drop constraint if exists teams_registered_by_fkey;
alter table public.teams
  add constraint teams_registered_by_fkey
  foreign key (registered_by) references auth.users(id) on delete set null;

alter table public.matches drop constraint if exists matches_tournament_id_fkey;
alter table public.matches
  add constraint matches_tournament_id_fkey
  foreign key (tournament_id) references public.tournaments(id) on delete cascade;

alter table public.teams   alter column tournament_id set not null;
alter table public.matches alter column tournament_id set not null;


-- ----------------------------------------------------------------------------
-- 8. Indexes and uniqueness
-- ----------------------------------------------------------------------------
create index if not exists tournaments_created_by_idx on public.tournaments(created_by);
create index if not exists teams_tournament_idx       on public.teams(tournament_id);
create index if not exists teams_registered_by_idx    on public.teams(registered_by);
create index if not exists matches_tournament_idx     on public.matches(tournament_id);

-- Required by the app's upsert(onConflict: 'tournament_id,match_number').
-- Collapses duplicates left over from before this constraint existed, keeping
-- the newest row. Ranked by id as well so rows sharing a timestamp still
-- resolve to exactly one survivor.
delete from public.matches
 where id in (
   select id from (
     select id,
            row_number() over (
              partition by tournament_id, match_number
              order by created_at desc, id desc
            ) as rn
       from public.matches
   ) ranked
   where ranked.rn > 1
 );

create unique index if not exists matches_tournament_number_key
  on public.matches (tournament_id, match_number);

-- One squad name per tournament. Skipped with a notice if duplicates exist.
do $$
begin
  create unique index if not exists teams_tournament_name_key
    on public.teams (tournament_id, lower(name));
exception when unique_violation then
  raise notice 'Duplicate squad names found — unique index skipped. Rename them, then re-run.';
end $$;


-- ----------------------------------------------------------------------------
-- 9. Helper: is the current user the organizer of this tournament?
-- ----------------------------------------------------------------------------
create or replace function public.is_tournament_owner(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.tournaments
     where id = t_id
       and created_by = auth.uid()
  );
$fn$;


-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.tournaments enable row level security;
alter table public.teams       enable row level security;
alter table public.matches     enable row level security;

drop policy if exists profiles_public_read           on public.profiles;
drop policy if exists profiles_self_update           on public.profiles;
drop policy if exists tournaments_public_read        on public.tournaments;
drop policy if exists tournaments_owner_insert       on public.tournaments;
drop policy if exists tournaments_owner_update       on public.tournaments;
drop policy if exists tournaments_owner_delete       on public.tournaments;
drop policy if exists teams_public_read              on public.teams;
drop policy if exists teams_auth_insert              on public.teams;
drop policy if exists teams_captain_or_owner_update  on public.teams;
drop policy if exists teams_captain_or_owner_delete  on public.teams;
drop policy if exists matches_public_read            on public.matches;
drop policy if exists matches_owner_insert           on public.matches;
drop policy if exists matches_owner_update           on public.matches;
drop policy if exists matches_owner_delete           on public.matches;


-- ---- PROFILES ---------------------------------------------------------------
create policy profiles_public_read on public.profiles
  for select using (true);

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());


-- ---- TOURNAMENTS ------------------------------------------------------------
-- "ALL THE PEOPLE CAN SEE THE TOURNAMENTS"
create policy tournaments_public_read on public.tournaments
  for select using (true);

-- Any logged-in user may create an event and is recorded as its organizer.
-- They cannot forge somebody else's id.
create policy tournaments_owner_insert on public.tournaments
  for insert to authenticated
  with check (created_by = auth.uid());

-- "ONLY THE GUY WHO CREATED" can change or remove it.
create policy tournaments_owner_update on public.tournaments
  for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy tournaments_owner_delete on public.tournaments
  for delete to authenticated
  using (created_by = auth.uid());


-- ---- TEAMS ------------------------------------------------------------------
create policy teams_public_read on public.teams
  for select using (true);

-- "THE TEAM LEADER HAS TO LOGIN AND REGISTER IN THE EVENT"
create policy teams_auth_insert on public.teams
  for insert to authenticated
  with check (registered_by = auth.uid());

-- A captain edits their own squad; the organizer may edit any squad in their event.
create policy teams_captain_or_owner_update on public.teams
  for update to authenticated
  using      (registered_by = auth.uid() or public.is_tournament_owner(tournament_id))
  with check (registered_by = auth.uid() or public.is_tournament_owner(tournament_id));

create policy teams_captain_or_owner_delete on public.teams
  for delete to authenticated
  using (registered_by = auth.uid() or public.is_tournament_owner(tournament_id));


-- ---- MATCHES ----------------------------------------------------------------
create policy matches_public_read on public.matches
  for select using (true);

-- "THE ONE WHO IS ORGANIZING CAN ONLY ENTER THE MATCH SCORES"
create policy matches_owner_insert on public.matches
  for insert to authenticated
  with check (public.is_tournament_owner(tournament_id));

create policy matches_owner_update on public.matches
  for update to authenticated
  using      (public.is_tournament_owner(tournament_id))
  with check (public.is_tournament_owner(tournament_id));

create policy matches_owner_delete on public.matches
  for delete to authenticated
  using (public.is_tournament_owner(tournament_id));


-- ============================================================================
-- 11. COLUMN-LEVEL PRIVACY
--     RLS controls which ROWS you can read, never individual COLUMNS. Hiding
--     the room password / captain phone in the UI alone would still leave them
--     readable through the REST API.
--
--     IMPORTANT: `revoke select (column)` does NOTHING while the role still
--     holds a TABLE-level select grant — and Supabase grants that to `anon` by
--     default. The table grant must be revoked first, then the safe columns
--     granted back individually.
-- ============================================================================
revoke select on public.tournaments from anon;
revoke select on public.teams       from anon;

-- Signed-out visitors: everything except room_password / phone
grant select (id, name, date, room_id, total_matches, scoring_rules,
              created_by, created_at)
  on public.tournaments to anon;

grant select (id, tournament_id, name, logo, captain, players,
              registered_by, created_at)
  on public.teams to anon;

-- Signed-in participants keep full read access
grant select on public.tournaments to authenticated;
grant select on public.teams       to authenticated;

-- Anonymous visitors have no business writing anything; RLS is the real gate
-- but there is no reason to hold the privilege at all.
revoke insert, update, delete on public.tournaments from anon;
revoke insert, update, delete on public.teams       from anon;
revoke insert, update, delete on public.matches     from anon;


-- ----------------------------------------------------------------------------
-- 12. Tidy up the migration helper
-- ----------------------------------------------------------------------------
drop function if exists public.__ensure_uuid_column(text, text);


-- ============================================================================
-- 13. ONE-TIME CLAIM STEP  (only if you had data before this migration)
-- ============================================================================
--  Step 6 cleared the owner of your existing tournament, because the account it
--  pointed at lived in the old users table. After you sign up in the app,
--  run these two statements with YOUR email to take ownership back:
--
--  update public.tournaments
--     set created_by = (select id from auth.users where email = 'you@example.com')
--   where created_by is null;
--
--  update public.teams
--     set registered_by = (select id from auth.users where email = 'you@example.com')
--   where registered_by is null;
-- ============================================================================
