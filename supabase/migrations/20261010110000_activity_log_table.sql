-- Activity log — append-only audit trail of meaningful user actions.
-- Used by the Analytics Progress Tracker to power Last Login, Last Upload,
-- Task Completion, Daily Freshness, and inactivity monitoring.
--
-- Collected by the frontend after successful operations and written server-side
-- so no credential or token data ever lands in the log. Outcomes are
-- 'success' or 'failure'; metadata is sanitized to safe, non-sensitive values.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  event_timestamp timestamptz not null default now(),
  record_id uuid null,
  outcome text not null default 'success',
  metadata jsonb null
);

-- Index for fast user + type + timestamp queries (the main access pattern)
create index if not exists idx_activity_log_user_timestamp
  on public.activity_log (user_id, event_timestamp desc);

-- Index for fetching a user's recent activity (timeline view)
create index if not exists idx_activity_log_user_type
  on public.activity_log (user_id, event_type);

-- Comment
comment on table public.activity_log is 'Append-only audit trail of meaningful user actions for Analytics Progress Tracker';
comment on column public.activity_log.event_type is 'Category of event: login, upload, task_completed, etc.';
comment on column public.activity_log.outcome is 'Whether the operation succeeded or failed';
comment on column public.activity_log.metadata is 'Optional sanitized extra data (never credentials, tokens, or PII)';