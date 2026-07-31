-- Notification preferences (in-app/email + per-category toggles) synced to
-- the account, not just localStorage on one browser. Also read by the
-- send-email-notification edge function to decide whether to email a user.
alter table public.profiles
  add column if not exists notification_preferences jsonb;
