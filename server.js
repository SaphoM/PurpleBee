import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 10000;
const DIST = join(__dirname, 'dist');

// Security headers on every response
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://sudkymxnzuiubnszpxbc.supabase.co wss://sudkymxnzuiubnszpxbc.supabase.co https://realtime.supabase.co wss://realtime.supabase.co",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
    ].join('; ')
  );
  next();
});

// Serve Vite build output
app.use(express.static(DIST));

// SPA fallback — all routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PurpleBee running on port ${PORT}`);
});
