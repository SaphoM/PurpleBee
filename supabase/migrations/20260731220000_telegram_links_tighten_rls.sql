-- Remove the wide-open anon-full-access policies dating from before real
-- Supabase Auth existed (see the original 20260706130000_telegram_linking.sql
-- comment: "Tighten once real authenticated sessions exist" — they now do).
-- All reads/writes to these tables now go exclusively through service-role
-- Edge Functions (telegram-link, telegram-webhook, send-telegram-notification),
-- which bypass RLS entirely — so no client-side policy is needed. Default
-- deny is correct and simplest.
drop policy if exists "Anon full access to telegram_links" on public.telegram_links;
drop policy if exists "Anon full access to telegram_link_codes" on public.telegram_link_codes;

-- Clean up stale test data from the old static 5-profile mock identity
-- system (user_id = 'user-1'), which predates real Supabase Auth and can
-- never resolve to a real recipient.
delete from public.telegram_links where user_id = 'user-1';
