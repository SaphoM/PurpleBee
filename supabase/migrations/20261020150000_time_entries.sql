-- Time tracking: one row per timer session started from the task detail
-- modal's Time Tracking section.
--
-- tasks.actual_hours is kept in sync by a trigger (sum of the task's
-- entries ÷ 60), so every surface that already reads tasks — the Analytics
-- "Time Tracking Summary" card, task cards — shows real tracked time
-- without a second data source.
--
-- RLS mirrors the tasks table's own policies (most tasks here are legacy
-- rows with team_id IS NULL, so a team-only policy would make timers
-- unusable): an entry is visible to whoever can see its task, plus its
-- owner; only the owner may write their own rows.

create table if not exists public.time_entries (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid not null references public.tasks (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_minutes numeric(10,2) not null default 0,
  created_at       timestamptz not null default now()
);

-- At most ONE running timer per user (ended_at null = running).
create unique index if not exists time_entries_active_user_idx
  on public.time_entries (user_id) where ended_at is null;

create index if not exists time_entries_task_idx on public.time_entries (task_id);
create index if not exists time_entries_user_idx on public.time_entries (user_id, started_at desc);

-- SECURITY DEFINER helper so policies can reuse the tasks SELECT rule
-- without triggering tasks' own RLS (mirrors the my_team_ids() pattern).
create or replace function public.can_view_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = p_task_id
      and (
        t.assigned_to = auth.uid()
        or t.created_by = auth.uid()
        or t.team_id in (select public.my_team_ids())
        or is_admin_or_manager()
      )
  );
$$;

revoke all on function public.can_view_task(uuid) from public, anon;
grant execute on function public.can_view_task(uuid) to authenticated;

alter table public.time_entries enable row level security;

drop policy if exists "Task viewers read time entries" on public.time_entries;
create policy "Task viewers read time entries"
  on public.time_entries for select
  to authenticated
  using (user_id = auth.uid() or public.can_view_task(task_id));

drop policy if exists "Users insert own time entries" on public.time_entries;
create policy "Users insert own time entries"
  on public.time_entries for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_view_task(task_id));

drop policy if exists "Users update own time entries" on public.time_entries;
create policy "Users update own time entries"
  on public.time_entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users delete own time entries" on public.time_entries;
create policy "Users delete own time entries"
  on public.time_entries for delete
  to authenticated
  using (user_id = auth.uid());

-- Keep tasks.actual_hours = (sum of this task's duration_minutes ÷ 60) so
-- the Analytics summary and task UI never drift from the entry log.
create or replace function public.sync_task_actual_hours()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tasks t
  set actual_hours = round(
    coalesce(
      (
        select sum(e.duration_minutes)
        from public.time_entries e
        where e.task_id = coalesce(new.task_id, old.task_id)
      ),
      0
    ) / 60.0,
    2
  )
  where t.id = coalesce(new.task_id, old.task_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists time_entries_sync_actual_hours on public.time_entries;
create trigger time_entries_sync_actual_hours
  after insert or update or delete
  on public.time_entries
  for each row
  execute function public.sync_task_actual_hours();
