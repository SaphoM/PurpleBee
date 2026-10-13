-- Create the `invites` table that the invite flow has always referenced but
-- was never created in any migration. Live, inviteDb.create failed with
-- PGRST205 ("Could not find the table 'public.invites'"), so the Team page
-- could not send invites at all.
--
-- Mirrors exactly what src/lib/dataService.ts (inviteDb) and
-- src/pages/InviteAcceptPage.tsx expect:
--   * team_id / invited_by FKs — the FK on invited_by must be auto-named
--     `invites_invited_by_fkey` (it is, via column-name default) because
--     getByToken embeds `profiles!invites_invited_by_fkey`
--   * email, role, department, token (unique), status, expires_at,
--     accepted_by, created_at, updated_at
--
-- Access model (least privilege):
--   * INSERT: an admin/manager OF THE INVITE'S TEAM (or a global
--     admin/manager, matching is_admin_or_manager() used everywhere else).
--   * No direct SELECT/UPDATE policies on the table. The client only ever
--     reads by secret token and accepts through the SECURITY DEFINER
--     helpers below, so nobody can enumerate invites they hold no token
--     for, and a brand-new invitee (role 'user', not a member yet — the
--     team_members RLS only lets admins/managers insert) can still join.

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT,
  role app_role NOT NULL DEFAULT 'user',
  department TEXT DEFAULT 'General',
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Team admins/managers (or a global admin/manager) may create invites into
-- their team — the Team page invite composer is gated the same way.
CREATE POLICY "Team admins/managers create invites"
  ON public.invites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = invites.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('admin', 'manager')
    )
    OR public.is_admin_or_manager()
  );

-- Team members can read their team's invites. Required twice over:
--   * PostgreSQL applies SELECT policies to INSERT ... RETURNING, and
--     inviteDb.create does `.insert(row).select().single()` — without this
--     policy every invite insert failed with 42501 even though WITH CHECK
--     passed ("new row violates row-level security policy").
--   * The team roster (loadAssignableMembers) lists pending invitees so
--     tasks can be pre-assigned to them.
-- Pending invites expose email/role/status only inside the own team; the
-- token stays secret because token reads go through the SECURITY DEFINER
-- helper below, not this policy.
CREATE POLICY "Team members view team invites"
  ON public.invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = invites.team_id
        AND tm.user_id = auth.uid()
    )
    OR public.is_admin_or_manager()
  );

-- ─── Token helpers ───────────────────────────────────────────────────────────
-- Read one invite by its secret token. SECURITY DEFINER so both anon
-- (invitee viewing the accept page before sign-up) and authenticated
-- callers can resolve the token they were given without holding SELECT
-- rights on the table — possession of the exact token is the capability.
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(i.*)
         || jsonb_build_object(
              'teams', (
                SELECT jsonb_build_object('name', t.name)
                FROM public.teams t WHERE t.id = i.team_id
              ),
              'profiles', (
                SELECT jsonb_build_object('name', p.name, 'email', p.email)
                FROM public.profiles p WHERE p.id = i.invited_by
              )
            )
  FROM public.invites i
  WHERE i.token = p_token
$$;

-- Accept an invite: flip its status, join the team, apply the pre-assigned
-- department + role. SECURITY DEFINER because the invitee is a brand-new
-- 'user' (team_members RLS only allows admins/managers to insert) and the
-- invites table has no direct UPDATE policy. The caller must be signed in
-- and act as themselves; the secret token is the capability.
CREATE OR REPLACE FUNCTION public.accept_invite(p_token UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_invite
  FROM public.invites
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.invites
  SET status = 'accepted',
      accepted_by = p_user_id
  WHERE id = v_invite.id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_invite.team_id, p_user_id, v_invite.role)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- Apply the pre-assigned department + role from the invite to the new
  -- member's profile (dual-write mirrors authDb.updateProfile, which keeps
  -- profiles.role and team_members.role in sync when a role is edited).
  UPDATE public.profiles
  SET department = COALESCE(v_invite.department, department),
      role = v_invite.role
  WHERE id = p_user_id;

  RETURN to_jsonb(v_invite)
         || jsonb_build_object('status', 'accepted', 'accepted_by', p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_invite_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.accept_invite(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invite(UUID, UUID) TO authenticated;
