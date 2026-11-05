-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration for: Task Assignment Rework (Single Owner + Invite Collaborators)
--
-- Finds every task assigned to 2+ people, keeps the FIRST assignee as the
-- single owner, and converts the rest into ACCEPTED collaborators so nobody
-- loses the task. Includes an admin-facing summary (a view + a function).
--
-- BOARD tasks (public.tasks):
--   extra assignees -> task_collaborators rows (status='accepted', invited_by=null,
--   my_progress=0). tasks.assigned_to / assigned_to_ids truncated to [first].
--
-- PROJECT tasks (public.project_tasks) have no collaborator table of their own.
-- Their extra assignees become accepted collaborators on the LINKED board
-- task when one exists (linked_task_id IS NOT NULL). Unlinked project tasks
-- (which can't carry collaborators anywhere) keep only the owner — they are
-- listed in the migration summary so an admin can re-invite manually.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Summary view (admin-visible)
create or replace view public.multi_assign_migration_summary as
select
  'tasks' as kind,
  t.id as task_id,
  t.title,
  cardinality(t.assigned_to_ids) as owner_count,
  t.assigned_to_ids[1] as owner_id,
  t.assigned_to_ids[2:] as extra_ids,
  (select count(*) from public.task_collaborators c
    where c.task_id = t.id and c.status = 'accepted') as collab_converted
from public.tasks t
where t.assigned_to_ids is not null and cardinality(t.assigned_to_ids) > 1
union all
select
  'project_tasks' as kind,
  pt.id as task_id,
  pt.title || ' (' || p.name || ')' as title,
  cardinality(pt.assigned_to_ids) as owner_count,
  pt.assigned_to_ids[1] as owner_id,
  pt.assigned_to_ids[2:] as extra_ids,
  (case when pt.linked_task_id is not null
    then (select count(*) from public.task_collaborators c
          where c.task_id = pt.linked_task_id and c.status = 'accepted')
    else 0 end) as collab_converted
from public.project_tasks pt
join public.projects p on p.id = pt.project_id
where pt.assigned_to_ids is not null and cardinality(pt.assigned_to_ids) > 1;

-- ── 1. Board tasks: insert accepted collaborators for extras ──────────────
insert into public.task_collaborators (task_id, user_id, role, status, invited_by, my_progress)
select t.id, extra::uuid, 'helper', 'accepted', null, 0
from public.tasks t,
     lateral unnest(t.assigned_to_ids[2:]) as extra
where t.assigned_to_ids is not null and cardinality(t.assigned_to_ids) > 1
on conflict (task_id, user_id) do nothing;

-- ── 2. Project tasks (linked only): extras -> collaborators on linked board task ──
insert into public.task_collaborators (task_id, user_id, role, status, invited_by, my_progress)
select pt.linked_task_id, extra::uuid, 'helper', 'accepted', null, 0
from public.project_tasks pt,
     lateral unnest(pt.assigned_to_ids[2:]) as extra
where pt.assigned_to_ids is not null
  and cardinality(pt.assigned_to_ids) > 1
  and pt.linked_task_id is not null
on conflict (task_id, user_id) do nothing;

-- ── 3. Truncate every multi-owner to the single (first) owner ──────────────
update public.tasks
   set assigned_to_ids = array[assigned_to_ids[1]],
       assigned_to = assigned_to_ids[1]
 where assigned_to_ids is not null and cardinality(assigned_to_ids) > 1;

update public.project_tasks
   set assigned_to_ids = array[assigned_to_ids[1]],
       assigned_to = assigned_to_ids[1]
 where assigned_to_ids is not null and cardinality(assigned_to_ids) > 1;
