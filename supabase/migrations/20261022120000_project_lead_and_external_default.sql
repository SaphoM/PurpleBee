-- ═══════════════════════════════════════════════════════════════════════════════
-- Project Lead + External-by-default project type (user-requested).
--
-- 1. project_lead_id — the single member accountable for the project,
--    assigned under the "Project Planning, Value & Card Display" section of
--    the Create wizard and Edit modal (and in the wizard's assign step).
--    Nullable, mirrors projects.created_by's FK exactly (profiles, ON DELETE
--    SET NULL — deleting a member must not delete the project row). Not
--    sensitive, so no RLS changes needed — same reasoning as
--    20260814130000_project_type_and_planned_dates.sql.
--
-- 2. project_type default flips internal → external: new projects should
--    default to External (client/customer work) unless the creator says
--    otherwise. Existing rows are deliberately NOT rewritten — only the
--    default for inserts that omit the column changes.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.projects
  add column if not exists project_lead_id uuid references public.profiles(id) on delete set null;

alter table public.projects alter column project_type set default 'external';
