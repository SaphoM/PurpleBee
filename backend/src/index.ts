import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { supabase } from './supabaseClient';

// Load environment variables
dotenv.config();

// Initialize Prisma Client (optional — server runs without DB)
let prisma: PrismaClient | null = null;
try {
  prisma = new PrismaClient();
} catch (e) {
  console.warn('⚠️  Prisma not available — DB routes will be skipped');
}

// Create Express app
const app: Express = express();
const httpServer = createServer(app);

// Base URL of the running frontend — used for CORS and for building task
// links in bot confirmation messages. Swap this to the production frontend
// URL (e.g. https://app.purplebee.com) when deploying.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============= API Routes =============

/**
 * Authentication Routes
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // Implementation: validate credentials and return JWT token
    res.json({ success: true, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;
    // Implementation: create user and return JWT token
    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

/**
 * Task Routes
 */
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    if (!prisma) return res.json({ success: true, data: [] });
    const tasks = await prisma.task.findMany({
      include: { subtasks: true, attachments: true },
    });
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', async (req: Request, res: Response) => {
  try {
    if (!prisma) return res.status(503).json({ success: false, error: 'DB not available' });
    const task = await prisma.task.create({ data: req.body });
    io.emit('task:created', task);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    if (!prisma) return res.status(503).json({ success: false, error: 'DB not available' });
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
    });
    io.emit('task:updated', task);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    if (!prisma) return res.status(503).json({ success: false, error: 'DB not available' });
    await prisma.task.delete({ where: { id: req.params.id } });
    io.emit('task:deleted', { id: req.params.id });
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

/**
 * User Routes
 */
app.get('/api/user/profile', async (req: Request, res: Response) => {
  try {
    // Implementation: get authenticated user's profile
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

app.put('/api/user/profile', async (req: Request, res: Response) => {
  try {
    // Implementation: update user profile
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

/**
 * Analytics Routes
 */
app.get('/api/analytics/metrics', async (req: Request, res: Response) => {
  try {
    // Implementation: calculate and return metrics
    res.json({
      success: true,
      data: {
        tasksCompleted: 28,
        tasksInProgress: 5,
        overdueTasks: 2,
        productivityScore: 87,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

app.get('/api/analytics/trends', async (req: Request, res: Response) => {
  try {
    // Implementation: get productivity trends
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
});

/**
 * Integration Routes
 */
app.get('/api/integrations', async (req: Request, res: Response) => {
  try {
    if (!prisma) return res.json({ success: true, data: [] });
    const integrations = await prisma.integration.findMany();
    res.json({ success: true, data: integrations });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
  }
});

app.post('/api/integrations/whatsapp/verify', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    // Implementation: verify WhatsApp phone number
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

app.post('/api/integrations/telegram/verify', async (req: Request, res: Response) => {
  try {
    const { botToken } = req.body;
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json() as { ok: boolean; result?: { username: string; first_name: string }; description?: string };
    if (data.ok) {
      res.json({ success: true, bot: data.result });
    } else {
      res.status(400).json({ success: false, error: data.description || 'Invalid bot token' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

app.post('/api/integrations/telegram/send', async (req: Request, res: Response) => {
  try {
    const { chatId, text } = req.body;
    const botToken = process.env.REACT_APP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ success: false, error: 'Bot token not configured' });
    }
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    const data = await response.json() as { ok: boolean; description?: string };
    if (!data.ok) throw new Error(data.description || 'Telegram send failed');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Telegram account linking
 *
 * NOTE: this app has no real backend auth (no JWT/session) anywhere yet —
 * every route here trusts the userId sent by the client, the same way the
 * rest of the app already trusts the client-side useUserStore identity.
 * Replace with real session-based auth before this is exposed beyond
 * localhost/trusted users.
 */
app.post('/api/telegram/link-code', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    if (!supabase) return res.status(503).json({ success: false, error: 'Database not configured' });

    const code = generateLinkCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('telegram_link_codes')
      .insert({ code, user_id: userId, expires_at: expiresAt, used: false });
    if (error) throw error;

    const botUsername = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || process.env.VITE_TELEGRAM_BOT_USERNAME;
    const deepLink = `https://t.me/${botUsername}?start=${code}`;
    res.json({ success: true, code, deepLink, expiresAt });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/telegram/link-status', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    if (!supabase) return res.json({ success: true, linked: false });

    const { data } = await supabase
      .from('telegram_links')
      .select('telegram_user_id')
      .eq('user_id', userId)
      .maybeSingle();

    res.json({ success: true, linked: Boolean(data?.telegram_user_id), telegramUserId: data?.telegram_user_id || null });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/telegram/unlink', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    if (!supabase) return res.status(503).json({ success: false, error: 'Database not configured' });

    const { error } = await supabase
      .from('telegram_links')
      .update({ telegram_user_id: null, linked_at: null })
      .eq('user_id', userId);
    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Bot conversation state ───────────────────────────────────────────────
// Live snapshots pushed from the frontend (projectStore / taskStore) via
// socket sync so the bot never hallucinates project/task/assignee names.
interface LiveProject { id: string; name: string; icon: string; updatedAt: string; }
interface LiveTask { id: string; title: string; status: string; projectId?: string; assignedTo?: string; createdBy?: string; }

let liveProjects: LiveProject[] = [];
let liveTasks: LiveTask[] = [];

type BotStep =
  | 'idle'
  // Create Task flow — after picking a project, shows the user's own
  // existing tasks there (pick one to add details to it) plus the option
  // to type a brand-new title. Unauthenticated/refresh mode:
  | 'create-ask-project'
  | 'create-ask-project-more'
  | 'create-pick-task-or-title'
  | 'create-ask-title'
  // Authenticated (database mode), paginated:
  | 'create-ask-project-db'
  | 'create-pick-task-db'
  | 'create-ask-title-db'
  | 'create-ask-subtask'
  | 'create-ask-subtask-more'
  | 'create-ask-description'
  | 'create-ask-status'
  | 'create-ask-priority'
  | 'create-ask-due-date'
  | 'create-ask-hours'
  | 'create-ask-tags'
  // Edit Task flow — existing tasks only. Unauthenticated/refresh mode picks
  // a task then walks the same linear wizard as Create (ending in
  // emitBotTaskUpdated); authenticated/database mode drops into the
  // menu-driven edit-menu loop below, applying each change immediately.
  | 'edit-ask-project'
  | 'edit-ask-project-more'
  | 'edit-pick-task'
  | 'edit-ask-project-db'
  | 'edit-pick-task-db'
  | 'edit-menu'
  | 'edit-description'
  | 'edit-subtask-add'
  | 'edit-subtask-add-more'
  | 'edit-subtask-toggle'
  | 'edit-progress'
  | 'edit-progress-custom'
  | 'edit-status'
  | 'edit-priority'
  | 'edit-due-date'
  | 'edit-hours'
  | 'edit-tags'
  // Delete Task flow
  | 'delete-ask-task'
  | 'delete-ask-reason';

interface BotSession {
  step: BotStep;
  channel: 'telegram' | 'whatsapp';
  // Identity (linked Telegram users only)
  telegramChatId?: string;
  // Create/Update Task fields
  projectId?: string;
  projectName?: string;
  projectIcon?: string;
  assigneeId?: string;
  assigneeName?: string;
  mode?: 'create' | 'update';
  newTaskTitle?: string;      // set when mode === 'create'
  existingTaskId?: string;    // set when mode === 'update'
  existingTaskTitle?: string; // set when mode === 'update'
  pickList?: { id: string; title: string }[]; // tasks shown at the pick-task-or-title step
  taskPage?: number; // current page index within pickList (database mode)
  projectPickList?: { id: string; name: string; icon: string }[]; // authenticated project list (database mode)
  projectPage?: number; // current page index within projectPickList (database mode)
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
  subtasks?: string[];
  // Delete Task fields
  deleteTaskId?: string;
  deleteTaskTitle?: string;
  // Set only in database mode (linked user) — pins the numbered menu to the
  // exact bot_tasks rows fetched for the "which task?" step, so the answer
  // in delete-ask-task indexes the same list instead of re-querying (which
  // could race with a concurrent change) or falling back to liveTasks.
  deleteTaskPickList?: { id: string; title: string; projectName?: string }[];
  // Edit Task flow only — the numbered menu shown at edit-menu, so the
  // numeric reply maps back to the right action regardless of which items
  // were conditionally included (e.g. Toggle Subtask only when non-empty).
  editMenuItems?: { key: string; label: string }[];
}

const botSessions = new Map<string, BotSession>();

function getSession(key: string, channel: 'telegram' | 'whatsapp'): BotSession {
  if (!botSessions.has(key)) botSessions.set(key, { step: 'idle', channel });
  return botSessions.get(key)!;
}

function resetSession(key: string, channel: 'telegram' | 'whatsapp') {
  botSessions.set(key, { step: 'idle', channel });
}

// The backend only emits a task-created event — the frontend (Zustand +
// optional Supabase) is what actually writes the task. To avoid the bot
// claiming success when nothing was actually persisted (e.g. no browser tab
// open), we wait for the frontend to ack the specific task ID before telling
// the user it was created.
const pendingTaskAcks = new Map<string, () => void>();

function waitForTaskAck(taskId: string, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingTaskAcks.delete(taskId);
      resolve(false);
    }, timeoutMs);
    pendingTaskAcks.set(taskId, () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

// ── Telegram account linking ──────────────────────────────────────────────
// Static mirror of userStore.ts teamProfiles — used only to resolve a linked
// user_id ('user-1'..'user-5') into a display name for bot messages.
const TEAM_NAMES: Record<string, string> = {
  'user-1': 'Sapho Maqhwazima',
  'user-2': 'Thando Nkosi',
  'user-3': 'Lerato Molefe',
  'user-4': 'Kabelo Dlamini',
  'user-5': 'Naledi Khumalo',
};

function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Resolves a Telegram from.id to a linked Purple Bee user, if any.
async function resolveTelegramUser(telegramUserId: string): Promise<{ userId: string; name: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('telegram_links')
    .select('user_id')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle();
  if (error || !data) return null;
  return { userId: data.user_id, name: TEAM_NAMES[data.user_id] || data.user_id };
}

// Validates a link code, attaches the sender's Telegram ID to that user,
// and marks the code used. Returns the linked user's name on success.
async function linkTelegramAccount(code: string, telegramUserId: string): Promise<{ ok: true; name: string } | { ok: false; reason: string }> {
  if (!supabase) return { ok: false, reason: 'Linking is not available right now (no database configured).' };

  const { data: codeRow, error: codeErr } = await supabase
    .from('telegram_link_codes')
    .select('code, user_id, expires_at, used')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (codeErr || !codeRow) return { ok: false, reason: 'invalid' };
  if (codeRow.used) return { ok: false, reason: 'used' };
  if (new Date(codeRow.expires_at) < new Date()) return { ok: false, reason: 'expired' };

  const { error: upsertErr } = await supabase
    .from('telegram_links')
    .upsert({ user_id: codeRow.user_id, telegram_user_id: telegramUserId, linked_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (upsertErr) return { ok: false, reason: 'invalid' };

  await supabase.from('telegram_link_codes').update({ used: true }).eq('code', codeRow.code);

  return { ok: true, name: TEAM_NAMES[codeRow.user_id] || codeRow.user_id };
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Quick-tap due-date options shown as a Telegram keyboard — every label
// here must be something parseNaturalDate() already understands, except
// "Custom date" which is intercepted separately to prompt for typed input.
const DUE_DATE_QUICK_OPTIONS = ['Today', 'Tomorrow', 'Friday', 'Next week', 'Custom date'];

function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Accepts "today", "tomorrow", weekday names ("friday", "next friday"),
// "next week", or a literal YYYY-MM-DD. Returns null if unrecognized.
function parseNaturalDate(raw: string): string | null {
  const input = raw.trim().toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (/^\d{4}-\d{2}-\d{2}$/.test(input) && !isNaN(Date.parse(input))) {
    return input;
  }
  if (input === 'today') {
    return toDateOnlyString(today);
  }
  if (input === 'tomorrow') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toDateOnlyString(d);
  }
  if (input === 'next week') {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return toDateOnlyString(d);
  }
  const weekdayMatch = input.match(/^(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (weekdayMatch) {
    const isNext = Boolean(weekdayMatch[1]);
    const targetDay = WEEKDAYS.indexOf(weekdayMatch[2]);
    const d = new Date(today);
    let diff = (targetDay - d.getDay() + 7) % 7;
    if (diff === 0 || isNext) diff += 7; // "friday" alone always means the upcoming one, not today
    d.setDate(d.getDate() + diff);
    return toDateOnlyString(d);
  }
  return null;
}

function greetingText(): string {
  return (
    `👋 Hi! I'm Purple Bee. What would you like to do?\n\n` +
    `1. Create a Task\n` +
    `2. Edit Task\n` +
    `3. Delete a Task\n\n` +
    `Reply with the number or the option name.`
  );
}

// Only projects the linked user actually has a task assigned in — never show
// projects they have no involvement with. No identity (WhatsApp/unlinked
// Telegram) means we can't filter, so all projects are shown as before.
function myProjects(linkedUserId?: string): LiveProject[] {
  if (!linkedUserId) return liveProjects;
  const projectIds = new Set(liveTasks.filter((t) => t.assignedTo === linkedUserId).map((t) => t.projectId));
  return liveProjects.filter((p) => projectIds.has(p.id));
}

function topProjects(linkedUserId?: string): LiveProject[] {
  return [...myProjects(linkedUserId)].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function projectMenu(list: LiveProject[], offerMore: boolean): string {
  const lines = list.map((p, i) => `${i + 1}. ${p.icon} ${p.name}`);
  if (offerMore) lines.push(`${list.length + 1}. More`);
  return lines.join('\n');
}

// WhatsApp (and unlinked Telegram users) have no identity mapped to a phone
// number/chat ID, so "current user" can't be resolved — show all tasks
// already in the project as context instead. Linked Telegram users get
// their own tasks in the project, same as the in-app widget.
// Returns the tasks list shown to the user (for numeric-selection lookup)
// alongside the message text. WhatsApp/unlinked Telegram see all tasks in
// the project (no identity); linked Telegram/In-App see only their own.
function tasksForProjectStep(proj: LiveProject, linkedUserId?: string): LiveTask[] {
  return (linkedUserId
    ? liveTasks.filter((t) => t.projectId === proj.id && t.assignedTo === linkedUserId)
    : liveTasks.filter((t) => t.projectId === proj.id)
  ).slice(0, 8);
}

// Deletable tasks for the Delete Task flow. Linked (identified) users only
// see/can act on tasks they actually created. WhatsApp and unlinked
// Telegram have no identity to check against, so deletion stays exactly as
// unrestricted as it always was for them.
function deletableTasksForSession(session: BotSession): LiveTask[] {
  const base = liveTasks.filter((t) => t.status === 'todo' || t.status === 'in-progress');
  if (!session.assigneeId) return base;
  return base.filter((t) => !t.createdBy || t.createdBy === session.assigneeId);
}

// ── CREATE — pick one of your own existing tasks in the project to add
// details to, or type a brand-new title ────────────────────────────────────

// Reset/refresh mode (WhatsApp, unlinked Telegram): project chosen → show
// the user's own tasks there (if any) plus the option to type a new title.
function enterCreatePickStep(session: BotSession, proj: LiveProject, channelTag: string): string {
  session.projectId = proj.id;
  session.projectName = proj.name;
  const list = tasksForProjectStep(proj, session.assigneeId).map((t) => ({ id: t.id, title: t.title }));
  session.pickList = list;
  session.step = 'create-pick-task-or-title';
  let msg = `✅ Project: ${proj.icon} ${proj.name} — ${channelTag}\n\n`;
  if (list.length > 0) {
    msg += `Your tasks in this project:\n`;
    list.forEach((t, i) => { msg += `${i + 1}. ${t.title}\n`; });
    msg += `\nReply with a number to select a task, or type a new task title to create one.`;
  } else {
    msg += `No existing tasks assigned to you in this project yet.\n\nType a new task title to create one.`;
  }
  return msg;
}

// ── Authenticated (database mode) project listing — paginated ──────────────
// Applies to any channel with a resolved identity (linked Telegram, in-app).
// Unauthenticated/refresh mode (WhatsApp, unlinked Telegram) is completely
// unaffected — it keeps using topProjects() above.

function renderProjectPage(session: BotSession): string {
  const list = session.projectPickList || [];
  const page = session.projectPage || 0;
  const { pageItems, hasMore } = paginate(list, page);
  const lines = pageItems.map((p, i) => `${i + 1}. ${p.icon} ${p.name}`);
  if (hasMore) lines.push(`${pageItems.length + 1}. ▶️ Show more`);
  return `Which project is this task for?\n\n${lines.join('\n')}`;
}

// Returns the reply text, and whether the flow should end (0 projects).
// `nextStep` lets Create and Edit share this same project-membership fetch
// while landing in their own next step once a project is picked.
async function startAuthProjectFlow(session: BotSession, nextStep: 'create-ask-project-db' | 'edit-ask-project-db'): Promise<{ text: string; ended: boolean }> {
  const list = await dbFetchMyProjects(session.assigneeId!);
  if (list.length === 0) {
    return { text: `You're not part of any projects yet. Ask your admin to add you to a project first.`, ended: true };
  }
  session.projectPickList = list;
  session.projectPage = 0;
  session.step = nextStep;
  return { text: renderProjectPage(session), ended: false };
}

function renderCreateTaskPage(session: BotSession, channelTag: string): string {
  const list = session.pickList || [];
  const page = session.taskPage || 0;
  const { pageItems, hasMore } = paginate(list, page);
  let msg = `✅ Project: ${session.projectIcon || '📁'} ${session.projectName} — ${channelTag}\n\n`;
  msg += `Your tasks in this project:\n`;
  pageItems.forEach((t, i) => { msg += `${i + 1}. ${t.title}\n`; });
  let nextNum = pageItems.length + 1;
  msg += `${nextNum}. ➕ New Task\n`;
  nextNum += 1;
  if (hasMore) msg += `${nextNum}. ▶️ Show more\n`;
  msg += `\nReply with a number.`;
  return msg;
}

// Database mode: project chosen → show the user's own persisted bot_tasks
// there (paginated, always with a "New Task" option), or straight to typing
// a title if they have none in this project yet.
async function enterCreatePickStepDb(session: BotSession, proj: { id: string; name: string; icon: string }, channelTag: string): Promise<string> {
  session.projectId = proj.id;
  session.projectName = proj.name;
  session.projectIcon = proj.icon;
  const list = await dbFetchBotTasksForProject(session.assigneeId!, proj.id);
  session.pickList = list;
  session.taskPage = 0;
  if (list.length === 0) {
    session.step = 'create-ask-title-db';
    return `✅ Project: ${proj.icon} ${proj.name} — ${channelTag}\n\nWhat's the title for this new task?`;
  }
  session.step = 'create-pick-task-db';
  return renderCreateTaskPage(session, channelTag);
}

// ── EDIT — existing tasks only, no "type a new title" option ───────────────

function editTaskListMessage(proj: { icon: string; name: string }, channelTag: string, tasks: { id: string; title: string }[]): string {
  let msg = `✅ Project: ${proj.icon} ${proj.name} — ${channelTag}\n\n`;
  if (tasks.length === 0) {
    msg += `No existing tasks in this project yet.`;
    return msg;
  }
  msg += `Which task would you like to edit?\n`;
  tasks.forEach((t, i) => { msg += `${i + 1}. ${t.title}\n`; });
  msg += `\nReply with a number.`;
  return msg;
}

// Reset/refresh mode: existing tasks only — picking one continues into the
// same linear wizard Create uses (ends in emitBotTaskUpdated), since there's
// no durable bot_tasks row for unlinked users to apply incremental edits to.
async function enterEditPickStep(session: BotSession, proj: LiveProject, channelTag: string): Promise<string> {
  session.projectId = proj.id;
  session.projectName = proj.name;
  const list = tasksForProjectStep(proj, session.assigneeId).map((t) => ({ id: t.id, title: t.title }));
  session.pickList = list;
  if (list.length === 0) {
    session.step = 'idle';
    return editTaskListMessage(proj, channelTag, list) + '\n\n' + greetingText();
  }
  session.step = 'edit-pick-task';
  return editTaskListMessage(proj, channelTag, list);
}

function renderEditTaskPage(session: BotSession, channelTag: string): string {
  const list = session.pickList || [];
  const page = session.taskPage || 0;
  const { pageItems, hasMore } = paginate(list, page);
  let msg = `✅ Project: ${session.projectIcon || '📁'} ${session.projectName} — ${channelTag}\n\n`;
  msg += `Which task would you like to edit?\n`;
  pageItems.forEach((t, i) => { msg += `${i + 1}. ${t.title}\n`; });
  if (hasMore) msg += `${pageItems.length + 1}. ▶️ Show more\n`;
  msg += `\nReply with a number.`;
  return msg;
}

// Database mode: fetches the user's own bot_tasks in the chosen project.
// If there are none, there's nothing to edit — back to the main menu.
async function enterAuthEditPickStep(session: BotSession, proj: { id: string; name: string; icon: string }, channelTag: string): Promise<string> {
  session.projectId = proj.id;
  session.projectName = proj.name;
  session.projectIcon = proj.icon;
  const list = await dbFetchBotTasksForProject(session.assigneeId!, proj.id);
  session.pickList = list;
  session.taskPage = 0;
  if (list.length === 0) {
    session.step = 'idle';
    return `✅ Project: ${proj.icon} ${proj.name} — ${channelTag}\n\nNo existing tasks in this project yet.\n\n${greetingText()}`;
  }
  session.step = 'edit-pick-task-db';
  return renderEditTaskPage(session, channelTag);
}

// quickOptions renders a native Telegram tappable keyboard (one button per
// string, wrapped 2-per-row) below the message — the closest Telegram
// equivalent to an in-app dropdown, since the Bot API can't render a real
// date-picker widget. Tapping a button just sends its label as a normal
// text message, so no extra webhook handling (callback_query) is needed.
async function sendTelegram(chatId: string, text: string, quickOptions?: string[]) {
  console.log(`✈ Telegram OUT → ${chatId}:\n${text}\n`);
  const token = process.env.REACT_APP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const reply_markup = quickOptions && quickOptions.length > 0
    ? {
        keyboard: quickOptions.reduce<string[][]>((rows, label, i) => {
          if (i % 2 === 0) rows.push([label]); else rows[rows.length - 1].push(label);
          return rows;
        }, []),
        resize_keyboard: true,
        one_time_keyboard: true,
      }
    : { remove_keyboard: true };
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup }),
  }).catch((e) => console.error('Telegram send error:', e));
}

// ── Data mode ──────────────────────────────────────────────────────────────
// 'reset'    — current/original behaviour: emit an event, wait for the
//              frontend (Zustand + its own mock-mode setting) to apply it.
// 'database' — write directly to Supabase's `tasks` table (the same table
//              and shape the main app reads via dataService.ts), bypassing
//              the frontend entirely so it's not held in resettable state.
//
// BOT_DATA_MODE env var forces one mode globally (for staging). Otherwise,
// a resolved Telegram identity (session.assigneeId set) implies 'database';
// no identity (always true for WhatsApp today) implies 'reset'.
function resolveDataMode(session: BotSession): 'reset' | 'database' {
  const forced = process.env.BOT_DATA_MODE;
  if (forced === 'database' || forced === 'reset') return forced;
  return session.assigneeId ? 'database' : 'reset';
}

function subtaskObjects(titles: string[]) {
  return titles.map((title, i) => ({
    id: `bot-sub-${Date.now()}-${i}`,
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  }));
}

// Generates the task's ID here (rather than letting the frontend mint one)
// so the bot can build a working task link immediately, before it knows
// whether the frontend actually persisted it.
function emitBotTaskCreated(session: BotSession): string {
  const taskId = randomUUID();
  const task = {
    id:             taskId,
    title:          session.newTaskTitle!,
    description:    session.description || null,
    projectId:      session.projectId,
    assignedTo:     session.assigneeId,
    createdBy:      session.assigneeId, // whoever is chatting created it — unknown/undefined for WhatsApp
    priority:       session.priority || 'medium',
    status:         session.status || 'todo',
    dueDate:        session.dueDate,
    estimatedHours: session.estimatedHours,
    tags:           session.tags || [],
    subtasks:       subtaskObjects(session.subtasks || []),
    sourceChannel: session.channel,
    createdAt:     new Date().toISOString(),
  };
  io.emit('task:bot-created', task);
  console.log(`✅ Bot task emitted [${session.channel}]:`, task.title);
  return taskId;
}

// Reset-mode update — frontend merges subtasksToAdd into the existing
// task's own subtasks array (source of truth lives client-side there).
function emitBotTaskUpdated(session: BotSession) {
  io.emit('task:bot-updated', {
    id:              session.existingTaskId,
    description:     session.description,
    status:          session.status || 'todo',
    priority:        session.priority || 'medium',
    dueDate:         session.dueDate,
    estimatedHours:  session.estimatedHours,
    tags:            session.tags || [],
    subtasksToAdd:   session.subtasks || [],
  });
  console.log(`✏️  Bot task update emitted [${session.channel}]:`, session.existingTaskId);
}

function emitBotTaskDeleted(taskId: string) {
  io.emit('task:bot-deleted', { id: taskId });
  console.log(`🗑️  Bot task deletion emitted: ${taskId}`);
}

// Database mode — writes to public.bot_tasks (text IDs + telegram_chat_id),
// which durably survives restarts and is tied to the linked user's account.
// Kept separate from public.tasks because that table's assigned_to/created_by
// are UUID and can't hold the app's text IDs ('user-2').
async function dbCreateTask(session: BotSession): Promise<{ ok: true; taskId: string } | { ok: false }> {
  if (!supabase) return { ok: false };
  const taskId = randomUUID();
  const subtasks = subtaskObjects(session.subtasks || []);
  const { error } = await supabase.from('bot_tasks').insert({
    id: taskId,
    user_id: session.assigneeId || null,
    telegram_chat_id: session.telegramChatId || null,
    project_id: session.projectId || null,
    project_name: session.projectName || null,
    title: session.newTaskTitle!,
    description: session.description || null,
    status: session.status || 'todo',
    priority: session.priority || 'medium',
    due_date: session.dueDate ? new Date(session.dueDate).toISOString() : null,
    estimated_hours: session.estimatedHours ?? null,
    tags: session.tags || [],
    subtasks,
    source_channel: session.channel,
  });
  if (error) { console.error('[bot] dbCreateTask error:', error); return { ok: false }; }

  // Best-effort live display in any open tab (persisted:true → the frontend
  // shows it without trying to re-insert into public.tasks).
  io.emit('task:bot-created', {
    id: taskId,
    title: session.newTaskTitle!,
    description: session.description || null,
    projectId: session.projectId,
    assignedTo: session.assigneeId,
    createdBy: session.assigneeId,
    priority: session.priority || 'medium',
    status: session.status || 'todo',
    dueDate: session.dueDate,
    estimatedHours: session.estimatedHours,
    tags: session.tags || [],
    subtasks,
    sourceChannel: session.channel,
    createdAt: new Date().toISOString(),
    persisted: true,
  });
  return { ok: true, taskId };
}

// Used when the Create Task flow's pick-a-task step selects an EXISTING
// bot_tasks row (database mode) — applies everything collected across the
// rest of the wizard (description, status, priority, due date, hours,
// tags, subtasks) in one bulk write, merging subtasks with what's already
// there. This is distinct from dbApplyEdit (single-field, used by the
// menu-driven Edit Task flow) because Create's linear wizard only writes
// once, at the very end.
async function dbUpdateTaskBulk(session: BotSession): Promise<{ ok: true } | { ok: false }> {
  if (!supabase || !session.existingTaskId) return { ok: false };

  const { data: existing, error: fetchErr } = await supabase
    .from('bot_tasks')
    .select('subtasks')
    .eq('id', session.existingTaskId)
    .maybeSingle();
  if (fetchErr) { console.error('[bot] dbUpdateTaskBulk fetch error:', fetchErr); return { ok: false }; }

  const mergedSubtasks = [...(existing?.subtasks || []), ...subtaskObjects(session.subtasks || [])];

  const { error } = await supabase.from('bot_tasks').update({
    description: session.description ?? null,
    status: session.status || 'todo',
    priority: session.priority || 'medium',
    due_date: session.dueDate ? new Date(session.dueDate).toISOString() : null,
    estimated_hours: session.estimatedHours ?? null,
    tags: session.tags || [],
    subtasks: mergedSubtasks,
    updated_at: new Date().toISOString(),
  }).eq('id', session.existingTaskId);
  if (error) { console.error('[bot] dbUpdateTaskBulk update error:', error); return { ok: false }; }

  io.emit('task:bot-updated', {
    id: session.existingTaskId,
    description: session.description,
    status: session.status || 'todo',
    priority: session.priority || 'medium',
    dueDate: session.dueDate,
    estimatedHours: session.estimatedHours,
    tags: session.tags || [],
    subtasks: mergedSubtasks,
    persisted: true,
  });
  return { ok: true };
}

// ── Edit Task flow helpers (database mode only) ───────────────────────────
// Every edit-menu action applies straight to bot_tasks and re-emits a live
// snapshot, mirroring the in-app ChatBot's immediate-apply design — no
// staged/draft state, so there's nothing to lose if the user just stops
// mid-flow.

function progressBar(progress: number): string {
  const filled = Math.round(Math.max(0, Math.min(100, progress)) / 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${progress}%`;
}

const STATUS_LABELS: Record<string, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'review': 'Review',
  'completed': 'Completed',
};

async function dbFetchBotTask(taskId: string): Promise<any | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('bot_tasks').select('*').eq('id', taskId).maybeSingle();
  if (error) { console.error('[bot] dbFetchBotTask error:', error); return null; }
  return data;
}

// Applies a partial patch and emits the full resulting row so any open
// frontend tab reflects it live — same durable path as dbCreateTask.
async function dbApplyEdit(taskId: string, patch: Record<string, unknown>): Promise<{ ok: true; task: any } | { ok: false }> {
  if (!supabase) return { ok: false };
  const { data, error } = await supabase
    .from('bot_tasks')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .maybeSingle();
  if (error || !data) { console.error('[bot] dbApplyEdit error:', error); return { ok: false }; }
  io.emit('task:bot-updated', {
    id: taskId,
    description: data.description,
    status: data.status,
    priority: data.priority,
    dueDate: data.due_date,
    estimatedHours: data.estimated_hours,
    tags: data.tags,
    progress: data.progress,
    subtasks: data.subtasks,
    persisted: true,
  });
  return { ok: true, task: data };
}

function buildEditMenuItems(hasSubtasks: boolean): { key: string; label: string }[] {
  const items = [{ key: 'add-subtask', label: '➕ Add Subtask' }];
  if (hasSubtasks) items.push({ key: 'toggle-subtask', label: '☑️ Toggle Subtask' });
  items.push(
    { key: 'progress', label: '📊 Adjust Progress' },
    { key: 'status', label: '🔄 Change Status' },
    { key: 'priority', label: '🔥 Change Priority' },
    { key: 'description', label: '📝 Edit Description' },
    { key: 'due-date', label: '📅 Change Due Date' },
    { key: 'hours', label: '⏱️ Change Hours' },
    { key: 'tags', label: '🏷️ Edit Tags' },
    { key: 'done', label: '✅ Done Editing' },
  );
  return items;
}

const PROGRESS_MENU_TEXT = '1. +10%\n2. +25%\n3. +50%\n4. -10%\n5. -25%\n6. Reset 0%\n7. Custom\n8. Back';

async function showEditMenu(session: BotSession, reply: (msg: string, quickOptions?: string[]) => Promise<void>) {
  const task = await dbFetchBotTask(session.existingTaskId!);
  if (!task) {
    session.step = 'idle';
    await reply('⚠️ That task no longer exists.\n\n' + greetingText());
    return;
  }
  const items = buildEditMenuItems((task.subtasks || []).length > 0);
  session.editMenuItems = items;
  session.step = 'edit-menu';
  const lines = [
    `📋 ${task.title}`,
    `Status: ${STATUS_LABELS[task.status] || task.status} | Priority: ${task.priority[0].toUpperCase()}${task.priority.slice(1)}`,
    progressBar(task.progress || 0),
    '',
    ...items.map((it, i) => `${i + 1}. ${it.label}`),
    '',
    'Reply with a number.',
  ];
  await reply(lines.join('\n'));
}

// Database-mode pick list: the linked user's own bot_tasks in a project,
// so selecting one (to add subtasks/details) updates the right bot_tasks row.
// Paginated client-side (in-memory slice) — demo-scale counts, no need for
// a paged query.
async function dbFetchBotTasksForProject(userId: string, projectId: string): Promise<{ id: string; title: string }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bot_tasks')
    .select('id, title')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('[bot] dbFetchBotTasksForProject error:', error); return []; }
  return (data || []) as { id: string; title: string }[];
}

// Database-mode deletable tasks: the linked user's own bot_tasks that are
// still To Do/In Progress. Mirrors deletableTasksForSession's liveTasks
// filter, but reads the durable table instead of the live socket snapshot
// (which is empty whenever no frontend tab is open/connected).
async function dbFetchDeletableTasks(userId: string): Promise<{ id: string; title: string; projectName?: string }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bot_tasks')
    .select('id, title, project_name, status')
    .eq('user_id', userId)
    .in('status', ['todo', 'in-progress'])
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('[bot] dbFetchDeletableTasks error:', error); return []; }
  return (data || []).map((row: any) => ({ id: row.id, title: row.title, projectName: row.project_name || undefined }));
}

async function dbDeleteTask(taskId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('bot_tasks').delete().eq('id', taskId);
  if (error) { console.error('[bot] dbDeleteTask error:', error); return false; }
  return true;
}

// Database-mode project list: only projects the linked user actually
// belongs to, via bot_project_members — never all projects in the system.
async function dbFetchMyProjects(userId: string): Promise<{ id: string; name: string; icon: string }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bot_project_members')
    .select('project_id, bot_projects(id, name, icon)')
    .eq('user_id', userId)
    .limit(50);
  if (error) { console.error('[bot] dbFetchMyProjects error:', error); return []; }
  return (data || [])
    .map((row: any) => row.bot_projects)
    .filter(Boolean) as { id: string; name: string; icon: string }[];
}

// ── Pagination helpers (shared by project list & task pick list) ──────────
const PAGE_SIZE = 3;

function paginate<T>(list: T[], page: number): { pageItems: T[]; hasMore: boolean } {
  const start = page * PAGE_SIZE;
  return { pageItems: list.slice(start, start + PAGE_SIZE), hasMore: start + PAGE_SIZE < list.length };
}

function readRulesFile(): string | null {
  try {
    const rulesPath = path.resolve(process.cwd(), '../purple_bee_rules.md');
    if (!fs.existsSync(rulesPath)) return null;
    return fs.readFileSync(rulesPath, 'utf-8');
  } catch (e) {
    console.error('Error reading rules file:', e);
    return null;
  }
}

async function handleBotMessage(
  key: string,
  channel: 'telegram' | 'whatsapp',
  text: string,
  reply: (msg: string, quickOptions?: string[]) => Promise<void>,
  linkedUser?: { userId: string; name: string; telegramChatId?: string } | null
) {
  const session = getSession(key, channel);
  const input = text.trim();
  const lower = input.toLowerCase();
  const channelTag = channel === 'telegram' ? '✈ Telegram' : '🟢 WhatsApp';

  // Attach the resolved identity for this message so task creation and the
  // "your tasks in this project" step can use it. WhatsApp stays unaffected
  // (linkedUser is always undefined there — no identity mapping exists).
  if (linkedUser) {
    session.assigneeId = linkedUser.userId;
    session.assigneeName = linkedUser.name;
    session.telegramChatId = linkedUser.telegramChatId;
  }

  switch (session.step) {
    // ── Greeting / Main menu ──────────────────────────────────────────
    case 'idle': {
      if (lower === '1' || lower.includes('create a task') || lower === 'create') {
        // Authenticated (linked) users get real, database-backed, paginated
        // project membership. Unauthenticated/refresh mode (WhatsApp,
        // unlinked Telegram) keeps the exact original behaviour below.
        if (session.assigneeId) {
          const { text, ended } = await startAuthProjectFlow(session, 'create-ask-project-db');
          await reply(text);
          if (ended) session.step = 'idle';
          return;
        }
        const top3 = topProjects().slice(0, 3);
        if (top3.length === 0) {
          await reply(`⚠️ No projects available yet. Please create a project in the app first.`);
          return;
        }
        session.step = 'create-ask-project';
        await reply(
          `Which project is this task for?\n\n${projectMenu(top3, liveProjects.length > 3)}`
        );
      } else if (lower === '2' || lower.includes('edit task') || lower === 'edit') {
        if (session.assigneeId) {
          const { text, ended } = await startAuthProjectFlow(session, 'edit-ask-project-db');
          await reply(text);
          if (ended) session.step = 'idle';
          return;
        }
        const top3 = topProjects().slice(0, 3);
        if (top3.length === 0) {
          await reply(`⚠️ No projects available yet.`);
          return;
        }
        session.step = 'edit-ask-project';
        await reply(`Which project is the task in?\n\n${projectMenu(top3, liveProjects.length > 3)}`);
      } else if (lower === '3' || lower.includes('delete a task') || lower === 'delete') {
        // Linked users: read the durable bot_tasks table (works whether or
        // not a frontend tab is open). Unlinked/WhatsApp: unchanged, reads
        // the live socket snapshot since there's no persisted store to ask.
        if (session.assigneeId && resolveDataMode(session) === 'database') {
          const deletable = await dbFetchDeletableTasks(session.assigneeId);
          if (deletable.length === 0) {
            await reply('⚠️ No tasks in To Do or In Progress to delete right now.\n\n' + greetingText());
            return;
          }
          session.deleteTaskPickList = deletable;
          session.step = 'delete-ask-task';
          const menu = deletable.map((t, i) => `${i + 1}. ${t.title} — ${t.projectName || 'No project'}`).join('\n');
          await reply(`Which task would you like to delete?\n\n${menu}`);
          return;
        }
        const deletable = deletableTasksForSession(session);
        if (deletable.length === 0) {
          await reply('⚠️ No tasks in To Do or In Progress to delete right now.\n\n' + greetingText());
          return;
        }
        session.step = 'delete-ask-task';
        const menu = deletable.map((t, i) => {
          const proj = liveProjects.find((p) => p.id === t.projectId);
          return `${i + 1}. ${t.title} — ${proj?.name || 'No project'}`;
        }).join('\n');
        await reply(`Which task would you like to delete?\n\n${menu}`);
      } else {
        await reply(greetingText());
      }
      break;
    }

    // ── FLOW 1: CREATE A TASK (brand-new tasks only) ────────────────────
    case 'create-ask-project': {
      const mine = myProjects(session.assigneeId);
      const top3 = topProjects(session.assigneeId).slice(0, 3);
      const hasMore = mine.length > 3;
      const num = parseInt(input, 10);

      if (hasMore && num === top3.length + 1) {
        session.step = 'create-ask-project-more';
        await reply(`All your projects:\n\n${projectMenu(mine, false)}`);
        return;
      }

      const proj = top3[num - 1];
      if (!proj) {
        await reply(`Please reply with a valid number:\n\n${projectMenu(top3, hasMore)}`);
        return;
      }
      await reply(enterCreatePickStep(session, proj, channelTag));
      break;
    }

    case 'create-ask-project-more': {
      const mine = myProjects(session.assigneeId);
      const num = parseInt(input, 10);
      const proj = mine[num - 1];
      if (!proj) {
        await reply(`Please reply with a valid number:\n\n${projectMenu(mine, false)}`);
        return;
      }
      await reply(enterCreatePickStep(session, proj, channelTag));
      break;
    }

    // ── Authenticated (database mode) — paginated project list ─────────
    case 'create-ask-project-db': {
      const list = session.projectPickList || [];
      const page = session.projectPage || 0;
      const { pageItems, hasMore } = paginate(list, page);
      const num = parseInt(input, 10);

      if (hasMore && num === pageItems.length + 1) {
        session.projectPage = page + 1;
        await reply(renderProjectPage(session));
        return;
      }

      const proj = pageItems[num - 1];
      if (!proj) {
        await reply(`Please reply with a valid number.\n\n${renderProjectPage(session)}`);
        return;
      }
      await reply(await enterCreatePickStepDb(session, proj, channelTag));
      break;
    }

    case 'create-pick-task-or-title': {
      const num = parseInt(input, 10);
      const list = session.pickList || [];
      let confirmLine: string;
      if (input && !isNaN(num) && num >= 1 && num <= list.length) {
        const picked = list[num - 1];
        session.mode = 'update';
        session.existingTaskId = picked.id;
        session.existingTaskTitle = picked.title;
        confirmLine = `✅ Selected: ${picked.title}`;
      } else {
        if (!input) {
          await reply(`Reply with a number to select a task, or type a new task title to create one.`);
          return;
        }
        session.mode = 'create';
        session.newTaskTitle = input;
        confirmLine = `✅ New task: ${input}`;
      }
      session.step = 'create-ask-description';
      await reply(`${confirmLine}\n\nWhat's the task description?`);
      break;
    }

    case 'create-pick-task-db': {
      const list = session.pickList || [];
      const page = session.taskPage || 0;
      const { pageItems, hasMore } = paginate(list, page);
      const num = parseInt(input, 10);
      const newTaskNum = pageItems.length + 1;
      const showMoreNum = newTaskNum + 1;

      if (hasMore && num === showMoreNum) {
        session.taskPage = page + 1;
        await reply(renderCreateTaskPage(session, channelTag));
        return;
      }
      if (num === newTaskNum) {
        session.step = 'create-ask-title-db';
        await reply(`What's the title for this new task?`);
        return;
      }
      const picked = pageItems[num - 1];
      if (!picked) {
        await reply(`Please reply with a valid number.\n\n${renderCreateTaskPage(session, channelTag)}`);
        return;
      }
      session.mode = 'update';
      session.existingTaskId = picked.id;
      session.existingTaskTitle = picked.title;
      session.step = 'create-ask-description';
      await reply(`✅ Selected: ${picked.title}\n\nWhat's the task description?`);
      break;
    }

    case 'create-ask-title-db': {
      if (!input) {
        await reply(`What's the title for this new task?`);
        return;
      }
      session.mode = 'create';
      session.newTaskTitle = input;
      session.step = 'create-ask-description';
      await reply(`✅ New task: ${input}\n\nWhat's the task description?`);
      break;
    }

    case 'create-ask-title': {
      if (!input) {
        await reply(`What's the title for this new task?`);
        return;
      }
      session.mode = 'create';
      session.newTaskTitle = input;
      session.step = 'create-ask-description';
      await reply(`✅ New task: ${input}\n\nWhat's the task description?`);
      break;
    }

    // ── FLOW 2: EDIT A TASK (existing tasks only) ────────────────────────
    case 'edit-ask-project': {
      const mine = myProjects(session.assigneeId);
      const top3 = topProjects(session.assigneeId).slice(0, 3);
      const hasMore = mine.length > 3;
      const num = parseInt(input, 10);

      if (hasMore && num === top3.length + 1) {
        session.step = 'edit-ask-project-more';
        await reply(`All your projects:\n\n${projectMenu(mine, false)}`);
        return;
      }

      const proj = top3[num - 1];
      if (!proj) {
        await reply(`Please reply with a valid number:\n\n${projectMenu(top3, hasMore)}`);
        return;
      }
      await reply(await enterEditPickStep(session, proj, channelTag));
      break;
    }

    case 'edit-ask-project-more': {
      const mine = myProjects(session.assigneeId);
      const num = parseInt(input, 10);
      const proj = mine[num - 1];
      if (!proj) {
        await reply(`Please reply with a valid number:\n\n${projectMenu(mine, false)}`);
        return;
      }
      await reply(await enterEditPickStep(session, proj, channelTag));
      break;
    }

    case 'edit-pick-task': {
      const list = session.pickList || [];
      const num = parseInt(input, 10);
      const picked = list[num - 1];
      if (!picked) {
        await reply(`Please reply with a valid number.`);
        return;
      }
      session.mode = 'update';
      session.existingTaskId = picked.id;
      session.existingTaskTitle = picked.title;
      session.step = 'create-ask-description';
      await reply(`✅ Selected: ${picked.title}\n\nWhat's the task description?`);
      break;
    }

    case 'edit-ask-project-db': {
      const list = session.projectPickList || [];
      const page = session.projectPage || 0;
      const { pageItems, hasMore } = paginate(list, page);
      const num = parseInt(input, 10);

      if (hasMore && num === pageItems.length + 1) {
        session.projectPage = page + 1;
        await reply(renderProjectPage(session));
        return;
      }

      const proj = pageItems[num - 1];
      if (!proj) {
        await reply(`Please reply with a valid number.\n\n${renderProjectPage(session)}`);
        return;
      }
      await reply(await enterAuthEditPickStep(session, proj, channelTag));
      break;
    }

    case 'edit-pick-task-db': {
      const list = session.pickList || [];
      const page = session.taskPage || 0;
      const { pageItems, hasMore } = paginate(list, page);
      const num = parseInt(input, 10);

      if (hasMore && num === pageItems.length + 1) {
        session.taskPage = page + 1;
        await reply(renderEditTaskPage(session, channelTag));
        return;
      }
      const picked = pageItems[num - 1];
      if (!picked) {
        await reply(`Please reply with a valid number.\n\n${renderEditTaskPage(session, channelTag)}`);
        return;
      }
      session.mode = 'update';
      session.existingTaskId = picked.id;
      session.existingTaskTitle = picked.title;
      await reply(`✅ Selected: ${picked.title}`);
      await showEditMenu(session, reply);
      break;
    }

    case 'create-ask-description': {
      if (!input) {
        await reply(`This field is required. What's the task description?`);
        return;
      }
      session.description = input;
      session.step = 'create-ask-subtask';
      await reply(`Would you like to add subtasks?\n\n1. Add Subtask\n2. Skip`);
      break;
    }

    case 'create-ask-status': {
      const sMap: Record<string, string> = {
        '1': 'todo', 'to do': 'todo',
        '2': 'in-progress', 'in progress': 'in-progress',
        '3': 'review', 'review': 'review',
      };
      const s = sMap[lower];
      if (!s) {
        await reply('Please reply: 1 (To Do), 2 (In Progress), or 3 (Review).');
        return;
      }
      session.status = s;
      session.step = 'create-ask-priority';
      await reply(`What's the priority?\n\n1. Low\n2. Medium\n3. High\n4. Urgent`);
      break;
    }

    case 'create-ask-priority': {
      const pMap: Record<string, string> = {
        '1': 'low', 'low': 'low',
        '2': 'medium', 'medium': 'medium',
        '3': 'high', 'high': 'high',
        '4': 'urgent', 'urgent': 'urgent',
      };
      const p = pMap[lower];
      if (!p) {
        await reply('Please reply: 1 (Low), 2 (Medium), 3 (High), or 4 (Urgent).');
        return;
      }
      session.priority = p;
      session.step = 'create-ask-due-date';
      await reply(`What's the due date? Pick an option, or type your own (e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD)`, DUE_DATE_QUICK_OPTIONS);
      break;
    }

    case 'create-ask-due-date': {
      if (lower === 'custom date') {
        await reply('Type the due date — e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD.');
        return;
      }
      const parsed = parseNaturalDate(input);
      if (!parsed) {
        await reply('Please provide a date — e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD.');
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const entered = new Date(`${parsed}T00:00:00`);
      if (entered < today) {
        await reply('That date has already passed. Please provide a future date — e.g. "tomorrow", "Friday", or YYYY-MM-DD.');
        return;
      }
      session.dueDate = parsed;
      session.step = 'create-ask-hours';
      await reply(`What's the estimated hours for this task?`);
      break;
    }

    case 'create-ask-hours': {
      const hours = Number(input);
      if (isNaN(hours) || hours < 0) {
        await reply('Please provide a valid number for estimated hours.');
        return;
      }
      session.estimatedHours = hours;
      session.step = 'create-ask-tags';
      await reply(`Any tags to add? (comma-separated, or reply "Skip")`);
      break;
    }

    case 'create-ask-tags': {
      if (lower === 'skip') {
        session.tags = [];
      } else {
        session.tags = input.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      }

      const dataMode = resolveDataMode(session);
      let doneMsg: string;

      // mode === 'update' happens here both for unlinked/reset-mode users
      // (Delete/Create's pick-a-task, no durable row to patch — goes out as
      // a live socket update) and for linked/database-mode users who picked
      // an existing task via Create's pick-list (as opposed to Edit Task's
      // own menu-driven loop, which applies each change immediately instead
      // of walking this whole wizard) — those write directly to bot_tasks.
      if (session.mode === 'update') {
        if (dataMode === 'database') {
          const result = await dbUpdateTaskBulk(session);
          doneMsg = result.ok
            ? `✅ Task updated! "${session.existingTaskTitle}" in ${session.projectName || 'your project'} now has your changes.\n` +
              `View it here: ${FRONTEND_URL}/#tasks?taskId=${session.existingTaskId}`
            : `⚠️ Task was not updated — something went wrong saving to the database. Please try again.`;
        } else {
          emitBotTaskUpdated(session);
          const confirmed = await waitForTaskAck(session.existingTaskId!);
          doneMsg = confirmed
            ? `✅ Task updated! "${session.existingTaskTitle}" in ${session.projectName || 'your project'} now has your changes.\n` +
              `View it here: ${FRONTEND_URL}/#tasks?taskId=${session.existingTaskId}`
            : `⚠️ Task was not updated — the Purple Bee app doesn't seem to be open right now. Open the app in a browser and try again.`;
        }
      } else {
        if (dataMode === 'database') {
          const result = await dbCreateTask(session);
          doneMsg = result.ok
            ? `✅ Task created! "${session.newTaskTitle}" has been added to ${session.projectName || 'your project'}.\n` +
              `View it here: ${FRONTEND_URL}/#tasks?taskId=${result.taskId}`
            : `⚠️ Task was not created — something went wrong saving to the database. Please try again.`;
        } else {
          const taskId = emitBotTaskCreated(session);
          const confirmed = await waitForTaskAck(taskId);
          doneMsg = confirmed
            ? `✅ Task created! "${session.newTaskTitle}" has been added to ${session.projectName || 'your project'}.\n` +
              `View it here: ${FRONTEND_URL}/#tasks?taskId=${taskId}`
            : `⚠️ Task was not created — the Purple Bee app doesn't seem to be open right now. Open the app in a browser and try again.`;
        }
      }

      resetSession(key, channel);
      await reply(doneMsg);
      await reply(greetingText());
      break;
    }

    case 'create-ask-subtask': {
      if (lower === '1' || lower === 'add subtask') {
        session.step = 'create-ask-subtask-more';
        await reply('What is the subtask?');
      } else if (lower === '2' || lower === 'skip') {
        session.step = 'create-ask-status';
        await reply(`What's the status?\n\n1. To Do\n2. In Progress\n3. Review`);
      } else {
        await reply('Please reply: 1 (Add Subtask) or 2 (Skip).');
      }
      break;
    }

    case 'create-ask-subtask-more': {
      if (!input) {
        await reply('Please enter the subtask text.');
        return;
      }
      session.subtasks = [...(session.subtasks || []), input];
      session.step = 'create-ask-subtask';
      await reply(`Added. Add another subtask or skip?\n\n1. Add More\n2. Skip`);
      break;
    }

    // ── FLOW: EDIT AN EXISTING TASK (database mode, applies immediately) ──
    case 'edit-menu': {
      const items = session.editMenuItems || [];
      const num = parseInt(input, 10);
      const picked = items[num - 1];
      if (!picked) {
        await reply(`Please reply with a valid number.`);
        return;
      }
      switch (picked.key) {
        case 'add-subtask':
          session.step = 'edit-subtask-add';
          await reply('What is the subtask?');
          break;
        case 'toggle-subtask': {
          const task = await dbFetchBotTask(session.existingTaskId!);
          const subtasks = task?.subtasks || [];
          if (subtasks.length === 0) {
            await reply('No subtasks yet.');
            await showEditMenu(session, reply);
            return;
          }
          session.step = 'edit-subtask-toggle';
          const menu = subtasks.map((s: any, i: number) => `${i + 1}. ${s.completed ? '☑️' : '☐'} ${s.title}`).join('\n');
          await reply(`Which subtask would you like to toggle?\n\n${menu}\n\n0. Back`);
          break;
        }
        case 'progress': {
          const task = await dbFetchBotTask(session.existingTaskId!);
          session.step = 'edit-progress';
          await reply(`Current progress: ${progressBar(task?.progress || 0)}\n\n${PROGRESS_MENU_TEXT}`);
          break;
        }
        case 'status':
          session.step = 'edit-status';
          await reply(`What's the new status?\n\n1. To Do\n2. In Progress\n3. Review\n4. Completed`);
          break;
        case 'priority':
          session.step = 'edit-priority';
          await reply(`What's the new priority?\n\n1. Low\n2. Medium\n3. High\n4. Urgent`);
          break;
        case 'description':
          session.step = 'edit-description';
          await reply('What is the new description?');
          break;
        case 'due-date':
          session.step = 'edit-due-date';
          await reply(`What's the new due date? Pick an option, or type your own (e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD)`, DUE_DATE_QUICK_OPTIONS);
          break;
        case 'hours':
          session.step = 'edit-hours';
          await reply(`What's the new estimated hours?`);
          break;
        case 'tags':
          session.step = 'edit-tags';
          await reply(`Enter tags (comma-separated), or reply "skip" to clear tags.`);
          break;
        case 'done':
          resetSession(key, channel);
          await reply('💾 Changes saved.');
          await reply(greetingText());
          break;
      }
      break;
    }

    case 'edit-description': {
      if (!input) {
        await reply('This field is required. What is the new description?');
        return;
      }
      const result = await dbApplyEdit(session.existingTaskId!, { description: input });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply('✅ Description updated.');
      await showEditMenu(session, reply);
      break;
    }

    case 'edit-subtask-add': {
      if (!input) {
        await reply('Please enter the subtask text.');
        return;
      }
      const task = await dbFetchBotTask(session.existingTaskId!);
      const newSubtask = { id: randomUUID(), title: input, completed: false, createdAt: new Date().toISOString() };
      const result = await dbApplyEdit(session.existingTaskId!, { subtasks: [...(task?.subtasks || []), newSubtask] });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply(`✅ Subtask "${input}" added.`);
      session.step = 'edit-subtask-add-more';
      await reply('Add another subtask?\n\n1. Add Another\n2. Done');
      break;
    }

    case 'edit-subtask-add-more': {
      if (input === '1' || lower.includes('add another')) {
        session.step = 'edit-subtask-add';
        await reply('What is the subtask?');
      } else {
        await showEditMenu(session, reply);
      }
      break;
    }

    case 'edit-subtask-toggle': {
      if (input === '0' || lower === 'back') {
        await showEditMenu(session, reply);
        return;
      }
      const task = await dbFetchBotTask(session.existingTaskId!);
      const subtasks = task?.subtasks || [];
      const num = parseInt(input, 10);
      const target = subtasks[num - 1];
      if (!target) {
        await reply('Please reply with a valid number.');
        return;
      }
      const updated = subtasks.map((s: any) => (s.id === target.id ? { ...s, completed: !s.completed } : s));
      const result = await dbApplyEdit(session.existingTaskId!, { subtasks: updated });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply(`✅ Subtask "${target.title}" marked ${target.completed ? 'incomplete' : 'complete'}.`);
      const menu = updated.map((s: any, i: number) => `${i + 1}. ${s.completed ? '☑️' : '☐'} ${s.title}`).join('\n');
      await reply(`Toggle another, or reply 0 to go Back:\n\n${menu}`);
      break;
    }

    case 'edit-progress': {
      const task = await dbFetchBotTask(session.existingTaskId!);
      const current = task?.progress || 0;
      if (input === '8' || lower === 'back') {
        await showEditMenu(session, reply);
        return;
      }
      if (input === '7' || lower === 'custom') {
        session.step = 'edit-progress-custom';
        await reply('Enter the new progress (0-100):');
        return;
      }
      const deltaMap: Record<string, number | 'reset'> = { '1': 10, '2': 25, '3': 50, '4': -10, '5': -25, '6': 'reset' };
      const choice = deltaMap[input];
      if (choice === undefined) {
        await reply(`Please choose a valid option.\n\n${PROGRESS_MENU_TEXT}`);
        return;
      }
      const next = choice === 'reset' ? 0 : Math.max(0, Math.min(100, current + choice));
      const result = await dbApplyEdit(session.existingTaskId!, { progress: next });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply(`✅ Progress updated: ${current}% → ${next}%`);
      await reply(`Current progress: ${progressBar(next)}\n\n${PROGRESS_MENU_TEXT}`);
      break;
    }

    case 'edit-progress-custom': {
      const value = Number(input);
      if (isNaN(value)) {
        await reply('Please enter a number between 0 and 100.');
        return;
      }
      const task = await dbFetchBotTask(session.existingTaskId!);
      const current = task?.progress || 0;
      const next = Math.max(0, Math.min(100, value));
      const result = await dbApplyEdit(session.existingTaskId!, { progress: next });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply(`✅ Progress updated: ${current}% → ${next}%`);
      session.step = 'edit-progress';
      await reply(`Current progress: ${progressBar(next)}\n\n${PROGRESS_MENU_TEXT}`);
      break;
    }

    case 'edit-status': {
      const sMap: Record<string, string> = { '1': 'todo', '2': 'in-progress', '3': 'review', '4': 'completed' };
      const textMap: Record<string, string> = { 'to do': 'todo', 'in progress': 'in-progress', 'review': 'review', 'completed': 'completed' };
      const s = sMap[input] || textMap[lower];
      if (!s) {
        await reply(`Please choose one of the options shown.\n\n1. To Do\n2. In Progress\n3. Review\n4. Completed`);
        return;
      }
      const task = await dbFetchBotTask(session.existingTaskId!);
      const oldStatus = task?.status || 'todo';
      const result = await dbApplyEdit(session.existingTaskId!, { status: s });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply(`✅ Status changed: ${STATUS_LABELS[oldStatus]} → ${STATUS_LABELS[s]}`);
      await showEditMenu(session, reply);
      break;
    }

    case 'edit-priority': {
      const pMap: Record<string, string> = { '1': 'low', '2': 'medium', '3': 'high', '4': 'urgent' };
      const textMap: Record<string, string> = { low: 'low', medium: 'medium', high: 'high', urgent: 'urgent' };
      const p = pMap[input] || textMap[lower];
      if (!p) {
        await reply(`Please choose one of the options shown.\n\n1. Low\n2. Medium\n3. High\n4. Urgent`);
        return;
      }
      const task = await dbFetchBotTask(session.existingTaskId!);
      const oldP = task?.priority || 'medium';
      const result = await dbApplyEdit(session.existingTaskId!, { priority: p });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply(`✅ Priority changed: ${oldP[0].toUpperCase()}${oldP.slice(1)} → ${p[0].toUpperCase()}${p.slice(1)}`);
      await showEditMenu(session, reply);
      break;
    }

    case 'edit-due-date': {
      if (lower === 'custom date') {
        await reply('Type the due date — e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD.');
        return;
      }
      const parsed = parseNaturalDate(input);
      if (!parsed) {
        await reply('Please provide a date — e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD.');
        return;
      }
      const result = await dbApplyEdit(session.existingTaskId!, { due_date: new Date(parsed).toISOString() });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply(`✅ Due date updated: ${parsed}`);
      await showEditMenu(session, reply);
      break;
    }

    case 'edit-hours': {
      const hours = Number(input);
      if (isNaN(hours) || hours < 0) {
        await reply('Please provide a valid number for estimated hours.');
        return;
      }
      const result = await dbApplyEdit(session.existingTaskId!, { estimated_hours: hours });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply(`✅ Estimated hours updated: ${hours}`);
      await showEditMenu(session, reply);
      break;
    }

    case 'edit-tags': {
      const tags = lower === 'skip' ? [] : input.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      const result = await dbApplyEdit(session.existingTaskId!, { tags });
      if (!result.ok) { await reply('⚠️ Something went wrong. Please try again.'); return; }
      await reply(`✅ Tags updated: ${tags.length > 0 ? tags.join(', ') : '(none)'}`);
      await showEditMenu(session, reply);
      break;
    }

    // ── FLOW 2: DELETE A TASK ─────────────────────────────────────────
    case 'delete-ask-task': {
      // Database mode: index into the bot_tasks list fetched when this flow
      // started, not the live socket snapshot.
      if (session.deleteTaskPickList) {
        const list = session.deleteTaskPickList;
        const num = parseInt(input, 10);
        const task = list[num - 1];
        if (!task) {
          const menu = list.map((t, i) => `${i + 1}. ${t.title} — ${t.projectName || 'No project'}`).join('\n');
          await reply(`Please reply with a valid number:\n\n${menu}`);
          return;
        }
        session.deleteTaskId = task.id;
        session.deleteTaskTitle = task.title;
        session.step = 'delete-ask-reason';
        await reply(`What's the reason for deleting this task?`);
        break;
      }
      const deletable = deletableTasksForSession(session);
      const num = parseInt(input, 10);
      const task = deletable[num - 1];
      if (!task) {
        const menu = deletable.map((t, i) => {
          const proj = liveProjects.find((p) => p.id === t.projectId);
          return `${i + 1}. ${t.title} — ${proj?.name || 'No project'}`;
        }).join('\n');
        await reply(`Please reply with a valid number:\n\n${menu}`);
        return;
      }
      session.deleteTaskId = task.id;
      session.deleteTaskTitle = task.title;
      session.step = 'delete-ask-reason';
      await reply(`What's the reason for deleting this task?`);
      break;
    }

    case 'delete-ask-reason': {
      if (!input) {
        await reply(`This field is required. What's the reason for deleting this task?`);
        return;
      }
      // Database mode: the picked task already came from a list scoped to
      // this user's own bot_tasks rows (fetched with .eq('user_id', ...)),
      // so ownership is guaranteed by construction — no re-check needed.
      if (session.deleteTaskPickList) {
        const deleted = await dbDeleteTask(session.deleteTaskId!);
        if (!deleted) {
          resetSession(key, channel);
          await reply(`⚠️ Couldn't delete that task — please try again.`);
          await reply(greetingText());
          return;
        }
        emitBotTaskDeleted(session.deleteTaskId!); // best-effort: also drop it from any open tab's live view
        const doneMsg = `🗑️ Task deleted: ${session.deleteTaskTitle}. Reason: ${input}.`;
        resetSession(key, channel);
        await reply(doneMsg);
        await reply(greetingText());
        break;
      }
      // Defense-in-depth re-check — the picked task already came from a
      // creator-filtered list, but re-verify in case anything changed
      // between selection and confirmation.
      const target = liveTasks.find((t) => t.id === session.deleteTaskId);
      if (session.assigneeId && target?.createdBy && target.createdBy !== session.assigneeId) {
        resetSession(key, channel);
        await reply(`You can only delete tasks you created.`);
        await reply(greetingText());
        return;
      }
      emitBotTaskDeleted(session.deleteTaskId!);
      const doneMsg = `🗑️ Task deleted: ${session.deleteTaskTitle}. Reason: ${input}.`;
      resetSession(key, channel);
      await reply(doneMsg);
      await reply(greetingText());
      break;
    }
  }
}

// ── WhatsApp Webhook ────────────────────────────────────────────────────
app.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.REACT_APP_WHATSAPP_WEBHOOK_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('❌ WhatsApp webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

// Default/original behaviour: verify + log incoming messages only. WhatsApp
// intentionally does NOT run the Create/Edit/Delete Task conversation flow —
// that's Telegram (and the in-app widget) only.
app.post('/webhook/whatsapp', (req: Request, res: Response) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach((entry: any) => {
      entry.changes?.forEach((change: any) => {
        const message = change.value?.messages?.[0];
        if (message) {
          const from = message.from;
          const text = message.text?.body || '';
          io.emit('whatsapp:message', { from, text, timestamp: new Date().toISOString() });
          console.log(`📱 WhatsApp message from ${from}: ${text}`);
        }
      });
    });
  }
  res.status(200).json({ ok: true });
});

// ── Telegram Webhook ────────────────────────────────────────────────────
app.get('/webhook/telegram', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

app.post('/webhook/telegram', async (req: Request, res: Response) => {
  res.status(200).json({ ok: true }); // Acknowledge before any async work
  const update = req.body;
  if (!update.message?.text) return;
  const { message } = update;
  const chatId = String(message.chat.id);
  const from = message.from || {};
  const senderName = [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'Telegram User';
  const text = message.text as string;
  io.emit('telegram:message', {
    chatId, senderName, username: from.username || '',
    text, messageId: message.message_id,
    timestamp: new Date(message.date * 1000).toISOString(),
  });
  console.log(`✈ Telegram from ${chatId}: ${text}`);

  const reply = (msg: string, quickOptions?: string[]) => sendTelegram(chatId, msg, quickOptions);

  // /start <code> — account linking. Handled before anything else and never
  // subject to the unlinked-user guard below.
  const startMatch = text.trim().match(/^\/start(?:\s+(\S+))?$/i);
  if (startMatch && startMatch[1]) {
    const result = await linkTelegramAccount(startMatch[1], chatId);
    if (result.ok) {
      await reply(`✅ Linked! You're connected as ${result.name}.`);
    } else if (result.reason === 'expired') {
      await reply(`⚠️ That code has expired. Open Purple Bee → Settings → Connect Telegram to generate a new one.`);
    } else if (result.reason === 'used') {
      await reply(`⚠️ That code has already been used. Open Purple Bee → Settings → Connect Telegram to generate a new one.`);
    } else {
      await reply(`⚠️ That code isn't valid. Open Purple Bee → Settings → Connect Telegram to generate a new one.`);
    }
    return;
  }

  // Plain /start (no code) — always resets the conversation and shows the
  // greeting, even if the user was mid-flow (e.g. answering "due date").
  // Previously this fell through into handleBotMessage() without resetting
  // the session, so "/start" got swallowed as if it were the answer to
  // whatever question was pending.
  if (startMatch) {
    resetSession(`tg:${chatId}`, 'telegram');
    await reply(greetingText());
    return;
  }

  // Unlinked-user guard — every other message requires a linked account.
  const linkedUser = await resolveTelegramUser(chatId);
  if (!linkedUser) {
    await reply(`I don't recognize you yet — open Purple Bee → Settings → Connect Telegram to link your account.`);
    return;
  }

  await handleBotMessage(`tg:${chatId}`, 'telegram', text, reply, { ...linkedUser, telegramChatId: chatId });
});

/**
 * WebSocket Events
 */
io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('task:update', (data) => {
    socket.broadcast.emit('task:updated', data);
  });

  socket.on('status:change', (data) => {
    socket.broadcast.emit('status:changed', data);
  });

  // Live snapshots from the frontend so the WhatsApp/Telegram bot can query
  // real projects/tasks instead of hardcoded/hallucinated data.
  socket.on('projects:sync', (payload: LiveProject[]) => {
    liveProjects = payload || [];
  });

  socket.on('tasks:sync', (payload: LiveTask[]) => {
    liveTasks = payload || [];
  });

  // Frontend confirms it actually persisted a bot-created/updated task.
  // Shared map — task IDs are unique regardless of create vs update.
  const ackHandler = (payload: { id: string }) => {
    const resolve = pendingTaskAcks.get(payload.id);
    if (resolve) {
      resolve();
      pendingTaskAcks.delete(payload.id);
    }
  };
  socket.on('task:bot-created:ack', ackHandler);
  socket.on('task:bot-updated:ack', ackHandler);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * Purple Bee Rules — same file the WhatsApp/Telegram bot reads from,
 * so the in-app chat widget shows an identical rules response.
 */
app.get('/api/rules', (req: Request, res: Response) => {
  const rules = readRulesFile();
  if (rules === null) {
    res.status(404).json({ success: false, error: 'Rules file not found' });
  } else {
    res.json({ success: true, rules });
  }
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

/**
 * Error handler
 */
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  if (prisma) {
    try {
      await prisma.$connect();
      console.log('✅ Database connected');
    } catch (e) {
      console.warn('⚠️  DB connect failed (no DATABASE_URL?) — continuing without database');
      prisma = null;
    }
  } else {
    console.warn('⚠️  Running without database');
  }
  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (prisma) await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
