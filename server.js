import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env for local development (no dependency). On Render, environment
// variables are injected directly; real env values are never overridden.
try {
  for (const line of readFileSync(join(__dirname, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {
  /* no .env file locally — fine */
}

const app = express();
const PORT = process.env.PORT || 10000;
const DIST = join(__dirname, 'dist');

// Security headers on every response
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // microphone=(self) is required for chat voice notes (MediaRecorder getUserMedia);
  // everything else stays denied.
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://kpiridirhzrzmbcwdxyb.supabase.co wss://kpiridirhzrzmbcwdxyb.supabase.co https://realtime.supabase.co wss://realtime.supabase.co",
      "img-src 'self' data: https:",
      // voice notes: blob: while recording, https: for stored audio files
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
    ].join('; ')
  );
  next();
});

// ─── In-app AI assistant ─────────────────────────────────────────────────
// The AI Insights assistant runs as the Supabase Edge Function
// supabase/functions/ai-chat (deployed with `npm run deploy:assistant`).
// This server only serves the static build + security headers — the
// deployed site never executes Express routes, so keeping a second copy
// of the chat handler here would just drift. The LLM key lives in
// Supabase secrets, never in this repo, process.env, or the bundle.

// ─── REST API ────────────────────────────────────────────────────────────
// Render serves the static build only and never runs this file; these
// routes matter when server.js runs locally (VITE_API_URL points here).

// JSON body parsing for API routes only (skips static/SPA requests).
app.use('/api', express.json());

// CORS for API routes only: the Vite dev server calls these cross-origin
// in local development; the deployed site is same-origin.
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// GET /api/health — uptime probe (no secrets, safe to expose).
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'purplebee',
    uptime: Math.round(process.uptime()),
    ts: new Date().toISOString(),
  });
});

// POST /api/integrations/telegram/verify — the exact contract SettingsPage's
// legacy handleConnectTelegram calls: body { botToken } → { success, error }.
// Validates the token against https://api.telegram.org/bot<TOKEN>/getMe.
app.post('/api/integrations/telegram/verify', async (req, res) => {
  const botToken = String(req.body?.botToken || process.env.VITE_TELEGRAM_BOT_TOKEN || '').trim();
  if (!botToken) {
    return res.status(400).json({
      success: false,
      error: 'No bot token provided (pass botToken in the body or set VITE_TELEGRAM_BOT_TOKEN in .env)',
    });
  }
  if (!/^\d+:[A-Za-z0-9_-]{10,}$/.test(botToken)) {
    return res.status(400).json({
      success: false,
      error: 'Bot token has an invalid format (expected "<digits>:<secret>")',
    });
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let tg;
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { signal: ctrl.signal });
      tg = await r.json();
    } finally {
      clearTimeout(timer);
    }
    if (tg?.ok) {
      return res.json({
        success: true,
        username: tg.result?.username,
        firstName: tg.result?.first_name,
      });
    }
    return res.json({ success: false, error: tg?.description || 'Telegram rejected this token' });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err?.name === 'AbortError' ? 'Telegram did not respond in time' : 'Could not reach api.telegram.org',
    });
  }
});

// Unknown API paths return JSON 404 instead of falling into the SPA shell.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve Vite build output
app.use(express.static(DIST));

// SPA fallback — all unmatched routes serve index.html
app.use((req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PurpleBee running on port ${PORT}`);
});
