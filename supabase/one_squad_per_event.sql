-- ============================================================================
--  ONE SQUAD PER PERSON PER EVENT
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
--  Run AFTER schema.sql, fix_rls.sql and groups_chat.sql. Safe to re-run.
--
--  A team leader may register exactly ONE squad in any given tournament.
--  Enforced in the database, so it holds even if someone calls the API
--  directly rather than going through the app.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Report any existing duplicates BEFORE we try to add the constraint.
--    If this returns rows, the index below will fail — resolve them first.
-- ----------------------------------------------------------------------------
do $$
declare
  dupes int;
begin
  select count(*) into dupes
    from (
      select tournament_id, registered_by
        from public.teams
       where registered_by is not null
       group by tournament_id, registered_by
      having count(*) > 1
    ) d;

  if dupes > 0 then
    raise notice
      'Found % user(s) with more than one squad in the same tournament. '
      'The oldest squad of each is kept; the extras are listed below.', dupes;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 2. Keep the earliest squad per person per tournament, detach the rest.
--    Extras are NOT deleted — that would throw away rosters and match scores.
--    Their registered_by is cleared instead, so the organizer can reassign or
--    remove them deliberately.
-- ----------------------------------------------------------------------------
update public.teams
   set registered_by = null
 where id in (
   select id from (
     select id,
            row_number() over (
              partition by tournament_id, registered_by
              order by created_at asc, id asc
            ) as rn
       from public.teams
      where registered_by is not null
   ) ranked
   where ranked.rn > 1
 );


-- ----------------------------------------------------------------------------
-- 3. The rule itself.
--    Partial index: squads with no owner (legacy rows, or ones detached above)
--    are exempt, so many NULLs can coexist.
-- ----------------------------------------------------------------------------
create unique index if not exists teams_one_squad_per_user_per_event
  on public.teams (tournament_id, registered_by)
  where registered_by is not null;


-- ============================================================================
-- 4. VERIFICATION — every row must read PASS
-- ============================================================================
select 'one-squad-per-user index exists' as check,
       case when exists (
         select 1 from pg_indexes
          where schemaname = 'public'
            and indexname = 'teams_one_squad_per_user_per_event'
       ) then 'PASS' else 'FAIL' end as result
union all
select 'no duplicate registrations remain',
       case when not exists (
         select 1 from public.teams
          where registered_by is not null
          group by tournament_id, registered_by
         having count(*) > 1
       ) then 'PASS' else 'FAIL' end
union all
select 'squads currently without an owner (informational)',
       (select count(*)::text from public.teams where registered_by is null)
order by 1;
