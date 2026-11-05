-- ═══════════════════════════════════════════════════════════════════════════════
-- Multi-owner Support & Maintenance (mirrors the multi-assignee pattern).
-- 1. projects.support_owner_ids — array of owner ids (source of truth).
--    projects.support_owner_id stays as the primary for backwards compat.
-- 2. Backfill from the legacy single column so existing handovers keep working.
-- Additive + idempotent — nothing existing is dropped or altered.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.projects
  add column if not exists support_owner_ids uuid[] default '{}';

update public.projects set support_owner_ids = array[support_owner_id]
  where support_owner_id is not null and (support_owner_ids is null or support_owner_ids = '{}');
