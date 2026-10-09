-- ═══════════════════════════════════════════════════════════════════════════════
-- Task Activity Timeline — append-only audit log of task field changes.
--
-- Denormalized (task_title, team_id captured at write time) so history remains
-- visible and correctly scoped after the source task is deleted (task_id uses
-- ON DELETE SET NULL, not CASCADE — deleting a task must not erase its own
-- audit trail). RLS reads team_id/actor_id directly rather than joining back
-- to `tasks`, since a deleted task has no live row to join against.
-- ═══════════════════════════════════════════════════════════════════════════════

create table public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  task_title text not null,
  team_id uuid,
  actor_id uuid not null references auth.users(id),
  actor_name text not null,
  action text not null, -- 'created' | 'updated' | 'deleted' | 'attachment_added' | 'attachment_removed' | 'link_added' | 'link_removed' | 'subtask_changed'
  field text,           -- e.g. 'status', 'priority', 'title', 'description', 'assignedTo', 'dueDate' (null for created/deleted)
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index on public.task_activity (task_id, created_at desc);

alter table public.task_activity enable row level security;

create policy "activity visible to actor, team members, admins" on public.task_activity
  for select using (
    actor_id = auth.uid()
    or team_id in (select team_id from team_members where user_id = auth.uid())
    or is_admin_or_manager()
  );

create policy "actor can insert their own activity" on public.task_activity
  for insert with check (actor_id = auth.uid());
