-- WhatsApp-style chat receipts + presence persistence.
--
-- 1) message_reads is the delivery/seen ledger: a row existing = "delivered"
--    (double grey tick), read_at set = "seen" (double blue tick). Until now
--    nothing wrote to it and the UI's readBy was hardcoded to the sender.
--    RLS only let users read their OWN rows, so senders could never see the
--    receipts others wrote on their messages — add a participants policy
--    (my_conversation_ids() is SECURITY DEFINER, so no recursion).
-- 2) Realtime for message_reads so ticks update live on the sender's screen.
-- 3) profiles.last_seen_at: persisted "last seen" (heartbeat + presence),
--    instead of the old in-memory value that vanished on refresh.

-- ── profiles.last_seen_at ────────────────────────────────────────────
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- ── message_reads: one row per (message, reader) ─────────────────────
alter table public.message_reads
  add constraint message_reads_message_user_key unique (message_id, user_id);

drop policy if exists "Participants can view conversation receipts" on public.message_reads;
create policy "Participants can view conversation receipts"
  on public.message_reads
  for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.conversation_id in (select public.my_conversation_ids())
    )
  );

-- ── Realtime: live tick updates for the sender ───────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reads'
  ) then
    alter publication supabase_realtime add table public.message_reads;
  end if;
end $$;
