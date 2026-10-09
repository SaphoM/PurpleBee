import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_CHAT_ID   = Deno.env.get('TELEGRAM_CHAT_ID')!;
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

serve(async (req) => {
  try {
    // Only allow POST from Supabase webhook
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const payload = await req.json();

    // Supabase DB webhook sends { type, table, record, old_record, schema }
    const { type, record } = payload;

    if (type !== 'INSERT' || !record) {
      return new Response('Ignored', { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch the session to get user info
    const { data: session } = await supabase
      .from('chatbot_sessions')
      .select('user_id, session_key, profiles(name, email)')
      .eq('id', record.session_id)
      .single();

    const userName = (session?.profiles as any)?.name
      || (session?.profiles as any)?.email
      || `Anonymous (${record.session_id.slice(0, 8)})`;

    // Format message for Telegram
    const emoji   = record.sender === 'user' ? '👤' : '🤖';
    const label   = record.sender === 'user' ? 'User' : 'Bot';
    const msgText = record.text;
    const time    = new Date(record.created_at).toLocaleTimeString('en-ZA', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg',
    });

    const telegramText =
      `${emoji} <b>${label}</b>: ${escapeHtml(msgText)}\n` +
      `<i>👤 ${escapeHtml(userName)} · ${time}</i>`;

    // Send to Telegram
    const tgRes = await fetch(TELEGRAM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    TELEGRAM_CHAT_ID,
        text:       telegramText,
        parse_mode: 'HTML',
      }),
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('Telegram error:', tgData);
      return new Response(JSON.stringify({ error: tgData.description }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
