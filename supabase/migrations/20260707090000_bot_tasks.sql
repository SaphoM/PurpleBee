-- ═══════════════════════════════════════════════════════════════════════════════
-- bot_tasks — durable storage for tasks created by authenticated (linked)
-- Telegram users in "database mode".
--
-- Kept separate from public.tasks on purpose: that table's assigned_to /
-- created_by are UUID (FK to auth.users), but the app's identities are text
-- ('user-1'..'user-5'), so text IDs can't be written there. bot_tasks uses
-- text throughout and carries telegram_chat_id so we always know which
-- Telegram chat + Purple Bee user each row belongs to.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.bot_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,              -- linked Purple Bee user, e.g. 'user-2'
  telegram_chat_id  TEXT,                        -- the Telegram chat this came from
  project_id        TEXT,
  project_name      TEXT,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'todo',
  priority          TEXT NOT NULL DEFAULT 'medium',
  due_date          TIMESTAMPTZ,
  estimated_hours   NUMERIC,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  subtasks          JSONB NOT NULL DEFAULT '[]',
  source_channel    TEXT NOT NULL DEFAULT 'telegram',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bot_tasks_user_id  ON public.bot_tasks(user_id);
CREATE INDEX idx_bot_tasks_chat_id  ON public.bot_tasks(telegram_chat_id);
CREATE INDEX idx_bot_tasks_project  ON public.bot_tasks(project_id);

ALTER TABLE public.bot_tasks ENABLE ROW LEVEL SECURITY;

-- Same trust model as telegram_links / chatbot_messages (no real auth session
-- yet). Tighten once authenticated Supabase sessions exist.
CREATE POLICY "Anon full access to bot_tasks"
  ON public.bot_tasks FOR ALL
  TO anon
  USING (true) WITH CHECK (true);
