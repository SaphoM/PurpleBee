-- Fix infinite recursion (42P17) in RLS policies.
--
-- Root-cause fix for reads failing across teams/tasks/projects/chat in live
-- mode: the SELECT policies on `team_members` and `conversation_participants`
-- each ran a subquery against their own table, so Postgres re-entered the
-- same policy forever ("infinite recursion detected in policy"). Every
-- other policy that touches those tables (teams/tasks/projects/messages
-- SELECTs) failed with it too, which is why hydrated data came back empty
-- after every refresh.
--
-- Fix: resolve the caller's own rows through SECURITY DEFINER helpers
-- (which bypass RLS and therefore break the cycle) instead of raw
-- subqueries at the two self-referencing points. All downstream policies
-- become safe without further changes.
create or replace function public.my_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.team_members where user_id = auth.uid()
$$;

create or replace function public.my_conversation_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select conversation_id from public.conversation_participants where user_id = auth.uid()
$$;

drop policy if exists "Team members viewable by team members" on public.team_members;
create policy "Team members viewable by team members"
  on public.team_members for select
  to authenticated
  using (
    team_id in (select public.my_team_ids())
    or public.is_admin_or_manager()
  );

drop policy if exists "Participants visible to conversation members" on public.conversation_participants;
create policy "Participants visible to conversation members"
  on public.conversation_participants for select
  to authenticated
  using (
    conversation_id in (select public.my_conversation_ids())
  );
