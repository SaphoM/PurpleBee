// send-telegram-notification — fires on every `notifications` table INSERT
// (via a second pg_net trigger, sibling to the one that calls
// send-email-notification — same table, same event, independent delivery
// channels so a failure in one never affects the other or the in-app row).
//
// STUB until TELEGRAM_BOT_TOKEN is configured: no-ops cleanly (matches the
// email function's proven pattern) rather than failing. Also no-ops cleanly
// when the recipient hasn't linked Telegram or has the preference off — the
// in-app notification and email are never blocked by any of this.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const APP_URL = Deno.env.get('APP_URL') || 'https://purplebee-staging.onrender.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Mirrors src/stores/notificationStore.ts's typeMap — kept in sync manually,
// same as send-email-notification's CATEGORY_PREF_KEY.
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

const TYPE_EMOJI: Record<string, string> = {
  'task-assigned': '🐝',
  'task-due': '⏰',
  'task-completed': '✅',
  'task-reopened': '↩️',
  'task-updated': '✏️',
  'attachment-added': '📎',
  'project-invite': '📂',
  'project-updated': '📁',
  'mention': '🔔',
  'update': '🔄',
  'ai-insight': '🤖',
};

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const payload = await req.json();
    const { type, record } = payload;

    if (type !== 'INSERT' || !record) {
      return new Response(JSON.stringify({ ignored: true }), { status: 200 });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.log('[send-telegram-notification] TELEGRAM_BOT_TOKEN not set — skipping, in-app/email unaffected.');
      return new Response(JSON.stringify({ skipped: 'no bot token' }), { status: 200 });
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: link } = await db
      .from('telegram_links')
      .select('telegram_user_id')
      .eq('user_id', record.user_id)
      .maybeSingle();

    if (!link?.telegram_user_id) {
      return new Response(JSON.stringify({ skipped: 'not linked', notification_id: record.id }), { status: 200 });
    }

    const { data: profile } = await db
      .from('profiles')
      .select('notification_preferences')
      .eq('id', record.user_id)
      .maybeSingle();

    const prefs = (profile?.notification_preferences ?? {}) as Record<string, boolean>;
    const telegramOn = prefs.telegram !== false;
    const categoryKey = CATEGORY_PREF_KEY[record.type] ?? 'updates';
    const categoryOn = prefs[categoryKey] !== false;
    if (!telegramOn || !categoryOn) {
      return new Response(JSON.stringify({ skipped: 'preferences disabled', notification_id: record.id }), { status: 200 });
    }

    const emoji = TYPE_EMOJI[record.type] ?? '🐝';
    const text = `${emoji} *${escapeMarkdown(record.title)}*\n${escapeMarkdown(record.message)}`;
    const deepLink = record.action_url
      ? `${APP_URL}/${String(record.action_url).replace(/^#?\/?/, '#')}`
      : APP_URL;

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: link.telegram_user_id,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: 'Open in PurpleBee →', url: deepLink }]],
        },
      }),
    });
    const data = await res.json();

    console.log('[send-telegram-notification] delivery attempt', {
      notification_id: record.id,
      user_id: record.user_id,
      event_type: record.type,
      status: data.ok ? 'delivered' : 'failed',
      error_code: data.ok ? undefined : data.error_code,
    });

    if (!data.ok) {
      // Permanent failures — bot blocked, chat/user gone — invalidate the
      // link so the user is prompted to reconnect, instead of retrying an
      // impossible delivery forever. Transient errors are just logged.
      const permanent = data.error_code === 403 || (data.error_code === 400 && /chat not found|user is deactivated/i.test(data.description || ''));
      if (permanent) {
        await db.from('telegram_links').update({ telegram_user_id: null, linked_at: null }).eq('user_id', record.user_id);
        console.warn('[send-telegram-notification] link invalidated (permanent failure)', { user_id: record.user_id, telegram_response: data });
      }
      return new Response(JSON.stringify({ error: data.description, permanent }), { status: 200 }); // 200 — never block the trigger
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('[send-telegram-notification] Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function escapeMarkdown(text: string): string {
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
