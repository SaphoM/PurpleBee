-- ═══════════════════════════════════════════════════════════════════════
-- Chat attachments (voice notes / files) were invisible to the RECEIVER
-- ═══════════════════════════════════════════════════════════════════════
-- The original "Attachments follow parent access" policy only allowed:
--   • the uploader, or
--   • anyone attached to the parent TASK (task_id IN …), or
--   • admins/managers.
-- Chat attachments carry task_id IS NULL + message_id set, so for every
-- conversation participant except the sender all three checks failed.
-- PostgREST honours RLS on the attachments:attachments(*) join, so the
-- receiver's message fetch silently returned an EMPTY attachments array:
-- uploaded voice notes "never appeared" for the other person.
--
-- Fix: anyone who can see the parent MESSAGE (messages RLS = conversation
-- participants) can now see its attachments too. Task attachments keep the
-- exact same rules as before.
DROP POLICY IF EXISTS "Attachments follow parent access" ON public.attachments;

CREATE POLICY "Attachments follow parent access"
  ON public.attachments
  FOR ALL
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid() OR created_by = auth.uid())
    OR public.is_admin_or_manager()
    OR (
      -- Message attachments: visible to whoever can see the parent message.
      -- The subquery runs as the requesting role, so the messages RLS
      -- (conversation participants only) is applied inside it.
      message_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id = attachments.message_id)
    )
  );
