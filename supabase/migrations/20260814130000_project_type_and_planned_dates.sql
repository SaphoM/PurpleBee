-- Project Planning: Internal/External Project Type + Planned Start/Completion
-- dates. Additive-only, extends the existing projects table (no new tables,
-- no RLS changes needed — these columns are not sensitive, unlike
-- value/currency, so the existing row-level policies already cover them).
--
-- Deliberately NOT storing time_progress_percentage or
-- task_completion_percentage here — those are always computed at render
-- time (see getProjectTaskStats/getProjectTimeProgress/getProjectPace in
-- src/stores/projectStore.ts) from these dates + live task state, so they
-- can never go stale and update automatically wherever they're shown.

alter table public.projects
  add column if not exists project_type text default 'internal' check (project_type in ('internal','external')),
  add column if not exists planned_start_date date,
  add column if not exists planned_completion_date date;
