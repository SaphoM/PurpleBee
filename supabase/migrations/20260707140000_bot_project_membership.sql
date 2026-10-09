-- ═══════════════════════════════════════════════════════════════════════════════
-- bot_projects / bot_project_members — real, queryable project membership for
-- authenticated (linked) bot users.
--
-- Same reasoning as bot_tasks: the real public.projects/team_members tables
-- require UUID user IDs (FK'd toward auth.users), but this app's identities
-- are text ('user-1'..'user-5') with no real Supabase Auth signup flow yet.
-- bot_projects.id reuses the app's existing mock project IDs (proj-1, proj-2,
-- proj-3) so tasks created against them stay consistent with bot_tasks.project_id
-- and the in-app #tasks?taskId= links. proj-4/proj-5 are bot-only test
-- projects (not present in the frontend mock data) added purely to exercise
-- pagination in testing.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.bot_projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '📁',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bot_project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  TEXT NOT NULL REFERENCES public.bot_projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_bot_project_members_user ON public.bot_project_members(user_id);

ALTER TABLE public.bot_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon full access to bot_projects" ON public.bot_projects
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access to bot_project_members" ON public.bot_project_members
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── Seed projects (3 real + 2 test-only for pagination) ───────────────────
INSERT INTO public.bot_projects (id, name, icon) VALUES
  ('proj-1', 'Client Portal',       '🌐'),
  ('proj-2', 'Winter Campaign',     '📣'),
  ('proj-3', 'Ops & Compliance',    '🛡️'),
  ('proj-4', 'Mobile App Relaunch', '📱'),
  ('proj-5', 'Q4 Roadmap',          '🗺️');

-- ─── Seed membership ─────────────────────────────────────────────────────────
-- user-1: 0 projects   → tests the "not part of any projects" reply
-- user-2: 5 projects   → tests pagination (3 + Show more)
-- user-3: 1 project    → tests single-project (no padding)
-- user-4: 2 projects
-- user-5: 1 project
INSERT INTO public.bot_project_members (project_id, user_id) VALUES
  ('proj-1', 'user-2'),
  ('proj-2', 'user-2'),
  ('proj-3', 'user-2'),
  ('proj-4', 'user-2'),
  ('proj-5', 'user-2'),
  ('proj-3', 'user-3'),
  ('proj-1', 'user-4'),
  ('proj-3', 'user-4'),
  ('proj-3', 'user-5');

-- ─── Seed bot_tasks so the per-project task list is also testable ──────────
-- user-2 in proj-1: 0 tasks   → skip list, straight to new-task title
-- user-2 in proj-2: 2 tasks   → show both + New Task
-- user-2 in proj-3: 1 task
-- user-2 in proj-4: 4 tasks   → pagination (3 + Show more) + New Task always visible
-- user-2 in proj-5: 0 tasks
INSERT INTO public.bot_tasks (user_id, project_id, project_name, title, status, priority, tags, subtasks, source_channel) VALUES
  ('user-2', 'proj-2', 'Winter Campaign',     'Draft social captions',      'todo', 'medium', '{}', '[]', 'telegram'),
  ('user-2', 'proj-2', 'Winter Campaign',     'Review influencer list',     'todo', 'medium', '{}', '[]', 'telegram'),
  ('user-2', 'proj-3', 'Ops & Compliance',    'Renew data processing SLA',  'todo', 'high',   '{}', '[]', 'telegram'),
  ('user-2', 'proj-4', 'Mobile App Relaunch', 'Update app store screenshots','todo', 'low',   '{}', '[]', 'telegram'),
  ('user-2', 'proj-4', 'Mobile App Relaunch', 'Fix push notification bug',  'todo', 'high',  '{}', '[]', 'telegram'),
  ('user-2', 'proj-4', 'Mobile App Relaunch', 'Localize onboarding screens','todo', 'medium', '{}', '[]', 'telegram'),
  ('user-2', 'proj-4', 'Mobile App Relaunch', 'QA pass on iOS 18',          'todo', 'medium', '{}', '[]', 'telegram');
