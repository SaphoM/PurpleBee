import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
const prisma = new PrismaClient();

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
    const task = await prisma.task.create({
      data: req.body,
    });
    io.emit('task:created', task);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
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
    await prisma.task.delete({
      where: { id: req.params.id },
    });
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

// ── Telegram Webhook ────────────────────────────────────────────────────
app.get('/webhook/telegram', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

app.post('/webhook/telegram', (req: Request, res: Response) => {
  const update = req.body;
  if (update.message && update.message.text) {
    const { message } = update;
    const chatId = String(message.chat.id);
    const from = message.from || {};
    const senderName = [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'Telegram User';
    const username = from.username || '';
    io.emit('telegram:message', {
      chatId,
      senderName,
      username,
      text: message.text,
      messageId: message.message_id,
      timestamp: new Date(message.date * 1000).toISOString(),
    });
  }
  res.status(200).json({ ok: true });
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
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

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
