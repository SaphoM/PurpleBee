-- ═══════════════════════════════════════════════════════════════════════════════
-- project_task_collaborators — lossless home for non-owner assignees of
-- PROJECT checklist tasks (the migrations 20261105150000/…160000 truncated
-- project_tasks.assigned_to_ids to the single owner; the extras that were
-- captures in the pre-migration dump are restored here as ACCEPTED rows).
-- Mirrors task_collaborators exactly.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.project_task_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_task_id uuid not null references public.project_tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'helper' check (role in ('helper', 'reviewer')),
  status text not null default 'accepted' check (status in ('pending', 'accepted', 'declined')),
  invited_by uuid references public.profiles(id) on delete set null,
  my_progress int not null default 0 check (my_progress >= 0 and my_progress <= 100),
  added_at timestamptz not null default now(),
  unique (project_task_id, user_id)
);

create index if not exists idx_ptc_project_task on public.project_task_collaborators (project_task_id);
create index if not exists idx_ptc_user on public.project_task_collaborators (user_id);

alter table public.project_task_collaborators enable row level security;

drop policy if exists "Project task collaborators follow project access" on public.project_task_collaborators;
create policy "Project task collaborators follow project access" on public.project_task_collaborators
  for all to authenticated
  using (
    project_task_id in (
      select pt.id from public.project_tasks pt
      join public.projects p on p.id = pt.project_id
      where p.created_by = auth.uid()
         or p.team_id in (select team_id from public.team_members where user_id = auth.uid())
    )
    or user_id = auth.uid()
    or public.is_admin_or_manager()
  )
  with check (
    project_task_id in (
      select pt.id from public.project_tasks pt
      join public.projects p on p.id = pt.project_id
      where p.created_by = auth.uid()
         or p.team_id in (select team_id from public.team_members where user_id = auth.uid())
    )
    or user_id = auth.uid()
    or public.is_admin_or_manager()
  );

-- ── Restore the KNOWN pre-migration extras as accepted collaborators ──────
-- Captured in the pre-migration dump (project + task title + extra ids).
-- BeeHive | PurpleBee: extras were 44aee828 (Kgothatso) + 75c337d3 (Thimna)
-- on 11 tasks; owner kept 914901a5 (Kelly).
insert into public.project_task_collaborators (project_task_id, user_id, role, status, my_progress)
select pt.id, extra::uuid, 'helper', 'accepted', 0
from public.project_tasks pt
join public.projects p on p.id = pt.project_id,
     lateral unnest(array['44aee828-c5ac-40ee-b175-7bd7c786d214', '75c337d3-9945-4b1e-a4d6-ae36952b5a39']::uuid[]) as extra
where p.name = 'BeeHive | PurpleBee'
  and pt.title in (
    'Deployment & monitoring', 'Database schema design', 'State management setup',
    'Authentication & authorization', 'Frontend pages & routing', 'API development',
    'Project setup & repository init', 'Product Requirements Document (PRD)',
    'Design system & UI kit', 'Responsive design & mobile', 'Testing & QA'
  )
on conflict (project_task_id, user_id) do nothing;

-- Client Project Manager Portal: extra was a39268c7 (Nomvelo) on the 9 tasks
-- captured in the dump; owner kept efcdc30f (Musa).
insert into public.project_task_collaborators (project_task_id, user_id, role, status, my_progress)
select pt.id, 'a39268c7-546e-47f3-a697-f1549690e514'::uuid, 'helper', 'accepted', 0
from public.project_tasks pt
join public.projects p on p.id = pt.project_id
where p.name = 'Client Project Manager Portal'
  and pt.title in (
    'State management setup', 'Authentication & authorization', 'Database schema design',
    'Deployment & monitoring', 'Product Requirements Document (PRD)', 'Design system & UI kit',
    'Frontend pages & routing', 'Testing & QA', 'Project setup & repository init'
  )
on conflict (project_task_id, user_id) do nothing;
