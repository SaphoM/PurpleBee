// telegram-link — replaces the dead `${API_URL}/api/telegram/*` routes that
// used to be served by the now-deleted Express backend. Same request/response
// contract as before, so src/pages/SettingsPage.tsx needs only a URL change,
// not a rewrite. verify_jwt is ON for this function, so the caller's identity
// comes from their real Supabase session (getUser()) — never a client-supplied
// userId, which is a real security improvement over the original design.
//
// Routes (path segment after the function name):
//   GET  /telegram-link/link-status  -> { linked: boolean }
//   POST /telegram-link/link-code    -> { success, code, deepLink }
//   POST /telegram-link/unlink       -> { success }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_BOT_USERNAME = Deno.env.get('TELEGRAM_BOT_USERNAME') || 'PurpleBee2bot';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').filter(Boolean).pop(); // last path segment

    // Identify the caller from their real session — never trust a client-supplied userId.
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return json({ success: false, error: 'Not authenticated' }, 401);
    }

    // All table access uses the service-role key — telegram_links/telegram_link_codes
    // have no client-facing RLS policy at all (default deny), by design.
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (action === 'link-status' && req.method === 'GET') {
      const { data } = await db
        .from('telegram_links')
        .select('telegram_user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      return json({ linked: Boolean(data?.telegram_user_id) });
    }

    if (action === 'link-code' && req.method === 'POST') {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      // One active code per user — replace any previous unused code.
      await db.from('telegram_link_codes').delete().eq('user_id', user.id).eq('used', false);
      const { error } = await db.from('telegram_link_codes').insert({
        code, user_id: user.id, expires_at: expiresAt, used: false,
      });
      if (error) {
        console.error('[telegram-link] link-code insert failed', { userId: user.id, error: error.message });
        return json({ success: false, error: 'Could not generate a link code' }, 500);
      }
      return json({ success: true, code, deepLink: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}` });
    }

    if (action === 'unlink' && req.method === 'POST') {
      const { error } = await db
        .from('telegram_links')
        .update({ telegram_user_id: null, linked_at: null })
        .eq('user_id', user.id);
      if (error) {
        console.error('[telegram-link] unlink failed', { userId: user.id, error: error.message });
        return json({ success: false, error: 'Could not unlink' }, 500);
      }
      return json({ success: true });
    }

    return json({ success: false, error: 'Unknown route' }, 404);
  } catch (err) {
    console.error('[telegram-link] Edge function error:', err);
    return json({ success: false, error: String(err) }, 500);
  }
});
