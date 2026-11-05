-- ═══════════════════════════════════════════════════════════════════════════════
-- Multi-assignee support for tasks
-- 1. tasks.assigned_to_ids — array of assignee ids (the multi list).
--    tasks.assigned_to stays as the primary assignee for backwards compat.
-- 2. project_tasks.assigned_to_ids — same, so project tasks also support
--    multiple assignees.
-- 3. RLS: every "assigned_to = auth.uid()" check also accepts membership in
--    assigned_to_ids, so every assignee can see/update their tasks.
-- All additive + idempotent — no existing columns or data are touched.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Board tasks
alter table public.tasks
  add column if not exists assigned_to_ids uuid[] default '{}';

-- 2. Project tasks
alter table public.project_tasks
  add column if not exists assigned_to_ids uuid[] default '{}';

-- Backfill: seed assigned_to_ids from the legacy single column so existing
-- assignments keep working for the array checks below.
update public.tasks set assigned_to_ids = array[assigned_to]
  where assigned_to is not null and (assigned_to_ids is null or assigned_to_ids = '{}');

update public.project_tasks set assigned_to_ids = array[assigned_to]
  where assigned_to is not null and (assigned_to_ids is null or assigned_to_ids = '{}');

-- 3. RLS — add array membership to the existing task policies.

-- SELECT (viewable by assignee/creator/team/admin) — keep if already exists
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tasks' and policyname = 'Tasks viewable by assignee, creator, and admins'
  ) then
    create policy "Tasks viewable by assignee, creator, and admins"
      on public.tasks for select to authenticated
      using (
        assigned_to = auth.uid()
        or assigned_to_ids @> array[auth.uid()]
        or created_by = auth.uid()
        or team_id in (select team_id from public.team_members where user_id = auth.uid())
        or public.is_admin_or_manager()
      );
  end if;
end $$;

-- Replace the SELECT task policy with the array-aware version (create or replace
-- isn't available for policies, so drop-and-recreate is the idempotent route).
drop policy if exists "Tasks viewable by assignee, creator, and admins" on public.tasks;
create policy "Tasks viewable by assignee, creator, and admins"
  on public.tasks for select to authenticated
  using (
    assigned_to = auth.uid()
    or assigned_to_ids @> array[auth.uid()]
    or created_by = auth.uid()
    or team_id in (select team_id from public.team_members where user_id = auth.uid())
    or public.is_admin_or_manager()
  );

-- UPDATE (task owners, assignees, and admins)
drop policy if exists "Task owners, assignees, and admins can update" on public.tasks;
create policy "Task owners, assignees, and admins can update"
  on public.tasks for update to authenticated
  using (
    assigned_to = auth.uid()
    or assigned_to_ids @> array[auth.uid()]
    or created_by = auth.uid()
    or public.is_admin_or_manager()
  )
  with check (
    assigned_to = auth.uid()
    or assigned_to_ids @> array[auth.uid()]
    or created_by = auth.uid()
    or public.is_admin_or_manager()
  );
