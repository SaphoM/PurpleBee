import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

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

// Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// ── Bot conversation state ───────────────────────────────────────────────
// Mirrors the frontend seed projects so the bot can present project options
// without a live DB connection. When Supabase is configured these can be
// replaced with real queries.
const BOT_PROJECTS = [
  { id: 'proj-1', name: 'Client Portal',    icon: '🌐' },
  { id: 'proj-2', name: 'Winter Campaign',  icon: '📣' },
  { id: 'proj-3', name: 'Ops & Compliance', icon: '🛡️' },
];

type BotStep =
  | 'idle'
  | 'ask-project'
  | 'ask-title'
  | 'ask-priority'
  | 'ask-status'
  | 'confirm';

interface BotSession {
  step: BotStep;
  channel: 'telegram' | 'whatsapp';
  projectId?: string;
  projectName?: string;
  taskTitle?: string;
  taskPriority?: string;
  taskStatus?: string;
}

const botSessions = new Map<string, BotSession>();

function getSession(key: string, channel: 'telegram' | 'whatsapp'): BotSession {
  if (!botSessions.has(key)) botSessions.set(key, { step: 'idle', channel });
  return botSessions.get(key)!;
}

function resetSession(key: string, channel: 'telegram' | 'whatsapp') {
  botSessions.set(key, { step: 'idle', channel });
}

function projectMenu(): string {
  return BOT_PROJECTS.map((p, i) => `${i + 1}. ${p.icon} ${p.name}`).join('\n');
}

async function sendTelegram(chatId: string, text: string) {
  const token = process.env.REACT_APP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch((e) => console.error('Telegram send error:', e));
}

async function sendWhatsApp(to: string, text: string) {
  const token   = process.env.REACT_APP_WHATSAPP_TOKEN;
  const phoneId = process.env.REACT_APP_WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return;
  await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  }).catch((e) => console.error('WhatsApp send error:', e));
}

function emitBotTask(session: BotSession) {
  const task = {
    title:         session.taskTitle!,
    projectId:     session.projectId,
    assignedTo:    undefined as string | undefined, // no user mapping for external channels yet
    priority:      session.taskPriority || 'medium',
    status:        session.taskStatus   || 'todo',
    sourceChannel: session.channel,
    createdAt:     new Date().toISOString(),
  };
  io.emit('task:bot-created', task);
  console.log(`✅ Bot task emitted [${session.channel}]:`, task.title);
}

async function handleBotMessage(
  key: string,
  channel: 'telegram' | 'whatsapp',
  text: string,
  reply: (msg: string) => Promise<void>
) {
  const session = getSession(key, channel);
  const input = text.trim();
  const lower = input.toLowerCase();
  const channelTag = channel === 'telegram' ? '✈ Telegram' : '🟢 WhatsApp';

  // Global cancel
  if (lower === '/cancel' || lower === 'cancel') {
    resetSession(key, channel);
    await reply('❌ Cancelled. Send /newtask or "new task" to start again.');
    return;
  }

  switch (session.step) {
    case 'idle': {
      // Trigger: /newtask [optional title] OR "new task"
      const isNewTask = lower.startsWith('/newtask') || lower.includes('new task') || lower === 'new task';
      if (!isNewTask) {
        await reply('👋 Hi! Send /newtask to create a task, or type "new task".');
        return;
      }
      // Check if title was given inline: /newtask Buy groceries
      const inlineTitle = input.replace(/^\/newtask\s*/i, '').trim();
      if (inlineTitle) session.taskTitle = inlineTitle;

      session.step = 'ask-project';
      await reply(`Which project?\n\n${projectMenu()}\n\nReply with the number (1–${BOT_PROJECTS.length}).`);
      break;
    }

    case 'ask-project': {
      const num = parseInt(input, 10);
      const proj = BOT_PROJECTS[num - 1];
      if (!proj) {
        await reply(`Please reply with a number between 1 and ${BOT_PROJECTS.length}:\n\n${projectMenu()}`);
        return;
      }
      session.projectId   = proj.id;
      session.projectName = proj.name;

      if (session.taskTitle) {
        // Title already provided inline — skip to priority
        session.step = 'ask-priority';
        await reply(`✅ Project: ${proj.icon} ${proj.name} — ${channelTag}\n\nTitle: "${session.taskTitle}"\n\nPriority?\n1. Low\n2. Medium\n3. High\n4. Urgent`);
      } else {
        session.step = 'ask-title';
        await reply(`✅ Project: ${proj.icon} ${proj.name} — ${channelTag}\n\nWhat's the task title?`);
      }
      break;
    }

    case 'ask-title': {
      session.taskTitle = input;
      session.step = 'ask-priority';
      await reply(`Title: "${input}"\n\nPriority?\n1. Low\n2. Medium\n3. High\n4. Urgent`);
      break;
    }

    case 'ask-priority': {
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
      session.taskPriority = p;
      session.step = 'ask-status';
      await reply(`Priority: ${p}\n\nColumn?\n1. To Do\n2. In Progress\n3. Review`);
      break;
    }

    case 'ask-status': {
      const sMap: Record<string, string> = {
        '1': 'todo',        'todo': 'todo',        'to do': 'todo',
        '2': 'in-progress', 'in-progress': 'in-progress', 'in progress': 'in-progress',
        '3': 'review',      'review': 'review',
      };
      const s = sMap[lower];
      if (!s) {
        await reply('Please reply: 1 (To Do), 2 (In Progress), or 3 (Review).');
        return;
      }
      session.taskStatus = s;
      session.step = 'confirm';
      await reply(
        `📋 Confirm task:\n\n` +
        `• Title: ${session.taskTitle}\n` +
        `• Project: ${session.projectName || 'None'}\n` +
        `• Priority: ${session.taskPriority}\n` +
        `• Status: ${s}\n` +
        `• Channel: ${channelTag}\n\n` +
        `Reply "yes" to create or "no" to cancel.`
      );
      break;
    }

    case 'confirm': {
      if (lower === 'yes' || lower === 'y' || lower === 'confirm') {
        emitBotTask(session);
        resetSession(key, channel);
        await reply('✅ Task created! It will appear on your Tasks page automatically.\n\nSend /newtask to create another.');
      } else {
        resetSession(key, channel);
        await reply('❌ Cancelled. Send /newtask to start again.');
      }
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

app.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  const body = req.body;
  res.status(200).json({ ok: true }); // Acknowledge immediately (Meta requires <5s)
  if (body.object === 'whatsapp_business_account') {
    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        const message = change.value?.messages?.[0];
        if (!message || message.type !== 'text') continue;
        const from = String(message.from);
        const text = message.text?.body || '';
        io.emit('whatsapp:message', { from, text, timestamp: new Date().toISOString() });
        console.log(`📱 WhatsApp from ${from}: ${text}`);
        await handleBotMessage(`wa:${from}`, 'whatsapp', text, (msg) => sendWhatsApp(from, msg));
      }
    }
  }
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
  io.emit('telegram:message', {
    chatId, senderName, username: from.username || '',
    text: message.text, messageId: message.message_id,
    timestamp: new Date(message.date * 1000).toISOString(),
  });
  console.log(`✈ Telegram from ${chatId}: ${message.text}`);
  await handleBotMessage(`tg:${chatId}`, 'telegram', message.text, (msg) => sendTelegram(chatId, msg));
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
  try {
    if (prisma) {
      await prisma.$connect();
      console.log('✅ Database connected');
    } else {
      console.warn('⚠️  Running without database');
    }
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📊 API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
