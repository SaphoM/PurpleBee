-- Fix first-time-user team auto-create failing with 42501 (RLS violation).
--
-- Symptom: a user who signs up but has no team yet (no team_members row)
-- triggers the app's getOrCreateTeam flow on login. It inserts a team with
-- created_by = auth.uid(), then adds the user as its admin member. Both
-- writes were blocked because the original policies only let admins and
-- managers create teams / manage membership — so a brand-new 'user'-role
-- account could never obtain a workspace, and every login logged
-- "getOrCreateTeam create team {code: 42501}".
--
-- Fix (additive, least-privilege):
--   1. teams INSERT: any authenticated user may create a team they own
--      (created_by = auth.uid()); admin/manager powers unchanged.
--   2. teams SELECT: the creator can read their own team row (the
--      INSERT ... RETURNING in getOrCreateTeam applies SELECT policies to
--      the returned row, and membership doesn't exist yet at that point).
--   3. team_members INSERT: a user may add ONLY THEMSELVES to a team THEY
--      created. The existing admin/manager FOR ALL policy is untouched.

-- 1. Teams: allow self-owned creation.
drop policy if exists "Admins/managers can create teams" on public.teams;
create policy "Admins/managers can create teams"
  on public.teams for insert
  to authenticated
  with check (
    created_by = auth.uid()
    or public.is_admin_or_manager()
  );

-- 2. Teams: creators can read their own team (needed for INSERT ... RETURNING
--    and for later logins to resolve the team name before membership reads).
drop policy if exists "Teams viewable by members" on public.teams;
create policy "Teams viewable by members"
  on public.teams for select
  to authenticated
  using (
    id in (select public.my_team_ids())
    or created_by = auth.uid()
    or public.is_admin_or_manager()
  );

-- 3. Team members: the creator may add only themselves, only to teams they
--    created. INSERT-only, so the admin/manager FOR ALL policy keeps handling
--    updates/deletes and cross-member management.
drop policy if exists "Users can join teams they created" on public.team_members;
create policy "Users can join teams they created"
  on public.team_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and team_id in (
      select id from public.teams where created_by = auth.uid()
    )
  );
