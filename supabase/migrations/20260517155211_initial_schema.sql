-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  Purple Bee — Supabase Database Schema                                      ║
-- ║  Full production schema with RLS policies, indexes, and triggers            ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Custom Types (Enums) ─────────────────────────────────────────────────────
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE task_status AS ENUM ('todo', 'in-progress', 'review', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE recurring_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'yearly');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on-hold', 'completed');
CREATE TYPE conversation_type AS ENUM ('task', 'dm', 'team', 'announcement');
CREATE TYPE notification_type AS ENUM ('task-assigned', 'task-due', 'task-completed', 'mention', 'update', 'ai-insight', 'project-invite');
CREATE TYPE integration_type AS ENUM ('whatsapp', 'telegram', 'slack', 'calendar', 'email');
CREATE TYPE ai_insight_type AS ENUM ('recommendation', 'warning', 'suggestion', 'forecast');
CREATE TYPE report_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE link_type AS ENUM ('link', 'figma', 'github', 'notion', 'google-doc', 'other');
CREATE TYPE view_mode AS ENUM ('kanban', 'list', 'calendar', 'timeline');


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1: CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Users / Profiles ─────────────────────────────────────────────────────────
-- Extends Supabase Auth (auth.users). This is the app-level profile.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role app_role NOT NULL DEFAULT 'user',
  title TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Helper functions (must exist before RLS policies reference them) ─────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── Teams ────────────────────────────────────────────────────────────────────
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Team Members (junction) ──────────────────────────────────────────────────
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- ─── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT NOT NULL DEFAULT '#7c3aed',
  template_id TEXT,
  status project_status NOT NULL DEFAULT 'planning',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency recurring_frequency,
  recurring_end_date TIMESTAMPTZ,
  recurring_days_of_week INT[], -- 0-6 (Sun-Sat)
  estimated_hours NUMERIC(6, 2),
  actual_hours NUMERIC(6, 2),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Task Collaborators ──────────────────────────────────────────────────────
CREATE TYPE collaborator_role AS ENUM ('helper', 'reviewer');

CREATE TABLE public.task_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role collaborator_role NOT NULL DEFAULT 'helper',
  allocated_minutes INT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_task_collaborators_task_id ON public.task_collaborators(task_id);
CREATE INDEX idx_task_collaborators_user_id ON public.task_collaborators(user_id);

-- RLS for task_collaborators
ALTER TABLE public.task_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task collaborators follow parent task access"
  ON public.task_collaborators FOR ALL
  TO authenticated
  USING (
    task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid() OR created_by = auth.uid())
    OR user_id = auth.uid()
    OR public.is_admin_or_manager()
  );

-- ─── Subtasks ─────────────────────────────────────────────────────────────────
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Attachments ──────────────────────────────────────────────────────────────
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  message_id UUID, -- FK added after messages table
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL, -- MIME type
  size BIGINT NOT NULL DEFAULT 0,
  preview_url TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Task Links ───────────────────────────────────────────────────────────────
CREATE TABLE public.task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type link_type NOT NULL DEFAULT 'link',
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Progress Notes ───────────────────────────────────────────────────────────
CREATE TABLE public.progress_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  progress INT NOT NULL CHECK (progress >= 0 AND progress <= 100),
  trigger TEXT NOT NULL, -- 'drag', 'slider', 'mini-task', 'quick-set'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Project Tasks (template-driven tasks within a project) ───────────────────
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  estimated_hours NUMERIC(6, 2) NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  "order" INT NOT NULL DEFAULT 0,
  linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2: CHAT & MESSAGING
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Conversations ────────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL DEFAULT 'dm',
  name TEXT NOT NULL,
  description TEXT,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  task_title TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Conversation Participants ────────────────────────────────────────────────
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  unread_count INT NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for attachments.message_id now that messages table exists
ALTER TABLE public.attachments
  ADD CONSTRAINT fk_attachments_message
  FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

-- ─── Message Read Receipts ────────────────────────────────────────────────────
CREATE TABLE public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- ─── Message Reactions ────────────────────────────────────────────────────────
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3: NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4: INTEGRATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type integration_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, type)
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5: AI INSIGHTS & ANALYTICS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type ai_insight_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  actionable BOOLEAN NOT NULL DEFAULT false,
  suggested_action TEXT,
  confidence INT NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Focus Sessions ───────────────────────────────────────────────────────────
CREATE TABLE public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  duration INT NOT NULL, -- planned duration in minutes
  actual_duration INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  breaks INT NOT NULL DEFAULT 0,
  distractions INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false
);

-- ─── Reports ──────────────────────────────────────────────────────────────────
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type report_type NOT NULL,
  period TEXT NOT NULL, -- e.g. '2026-W20', '2026-05', '2026-05-17'
  data JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6: CALENDAR
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  color TEXT,
  all_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 7: USER SETTINGS & PREFERENCES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  show_tips BOOLEAN NOT NULL DEFAULT true,
  has_seen_welcome_tips BOOLEAN NOT NULL DEFAULT false,
  view_mode view_mode NOT NULL DEFAULT 'kanban',
  notification_email BOOLEAN NOT NULL DEFAULT true,
  notification_push BOOLEAN NOT NULL DEFAULT true,
  notification_sound BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 8: INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Profiles
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Tasks
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_status_priority ON public.tasks(status, priority);
CREATE INDEX idx_tasks_search ON public.tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Subtasks
CREATE INDEX idx_subtasks_task_id ON public.subtasks(task_id);

-- Project Tasks
CREATE INDEX idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX idx_project_tasks_assigned_to ON public.project_tasks(assigned_to);

-- Conversations & Messages
CREATE INDEX idx_conversations_type ON public.conversations(type);
CREATE INDEX idx_conversations_team_id ON public.conversations(team_id);
CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE NOT read;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Integrations
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);

-- AI Insights
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_ai_insights_created_at ON public.ai_insights(created_at DESC);

-- Focus Sessions
CREATE INDEX idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_task_id ON public.focus_sessions(task_id);

-- Calendar Events
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_dates ON public.calendar_events(start_date, end_date);

-- Team Members
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 9: TRIGGERS (auto-update updated_at)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with an updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 10: AUTO-CREATE PROFILE ON AUTH SIGNUP
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || split_part(NEW.email, '@', 1)),
    'user'
  );

  -- Auto-create user settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 11: ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- ─── Teams ────────────────────────────────────────────────────────────────────
CREATE POLICY "Teams viewable by members"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR public.is_admin_or_manager()
  );

CREATE POLICY "Admins/managers can create teams"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins/managers can update teams"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete teams"
  ON public.teams FOR DELETE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ─── Team Members ─────────────────────────────────────────────────────────────
CREATE POLICY "Team members viewable by team members"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR public.is_admin_or_manager()
  );

CREATE POLICY "Admins/managers manage team membership"
  ON public.team_members FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- ─── Projects ─────────────────────────────────────────────────────────────────
CREATE POLICY "Projects viewable by team members and admins"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
    OR public.is_admin_or_manager()
  );

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Project owners and admins can update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_manager());

CREATE POLICY "Project owners and admins can delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_manager());

-- ─── Tasks ────────────────────────────────────────────────────────────────────
CREATE POLICY "Tasks viewable by assignee, creator, and admins"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR public.is_admin_or_manager()
  );

CREATE POLICY "Authenticated users can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Task owners, assignees, and admins can update"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin_or_manager()
  );

CREATE POLICY "Admins/managers can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager() OR created_by = auth.uid());

-- ─── Subtasks ─────────────────────────────────────────────────────────────────
CREATE POLICY "Subtasks follow parent task access"
  ON public.subtasks FOR ALL
  TO authenticated
  USING (
    task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid() OR created_by = auth.uid())
    OR public.is_admin_or_manager()
  );

-- ─── Attachments ──────────────────────────────────────────────────────────────
CREATE POLICY "Attachments follow parent access"
  ON public.attachments FOR ALL
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid() OR created_by = auth.uid())
    OR public.is_admin_or_manager()
  );

-- ─── Task Links ───────────────────────────────────────────────────────────────
CREATE POLICY "Task links follow parent task access"
  ON public.task_links FOR ALL
  TO authenticated
  USING (
    task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid() OR created_by = auth.uid())
    OR public.is_admin_or_manager()
  );

-- ─── Progress Notes ───────────────────────────────────────────────────────────
CREATE POLICY "Progress notes follow parent task access"
  ON public.progress_notes FOR ALL
  TO authenticated
  USING (
    task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid() OR created_by = auth.uid())
    OR public.is_admin_or_manager()
  );

-- ─── Project Tasks ────────────────────────────────────────────────────────────
CREATE POLICY "Project tasks follow project access"
  ON public.project_tasks FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE created_by = auth.uid()
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
    OR public.is_admin_or_manager()
  );

-- ─── Conversations ───────────────────────────────────────────────────────────
CREATE POLICY "Users see conversations they participate in"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
    OR public.is_admin_or_manager()
  );

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

-- ─── Conversation Participants ────────────────────────────────────────────────
CREATE POLICY "Participants visible to conversation members"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join/manage participants"
  ON public.conversation_participants FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_manager());

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE POLICY "Messages visible to conversation participants"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages or admins"
  ON public.messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() OR public.is_admin_or_manager());

-- ─── Message Reads ────────────────────────────────────────────────────────────
CREATE POLICY "Users manage own read receipts"
  ON public.message_reads FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Message Reactions ────────────────────────────────────────────────────────
CREATE POLICY "Reactions visible to conversation participants"
  ON public.message_reactions FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own reactions"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own reactions"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications (mark read)"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Integrations ─────────────────────────────────────────────────────────────
CREATE POLICY "Users manage own integrations"
  ON public.integrations FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── AI Insights ──────────────────────────────────────────────────────────────
CREATE POLICY "Users see own insights"
  ON public.ai_insights FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create insights"
  ON public.ai_insights FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can dismiss own insights"
  ON public.ai_insights FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Focus Sessions ───────────────────────────────────────────────────────────
CREATE POLICY "Users manage own focus sessions"
  ON public.focus_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Reports ──────────────────────────────────────────────────────────────────
CREATE POLICY "Users see own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_manager());

CREATE POLICY "System can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ─── Calendar Events ──────────────────────────────────────────────────────────
CREATE POLICY "Users manage own calendar events"
  ON public.calendar_events FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── User Settings ────────────────────────────────────────────────────────────
CREATE POLICY "Users manage own settings"
  ON public.user_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 12: REALTIME SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 13: STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('attachments', 'attachments', false, 52428800, NULL),
  ('project-assets', 'project-assets', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can view attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can upload project assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-assets');

CREATE POLICY "Authenticated users can view project assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-assets');


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 14: UTILITY FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Get task metrics for a user (used by dashboard/analytics)
CREATE OR REPLACE FUNCTION public.get_task_metrics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress_tasks', COUNT(*) FILTER (WHERE status = 'in-progress'),
    'overdue_tasks', COUNT(*) FILTER (WHERE due_date < now() AND status != 'completed'),
    'completion_rate', CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed'))::NUMERIC / COUNT(*) * 100, 1)
      ELSE 0
    END
  ) INTO result
  FROM public.tasks
  WHERE assigned_to = p_user_id OR created_by = p_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get team metrics
CREATE OR REPLACE FUNCTION public.get_team_metrics(p_team_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_members', (SELECT COUNT(*) FROM public.team_members WHERE team_id = p_team_id),
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress_tasks', COUNT(*) FILTER (WHERE status = 'in-progress'),
    'overdue_tasks', COUNT(*) FILTER (WHERE due_date < now() AND status != 'completed'),
    'avg_completion_rate', CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed'))::NUMERIC / COUNT(*) * 100, 1)
      ELSE 0
    END
  ) INTO result
  FROM public.tasks
  WHERE team_id = p_team_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Search across tasks, projects, and people (global search)
CREATE OR REPLACE FUNCTION public.global_search(search_query TEXT, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'tasks', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', t.id, 'title', t.title, 'status', t.status, 'priority', t.priority
      )), '[]'::json)
      FROM public.tasks t
      WHERE (t.title ILIKE '%' || search_query || '%' OR t.description ILIKE '%' || search_query || '%')
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id OR public.is_admin_or_manager())
      LIMIT 5
    ),
    'projects', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', p.id, 'name', p.name, 'status', p.status
      )), '[]'::json)
      FROM public.projects p
      WHERE (p.name ILIKE '%' || search_query || '%' OR p.description ILIKE '%' || search_query || '%')
      LIMIT 5
    ),
    'people', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', pr.id, 'name', pr.name, 'email', pr.email, 'title', pr.title
      )), '[]'::json)
      FROM public.profiles pr
      WHERE pr.name ILIKE '%' || search_query || '%' OR pr.email ILIKE '%' || search_query || '%'
      LIMIT 5
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Schema is ready for Purple Bee.
-- ═══════════════════════════════════════════════════════════════════════════════
