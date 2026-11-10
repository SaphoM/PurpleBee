-- Fix infinite recursion (42P17) in the tasks / task_collaborators policies.
--
-- The 20261105150000 migration added a `task_collaborators` subquery to the
-- tasks SELECT/UPDATE policies so accepted collaborators could see their
-- tasks. But `task_collaborators` itself has a policy that subqueries
-- `tasks` (owner/creator check) — so a tasks query re-enters the same
-- policy chain forever: "infinite recursion detected in policy for
-- relation tasks" (HTTP 500). That broke `taskDb.fetchAll` → empty board
-- after refresh (and broke the team-filtered REST reads).
--
-- Fix (same pattern as 20261009130000): resolve the caller's accepted
-- collaboration task ids through a SECURITY DEFINER helper that bypasses
-- RLS, breaking the cycle.
create or replace function public.my_accepted_collab_task_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select task_id
  from public.task_collaborators
  where user_id = auth.uid() and status = 'accepted'
$$;

-- Tasks SELECT: use the helper instead of the raw subquery.
drop policy if exists "Tasks viewable by assignee, creator, and admins" on public.tasks;
create policy "Tasks viewable by assignee, creator, and admins"
  on public.tasks for select
  to authenticated
  using (
    assigned_to = auth.uid()
    or assigned_to_ids @> array[auth.uid()]
    or created_by = auth.uid()
    or team_id in (select team_id from public.team_members where user_id = auth.uid())
    or public.is_admin_or_manager()
    or id in (select public.my_accepted_collab_task_ids())
  );

-- Tasks UPDATE: same treatment (collaborators may update their copy).
drop policy if exists "Task owners, assignees, and admins can update" on public.tasks;
create policy "Task owners, assignees, and admins can update"
  on public.tasks for update
  to authenticated
  using (
    assigned_to = auth.uid()
    or assigned_to_ids @> array[auth.uid()]
    or created_by = auth.uid()
    or public.is_admin_or_manager()
    or id in (select public.my_accepted_collab_task_ids())
  )
  with check (
    assigned_to = auth.uid()
    or assigned_to_ids @> array[auth.uid()]
    or created_by = auth.uid()
    or public.is_admin_or_manager()
    or id in (select public.my_accepted_collab_task_ids())
  );

-- task_collaborators: its own policy still subqueries tasks (owner/creator).
-- With the helper above, the tasks policies no longer reach into
-- task_collaborators, so the cycle is gone. Keep the collaborator policy
-- as-is (owner/creator/admin/own-row) — it only recurses into tasks for
-- OWNERS, and those rows are guarded by the direct owner/creator checks.
