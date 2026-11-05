-- ═══════════════════════════════════════════════════════════════════════════════
-- Task Assignment Rework: Single Owner + Invite Collaborators
--
-- 1. task_collaborators.status    — pending | accepted | declined
-- 2. task_collaborators.invited_by — who invited (for notifications)
-- 3. task_collaborators.my_progress — the collaborator's OWN contribution
--    percentage (0-100), completely separate from tasks.progress.
--
-- RLS: the existing collaborator policy only lets the OWNER see everyone.
-- Extend it so ACCEPTED collaborators can see the task + their own row
-- (needed so the task shows in their Tasks list and they can read it).
-- All additive + idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Invite lifecycle status
alter table public.task_collaborators
  add column if not exists status text not null default 'accepted'
    check (status in ('pending', 'accepted', 'declined'));

-- 2. Who invited (for the "owner is notified of the response" flow)
alter table public.task_collaborators
  add column if not exists invited_by uuid references public.profiles(id) on delete set null;

-- 3. Per-collaborator progress (their contribution, NOT the task progress)
alter table public.task_collaborators
  add column if not exists my_progress int not null default 0
    check (my_progress >= 0 and my_progress <= 100);

-- New collaborators default to pending (the invite flow). Rows created by
-- older code paths (direct adds) should be updated to accepted by the app,
-- but existing rows keep 'accepted' via the column default above.
-- To make pending the default for NEW rows while keeping old rows accepted,
-- we need the DB default to flip. Flip it now: new inserts default pending.
alter table public.task_collaborators alter column status set default 'pending';

-- 4. Backfill: existing collaborator rows are accepted by definition (there
-- are none in production yet, but be safe).
update public.task_collaborators set status = 'accepted' where status is null;

-- 5. RLS: let accepted collaborators read their tasks + rows.
drop policy if exists "Task collaborators follow parent task access" on public.task_collaborators;
create policy "Task collaborators follow parent task access" on public.task_collaborators
  for all to authenticated
  using (
    task_id in (
      select id from public.tasks
      where assigned_to = auth.uid()
         or assigned_to_ids @> array[auth.uid()]
         or created_by = auth.uid()
    )
    or user_id = auth.uid()
    or public.is_admin_or_manager()
  )
  with check (
    task_id in (
      select id from public.tasks
      where assigned_to = auth.uid()
         or assigned_to_ids @> array[auth.uid()]
         or created_by = auth.uid()
    )
    or user_id = auth.uid()
    or public.is_admin_or_manager()
  );

-- 6. Accepted collaborators must be able to READ the parent task.
-- The tasks SELECT policy uses assigned_to / assigned_to_ids / team / admin —
-- it does NOT include accepted collaborators. Add a has-collaborator check.
-- (Drop + recreate both read/update policies with the extra clause.)
drop policy if exists "Tasks viewable by assignee, creator, and admins" on public.tasks;
create policy "Tasks viewable by assignee, creator, and admins" on public.tasks
  for select to authenticated
  using (
    assigned_to = auth.uid()
    or assigned_to_ids @> array[auth.uid()]
    or created_by = auth.uid()
    or team_id in (select team_id from public.team_members where user_id = auth.uid())
    or public.is_admin_or_manager()
    or id in (
      select task_id from public.task_collaborators
      where user_id = auth.uid() and status = 'accepted'
    )
  );

drop policy if exists "Task owners, assignees, and admins can update" on public.tasks;
create policy "Task owners, assignees, and admins can update" on public.tasks
  for update to authenticated
  using (
    assigned_to = auth.uid()
    or assigned_to_ids @> array[auth.uid()]
    or created_by = auth.uid()
    or public.is_admin_or_manager()
    or id in (
      select task_id from public.task_collaborators
      where user_id = auth.uid() and status = 'accepted'
    )
  )
  with check (
    assigned_to = auth.uid()
    or assigned_to_ids @> array[auth.uid()]
    or created_by = auth.uid()
    or public.is_admin_or_manager()
    or id in (
      select task_id from public.task_collaborators
      where user_id = auth.uid() and status = 'accepted'
    )
  );
