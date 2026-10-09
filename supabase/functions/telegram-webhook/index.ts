// telegram-webhook — receives updates from Telegram's servers when a user
// messages @PurpleBee2bot. Handles the `/start CODE` linking command.
//
// Self-registration: a plain GET to this function's own URL (not something
// Telegram ever sends) calls Telegram's setWebhook API with its own deployed
// URL. This is the one-time setup step after TELEGRAM_BOT_TOKEN is
// configured — the token never leaves the server or needs to be typed
// anywhere; just visit/curl this function's URL once.
//
// STUB until TELEGRAM_BOT_TOKEN is configured: with no token set, GET
// reports that plainly instead of pretending to register, and POST (a real
// Telegram update) can still process the link — it doesn't need the token
// to write to the DB, only to reply back to the user, which it skips if
// unconfigured.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET'); // optional but recommended
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function replyToTelegram(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return; // no-op — nothing to reply with, DB write already succeeded
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error('[telegram-webhook] reply failed', { chatId, error: String(err) });
  }
}

serve(async (req) => {
  const selfUrl = new URL(req.url);
  const functionUrl = `${selfUrl.origin}${selfUrl.pathname}`;

  // ── One-time self-registration: GET this function's own URL ──
  if (req.method === 'GET') {
    if (!TELEGRAM_BOT_TOKEN) {
      return json({
        registered: false,
        reason: 'TELEGRAM_BOT_TOKEN is required but not configured.',
      }, 200);
    }
    const setWebhookUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
    const body: Record<string, string> = { url: functionUrl };
    if (TELEGRAM_WEBHOOK_SECRET) body.secret_token = TELEGRAM_WEBHOOK_SECRET;
    const res = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return json({ registered: Boolean(data.ok), telegram_response: data });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Verify the request actually came from Telegram, if a secret is configured ──
  if (TELEGRAM_WEBHOOK_SECRET) {
    const incomingSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (incomingSecret !== TELEGRAM_WEBHOOK_SECRET) {
      return json({ error: 'Invalid secret token' }, 401);
    }
  }

  try {
    const update = await req.json();
    const message = update?.message;
    const text: string | undefined = message?.text;
    const chatId = message?.chat?.id ? String(message.chat.id) : null;

    if (!text || !chatId) {
      return json({ ok: true }); // nothing actionable — always 200 so Telegram doesn't retry forever
    }

    const startMatch = text.match(/^\/start\s+([A-Z0-9]{6})$/i);
    if (!startMatch) {
      return json({ ok: true }); // not a linking command — ignore silently
    }

    const code = startMatch[1].toUpperCase();
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: codeRow } = await db
      .from('telegram_link_codes')
      .select('user_id, expires_at, used')
      .eq('code', code)
      .maybeSingle();

    if (!codeRow || codeRow.used || new Date(codeRow.expires_at) < new Date()) {
      await replyToTelegram(chatId, "That link code is invalid or has expired. Generate a new one from PurpleBee → Settings → Notifications.");
      return json({ ok: true });
    }

    // One Telegram chat can only be linked to one PurpleBee account —
    // upsert on user_id so re-linking replaces the old chat_id cleanly.
    const { error: upsertError } = await db
      .from('telegram_links')
      .upsert(
        { user_id: codeRow.user_id, telegram_user_id: chatId, linked_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('[telegram-webhook] link upsert failed', { userId: codeRow.user_id, error: upsertError.message });
      await replyToTelegram(chatId, "Something went wrong linking your account. Please try again.");
      return json({ ok: true });
    }

    await db.from('telegram_link_codes').update({ used: true }).eq('code', code);
    await replyToTelegram(chatId, "✅ Your PurpleBee account is now connected. You'll receive notifications here.");

    console.log('[telegram-webhook] linked', { userId: codeRow.user_id, chatId });
    return json({ ok: true });
  } catch (err) {
    console.error('[telegram-webhook] Edge function error:', err);
    return json({ ok: true }); // still 200 — never let Telegram hammer retries on our bug
  }
});
