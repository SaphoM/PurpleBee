// send-email-notification — fires on every `notifications` table INSERT (via
// the pg_net trigger in migration 20260731200000_notifications_email_trigger.sql)
// and, if the recipient's notification preferences allow it, emails them
// through Resend. This is a STUB awaiting final configuration: it is safe to
// deploy as-is today — with no RESEND_API_KEY secret set, it logs and no-ops
// instead of failing, so nothing breaks. Wiring it up for real just needs:
//   1. `supabase secrets set RESEND_API_KEY=...` (or via the dashboard)
//   2. Optionally set FROM_EMAIL (defaults to a placeholder below) and
//      APP_URL (defaults to the staging URL) to match your sending domain.
// Mirrors the shape of the existing (also-unwired) telegram-notify function.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'PurpleBee <notifications@purplebee.app>';
const APP_URL = Deno.env.get('APP_URL') || 'https://purplebee-staging.onrender.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Mirrors src/stores/notificationStore.ts's typeMap — kept in sync manually
// since edge functions run in a separate Deno runtime and can't import
// frontend TypeScript directly.
const CATEGORY_PREF_KEY: Record<string, string> = {
  'task-assigned': 'taskAssigned',
  'task-due': 'taskDue',
  'task-completed': 'taskCompleted',
  'task-reopened': 'taskCompleted',
  'task-updated': 'updates',
  'attachment-added': 'updates',
  'project-invite': 'projectInvite',
  'project-updated': 'projectInvite',
  'mention': 'mentions',
  'update': 'updates',
  'ai-insight': 'aiInsights',
};

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const payload = await req.json();
    const { type, record } = payload;

    if (type !== 'INSERT' || !record) {
      return new Response('Ignored', { status: 200 });
    }

    if (!RESEND_API_KEY) {
      // Not configured yet — no-op rather than fail. The in-app notification
      // (the actual DB row that triggered this) was already created either way.
      console.log('[send-email-notification] RESEND_API_KEY not set — skipping email, in-app notification unaffected.');
      return new Response(JSON.stringify({ skipped: 'no api key' }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, notification_preferences')
      .eq('id', record.user_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ skipped: 'no recipient email' }), { status: 200 });
    }

    const prefs = (profile.notification_preferences ?? {}) as Record<string, boolean>;
    // Default to "on" for anything not explicitly set — matches the client's
    // defaultPreferences (every toggle defaults true).
    const masterEmailOn = prefs.email !== false;
    const categoryKey = CATEGORY_PREF_KEY[record.type] ?? 'updates';
    const categoryOn = prefs[categoryKey] !== false;
    if (!masterEmailOn || !categoryOn) {
      return new Response(JSON.stringify({ skipped: 'preferences disabled' }), { status: 200 });
    }

    const actionUrl = record.action_url ? `${APP_URL}/${String(record.action_url).replace(/^#?\/?/, '#')}` : APP_URL;

    const html = buildEmailHtml({
      title: record.title,
      message: record.message,
      actionUrl,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: profile.email,
        subject: record.title,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[send-email-notification] Resend error:', errText);
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('[send-email-notification] Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function buildEmailHtml(params: { title: string; message: string; actionUrl: string }): string {
  const { title, message, actionUrl } = params;
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;">PurpleBee</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:18px;color:#111827;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563;">${escapeHtml(message)}</p>
                <a href="${actionUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">Open in PurpleBee</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f9fafb;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because of your PurpleBee notification preferences. Manage them anytime in Settings.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
