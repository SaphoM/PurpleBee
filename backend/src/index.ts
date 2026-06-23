import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const REFRESH_COOKIE = 'pb_refresh';
const IS_PROD = process.env.NODE_ENV === 'production';

const cookieOpts = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: (IS_PROD ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

const app: Express = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

app.use((req: Request, _res: Response, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
function supabaseAuthHeaders() {
  return { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
}

// ═════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Sets pb_refresh httpOnly cookie; returns access_token + user.
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }
  if (!SUPABASE_URL) {
    return res.status(503).json({ success: false, error: 'Auth service not configured' });
  }
  try {
    const { data } = await axios.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      { email, password },
      { headers: supabaseAuthHeaders() },
    );
    const { refresh_token, ...safeData } = data;
    res.cookie(REFRESH_COOKIE, refresh_token, cookieOpts);
    return res.json({ success: true, ...safeData });
  } catch (err: any) {
    const msg = err.response?.data?.error_description
      || err.response?.data?.msg
      || 'Invalid credentials';
    return res.status(401).json({ success: false, error: msg });
  }
});

/**
 * POST /api/auth/refresh
 * Reads pb_refresh cookie; rotates it; returns new access_token + user.
 */
app.post('/api/auth/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    return res.status(401).json({ success: false, error: 'No refresh token — please log in' });
  }
  try {
    const { data } = await axios.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      { refresh_token: refreshToken },
      { headers: supabaseAuthHeaders() },
    );
    const { refresh_token: newRefresh, ...safeData } = data;
    // Rotate: old token consumed, new one issued
    res.cookie(REFRESH_COOKIE, newRefresh, cookieOpts);
    return res.json({ success: true, ...safeData });
  } catch (err: any) {
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return res.status(401).json({ success: false, error: 'Session expired — please log in again' });
  }
});

/**
 * POST /api/auth/logout
 * Authorization: Bearer <access_token>
 * Revokes the session on Supabase; clears the pb_refresh cookie.
 */
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const accessToken = (req.headers.authorization ?? '').replace('Bearer ', '').trim();
  if (accessToken && SUPABASE_URL) {
    await axios.post(
      `${SUPABASE_URL}/auth/v1/logout`,
      {},
      {
        headers: {
          ...supabaseAuthHeaders(),
          Authorization: `Bearer ${accessToken}`,
        },
      },
    ).catch(() => {});
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  return res.json({ success: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// TASK ROUTES (preserved from original)
// ═════════════════════════════════════════════════════════════════════════════

app.get('/api/tasks', async (_req: Request, res: Response) => {
  res.json({ success: true, data: [] });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
app.get('/api/analytics/metrics', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { tasksCompleted: 0, tasksInProgress: 0, overdueTasks: 0, productivityScore: 0 },
  });
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on('task:update', (data) => { socket.broadcast.emit('task:updated', data); });
  socket.on('status:change', (data) => { socket.broadcast.emit('status:changed', data); });
  socket.on('disconnect', () => { console.log(`User disconnected: ${socket.id}`); });
});

// ── 404 / error handlers ──────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((error: any, _req: Request, res: Response, _next: any) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`✅ Auth server running on port ${PORT}`);
  console.log(`   CORS origin: ${FRONTEND_URL}`);
  console.log(`   Supabase: ${SUPABASE_URL ? 'configured' : '⚠️  not configured'}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM — shutting down');
  process.exit(0);
});

export default app;
