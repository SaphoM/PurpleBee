-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds a progress column to bot_tasks, matching public.tasks.progress.
-- Needed for the Edit Task feature's progress +/- controls in database mode
-- (linked Telegram users) — bot_tasks previously had no way to track this.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.bot_tasks
  ADD COLUMN progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
