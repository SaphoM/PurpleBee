-- Fix: activity_log (created in 20261010110000) never enabled RLS, so the
-- audit trail — including login events with user ids — was readable AND
-- writable by anyone holding the anon key (verified: anonymous REST select
-- returned rows). The app only ever reads and writes its own rows
-- (activityLogDb.insert uses the actor's id, fetchRecent filters
-- .eq('user_id', userId)), so scoping both directions to auth.uid() keeps
-- app behavior identical while closing the exposure.
--
-- Append-only: no UPDATE/DELETE policies on purpose (audit trail).

alter table public.activity_log enable row level security;

drop policy if exists "Users insert own activity log" on public.activity_log;
create policy "Users insert own activity log"
  on public.activity_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users read own activity log" on public.activity_log;
create policy "Users read own activity log"
  on public.activity_log
  for select
  to authenticated
  using (auth.uid() = user_id);
