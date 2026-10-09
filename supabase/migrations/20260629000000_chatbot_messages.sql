-- ═══════════════════════════════════════════════════════════════════════════════
-- Purple Bee Bot — Chatbot Sessions & Messages
-- Stores all in-app Purple Bee Bot conversations and forwards to Telegram
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Chatbot Sessions ────────────────────────────────────────────────────────
-- One session per user per browser session / conversation thread
CREATE TABLE public.chatbot_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_key TEXT NOT NULL,                          -- anonymous fingerprint for non-auth users
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}'             -- browser, page, referrer etc.
);

CREATE INDEX idx_chatbot_sessions_user_id   ON public.chatbot_sessions(user_id);
CREATE INDEX idx_chatbot_sessions_key       ON public.chatbot_sessions(session_key);
CREATE INDEX idx_chatbot_sessions_started   ON public.chatbot_sessions(started_at DESC);

-- ─── Chatbot Messages ────────────────────────────────────────────────────────
-- Every turn in a Purple Bee Bot conversation
CREATE TABLE public.chatbot_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.chatbot_sessions(id) ON DELETE CASCADE,
  sender      TEXT NOT NULL CHECK (sender IN ('user', 'bot')),   -- 'user' or 'bot'
  text        TEXT NOT NULL,
  step        TEXT,                                               -- conversation step e.g. 'ask-title'
  metadata    JSONB NOT NULL DEFAULT '{}',                       -- action buttons, task created, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chatbot_messages_session_id ON public.chatbot_messages(session_id);
CREATE INDEX idx_chatbot_messages_created_at ON public.chatbot_messages(created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.chatbot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own chatbot sessions"
  ON public.chatbot_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can insert chatbot sessions"
  ON public.chatbot_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users see own chatbot messages"
  ON public.chatbot_messages FOR ALL
  TO authenticated
  USING (
    session_id IN (SELECT id FROM public.chatbot_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Anon can insert chatbot messages"
  ON public.chatbot_messages FOR INSERT
  TO anon
  WITH CHECK (true);

-- Admins see everything
CREATE POLICY "Admins see all chatbot sessions"
  ON public.chatbot_sessions FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins see all chatbot messages"
  ON public.chatbot_messages FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager());

-- ─── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_messages;
