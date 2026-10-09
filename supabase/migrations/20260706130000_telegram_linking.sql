-- ═══════════════════════════════════════════════════════════════════════════════
-- Telegram Account Linking
-- Maps a Telegram from.id to a Purple Bee user, via short-lived link codes.
--
-- Kept as its own isolated tables (not on `profiles`) because the app's real
-- logged-in identity today is one of the 5 static team profiles in
-- userStore.ts (ids 'user-1'..'user-5'), not a row in `profiles`/auth.users.
-- user_id here is TEXT to match that existing convention app-wide.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.telegram_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL UNIQUE,   -- e.g. 'user-1' — matches useUserStore user.id
  telegram_user_id  TEXT UNIQUE,            -- Telegram from.id, as text; null until linked
  linked_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.telegram_link_codes (
  code        TEXT PRIMARY KEY,             -- 6-character single-use code
  user_id     TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_link_codes_user_id ON public.telegram_link_codes(user_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- Dev-mode note: this app has no real Supabase Auth session in its login flow
-- yet (see userStore.ts login()), so there's no auth.uid() to scope these
-- policies to. The anon key is trusted here the same way it already is for
-- chatbot_messages/chatbot_sessions. Tighten once real authenticated sessions
-- exist.
CREATE POLICY "Anon full access to telegram_links"
  ON public.telegram_links FOR ALL
  TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon full access to telegram_link_codes"
  ON public.telegram_link_codes FOR ALL
  TO anon
  USING (true) WITH CHECK (true);
