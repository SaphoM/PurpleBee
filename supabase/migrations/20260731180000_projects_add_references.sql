-- Project References: attachments and categorized links belonging to a
-- project as a whole (discovery meetings, requirements, scope docs,
-- screenshots, etc.), distinct from any individual task's own
-- attachments/links. Stored the same way tasks.attachments/tasks.links
-- already are — JSONB arrays of the full object, no separate table.
alter table public.projects
  add column if not exists attachments jsonb,
  add column if not exists links jsonb;
