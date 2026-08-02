-- ============================================================================
--  RLS REPAIR + VERIFICATION
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
--
--  Run this AFTER schema.sql. Safe to re-run any number of times.
--
--  Fixes two things that did not take effect the first time:
--    1. Row Level Security was not actually enforcing (anonymous inserts and
--       deletes were still succeeding against the live API).
--    2. `revoke select (column)` is a no-op while the role still holds a
--       TABLE-level select grant — which Supabase gives `anon` by default.
--       Column privacy requires revoking the table grant first, then granting
--       back only the safe columns.
--
--  The LAST statement prints a report. Read it: every row must say PASS.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Turn RLS on.
--    (Deliberately NOT using FORCE ROW LEVEL SECURITY: that only changes
--     behaviour for the table *owner*, and the role that got through was
--     `anon`, which is not the owner. FORCE would add risk without fixing
--     the actual hole.)
-- ----------------------------------------------------------------------------
alter table public.tournaments enable row level security;
alter table public.teams       enable row level security;
alter table public.matches     enable row level security;
alter table public.profiles    enable row level security;


-- ----------------------------------------------------------------------------
-- 2. Drop every existing policy on these tables, whatever it is called.
--    A leftover permissive policy (for example one auto-created earlier that
--    allows "true" for everyone) would keep the door open, because multiple
--    permissive policies are OR-ed together.
-- ----------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
      from pg_policies
     where schemaname = 'public'
       and tablename in ('tournaments', 'teams', 'matches', 'profiles')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 3. Re-create the access rules
-- ----------------------------------------------------------------------------

-- ---- PROFILES ----
create policy profiles_public_read on public.profiles
  for select using (true);

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---- TOURNAMENTS ----
-- Everyone may look.
create policy tournaments_public_read on public.tournaments
  for select using (true);

-- Only a signed-in user may create one, stamped as themselves.
create policy tournaments_owner_insert on public.tournaments
  for insert to authenticated
  with check (created_by = auth.uid());

-- Only the creator may change or remove it.
create policy tournaments_owner_update on public.tournaments
  for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy tournaments_owner_delete on public.tournaments
  for delete to authenticated
  using (created_by = auth.uid());

-- ---- TEAMS ----
create policy teams_public_read on public.teams
  for select using (true);

-- Team leaders must be signed in to register.
create policy teams_auth_insert on public.teams
  for insert to authenticated
  with check (registered_by = auth.uid());

create policy teams_captain_or_owner_update on public.teams
  for update to authenticated
  using      (registered_by = auth.uid() or public.is_tournament_owner(tournament_id))
  with check (registered_by = auth.uid() or public.is_tournament_owner(tournament_id));

create policy teams_captain_or_owner_delete on public.teams
  for delete to authenticated
  using (registered_by = auth.uid() or public.is_tournament_owner(tournament_id));

-- ---- MATCHES ----
create policy matches_public_read on public.matches
  for select using (true);

-- Only the organizer of that tournament may score it.
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


-- ----------------------------------------------------------------------------
-- 4. Remove write privileges from anonymous visitors entirely.
--    RLS is the real gate, but there is no reason for `anon` to hold
--    INSERT/UPDATE/DELETE at all. Defence in depth.
-- ----------------------------------------------------------------------------
revoke insert, update, delete on public.tournaments from anon;
revoke insert, update, delete on public.teams       from anon;
revoke insert, update, delete on public.matches     from anon;
revoke insert, update, delete on public.profiles    from anon;

grant insert, update, delete on public.tournaments to authenticated;
grant insert, update, delete on public.teams       to authenticated;
grant insert, update, delete on public.matches     to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Column privacy — THE ACTUAL FIX
--    Revoke the table-wide select first, otherwise per-column revokes do
--    nothing. Then hand back only the columns anonymous visitors may read.
--    Room password and captain phone numbers are deliberately excluded.
-- ----------------------------------------------------------------------------
revoke select on public.tournaments from anon;
revoke select on public.teams       from anon;

grant select (id, name, date, room_id, total_matches, scoring_rules,
              created_by, created_at)
  on public.tournaments to anon;

grant select (id, tournament_id, name, logo, captain, players,
              registered_by, created_at)
  on public.teams to anon;

-- Signed-in users keep full read access (they are participants).
grant select on public.tournaments to authenticated;
grant select on public.teams       to authenticated;
grant select on public.matches     to anon, authenticated;
grant select on public.profiles    to anon, authenticated;


-- ============================================================================
-- 6. VERIFICATION REPORT — every row must read PASS
-- ============================================================================
-- has_table_privilege / has_column_privilege are used instead of the
-- information_schema views because they account for privileges inherited from
-- TABLE-level grants, not just explicit per-column ones. That distinction is
-- exactly what made the first attempt look correct while it was not.
with rls_state as (
  select c.relname::text        as tbl,
         c.relrowsecurity       as enabled,
         (select count(*) from pg_policies p
           where p.schemaname = 'public' and p.tablename = c.relname)::int as policies
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('tournaments', 'teams', 'matches', 'profiles')
)
select 'RLS on + policies: ' || r.tbl as check,
       case when r.enabled and r.policies > 0
            then 'PASS (' || r.policies || ' policies)'
            else 'FAIL (enabled=' || r.enabled || ', policies=' || r.policies || ')'
       end as result
  from rls_state r

union all
select 'anon cannot INSERT into ' || t,
       case when has_table_privilege('anon', 'public.' || t, 'INSERT')
            then 'FAIL' else 'PASS' end
  from unnest(array['tournaments', 'teams', 'matches']) as t

union all
select 'anon cannot DELETE from ' || t,
       case when has_table_privilege('anon', 'public.' || t, 'DELETE')
            then 'FAIL' else 'PASS' end
  from unnest(array['tournaments', 'teams', 'matches']) as t

union all
select 'anon cannot read tournaments.room_password',
       case when has_column_privilege('anon', 'public.tournaments', 'room_password', 'SELECT')
            then 'FAIL' else 'PASS' end

union all
select 'anon cannot read teams.phone',
       case when has_column_privilege('anon', 'public.teams', 'phone', 'SELECT')
            then 'FAIL' else 'PASS' end

union all
select 'anon CAN still read tournaments.name (public browsing works)',
       case when has_column_privilege('anon', 'public.tournaments', 'name', 'SELECT')
            then 'PASS' else 'FAIL' end

order by 1;
