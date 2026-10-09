-- Tasks attachments/links columns.
--
-- Root-cause fix for "created tasks vanish after refresh": the app has
-- always sent `attachments` and `links` on task insert (see
-- src/lib/dataService.ts toDbInsert) and reads them back on hydration,
-- but no migration ever created these columns — task inserts failed with
-- PGRST204 ("Could not find the 'attachments' column of 'tasks'") while
-- the UI kept the task in optimistic local state, so it looked created
-- until the next refresh wiped it. (On the old project these columns had
-- been added manually via the dashboard, which is why this only broke on
-- the fresh project.)
alter table public.tasks
  add column if not exists attachments jsonb,
  add column if not exists links jsonb;
