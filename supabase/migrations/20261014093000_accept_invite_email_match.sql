-- Fix: accept_invite did not verify that the accepting account belongs to the
-- invited email. Any signed-in user who opened someone else's invite link
-- could consume it (status -> accepted, accepted_by = them), join the team
-- with the invite's role, AND have their own profile role/department
-- overwritten by the invite's values (e.g. an admin accepting a 'user'
-- invite silently downgraded themselves).
--
-- Only enforced when invites.email is present — the column is nullable and a
-- null email keeps its original capability-token semantics.

CREATE OR REPLACE FUNCTION public.accept_invite(p_token uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.invites%ROWTYPE;
  v_caller_email text;
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

  -- The invite is addressed to a specific email: only that address's account
  -- may consume it. (Kept server-side so no client path — auto-accept after
  -- magic link, pending-token replay after login, manual accept button — can
  -- bypass it.)
  IF v_invite.email IS NOT NULL THEN
    v_caller_email := coalesce(auth.email(), '');
    IF lower(v_caller_email) IS DISTINCT FROM lower(v_invite.email) THEN
      RAISE EXCEPTION 'This invite was sent to %, but the signed-in account is %',
        v_invite.email, nullif(v_caller_email, '');
    END IF;
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
$function$;
