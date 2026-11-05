-- Single-owner invariants at the database level (verified live 5 Nov 2026):
-- tasks / project_tasks can never hold 2+ owners; projects can never hold 2+ support owners.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tasks_single_owner') THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_single_owner CHECK (assigned_to_ids IS NULL OR cardinality(assigned_to_ids) <= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='project_tasks_single_owner') THEN
    ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_single_owner CHECK (assigned_to_ids IS NULL OR cardinality(assigned_to_ids) <= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projects_single_support_owner') THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_single_support_owner CHECK (support_owner_ids IS NULL OR cardinality(support_owner_ids) <= 1);
  END IF;
END $$;
