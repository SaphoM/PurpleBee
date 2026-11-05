-- ═══════════════════════════════════════════════════════════════════════════════
-- Project Management Enhancements
-- 1. project_tasks.template_id — remembers which template each task came from
--    so the Project Details page can group them into template tabs.
-- 2. projects.template_ids — all templates the project was created with
--    (multi-template projects). template_id stays as the primary template.
-- 3. projects.support_owner_id — Support & Maintenance owner assigned at
--    handover (when the project is marked Completed).
-- 4. 'support' added to project_status enum (Support / Maintenance phase).
-- 5. media_library table — central reusable image library for project
--    logos, company logos and other uploads.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Which template each project task originated from
alter table public.project_tasks
  add column if not exists template_id text;

-- 2. All templates a multi-template project was created with
alter table public.projects
  add column if not exists template_ids text[];

-- 3. Support & Maintenance owner (mirrors project_lead_id FK pattern)
alter table public.projects
  add column if not exists support_owner_id uuid references public.profiles(id) on delete set null;

-- 4. Support / Maintenance status
alter type public.project_status add value if not exists 'support';

-- 5. Central image library
create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  name text not null default 'Image',
  size int,
  type text,
  team_id uuid references public.teams(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_library_team on public.media_library (team_id);
create index if not exists idx_media_library_uploaded_by on public.media_library (uploaded_by);

alter table public.media_library enable row level security;

-- Team members (and admins/managers via is_admin_or_manager) can do everything
create policy "Media library full access for team members"
  on public.media_library for all
  to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
    or uploaded_by = auth.uid()
    or public.is_admin_or_manager()
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
    or uploaded_by = auth.uid()
    or public.is_admin_or_manager()
  );
