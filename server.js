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

// Serve Vite build output
app.use(express.static(DIST));

// SPA fallback — all unmatched routes serve index.html
app.use((req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PurpleBee running on port ${PORT}`);
});
