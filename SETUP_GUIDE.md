# Complete Setup Guide - TaskFlow Productivity Dashboard

Welcome! This guide will walk you through setting up the complete TaskFlow productivity dashboard application.

## 📋 What You're Getting

A production-ready, enterprise-grade productivity dashboard with:
- ✅ Modern React frontend with TypeScript
- ✅ Responsive Tailwind CSS styling
- ✅ Zustand state management
- ✅ Real-time analytics with Recharts
- ✅ Kanban board with drag-and-drop
- ✅ Node.js/Express backend API
- ✅ PostgreSQL database with Prisma ORM
- ✅ WhatsApp & Telegram integrations
- ✅ Real-time WebSocket communication
- ✅ Complete authentication system

## 🎯 Quick Start (5 minutes)

### 1. Prerequisites Check
```bash
# Check Node.js version (need 16+)
node --version

# Check npm version (need 8+)
npm --version

# Check PostgreSQL (need 12+)
psql --version
```

### 2. Create PostgreSQL Database
```bash
# On Windows/Mac/Linux with PostgreSQL installed
createdb taskflow

# Or connect to PostgreSQL and run:
# CREATE DATABASE taskflow;
```

### 3. Setup Environment Variables

Copy and fill in the files:
```bash
# Frontend environment
cp .env.example .env

# Backend environment
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your database URL:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
JWT_SECRET=your_secret_key_here
```

### 4. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### 5. Initialize Database

```bash
# Run migrations
cd backend
npx prisma migrate dev --name init

# Verify database
npx prisma studio
cd ..
```

### 6. Start Development Servers

**Terminal 1 - Frontend:**
```bash
npm run dev
# Opens at http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
# API running at http://localhost:3000
```

Done! 🎉

---

## 📁 Project Files Overview

### Frontend Files (`src/`)

**Components** (`src/components/`)
- `Button.tsx` - Reusable button component
- `Card.tsx` - Card container with header and content
- `Input.tsx` - Text input with validation
- `TextArea.tsx` - Multi-line input
- `Select.tsx` - Dropdown selector
- `Modal.tsx` - Modal dialog system
- `Badge.tsx` - Status and priority badges
- `TaskCard.tsx` - Task display card
- `KanbanBoard.tsx` - Kanban board with columns
- `StatCard.tsx` - KPI statistics card
- `Sidebar.tsx` - Left navigation panel
- `TopBar.tsx` - Top header bar with search

**Pages** (`src/pages/`)
- `Dashboard.tsx` - Main dashboard with metrics
- `Tasks.tsx` - Task management page
- `Calendar.tsx` - Calendar view (ready to extend)
- `Analytics.tsx` - Analytics dashboard (ready to extend)
- `Settings.tsx` - User settings (ready to extend)

**State Management** (`src/stores/`)
- `taskStore.ts` - Task state and actions
- `uiStore.ts` - UI state (sidebar, dark mode, etc.)
- `userStore.ts` - User authentication state
- `notificationStore.ts` - Notifications system

**Services** (`src/services/`)
- `api.ts` - Axios API client with all endpoints
- `mockService.ts` - Mock data for development

**Integrations** (`src/integrations/`)
- `whatsapp.config.ts` - WhatsApp setup and helpers
- `telegram.config.ts` - Telegram setup and helpers

**Types** (`src/types/`)
- `index.ts` - All TypeScript type definitions

**Other Files**
- `App.tsx` - Main app component
- `main.tsx` - Entry point
- `index.css` - Global styles

### Configuration Files

- `package.json` - Frontend dependencies
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS config
- `.env.example` - Frontend env variables template

### Backend Files (`backend/`)

**Server** (`backend/src/`)
- `index.ts` - Express server with all API routes

**Configuration**
- `package.json` - Backend dependencies
- `.env.example` - Backend env variables template

### Database

- `prisma/schema.prisma` - Complete database schema
- Database migrations auto-created by Prisma

### Documentation

- `README.md` - Project overview and quick start
- `ARCHITECTURE.md` - Detailed system architecture
- `DEPLOYMENT.md` - Production deployment guide
- `SETUP_GUIDE.md` - This file!

---

## 🔧 Detailed Configuration

### Frontend Environment Variables

Create `.env` and add:
```env
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api

# WhatsApp Integration
REACT_APP_WHATSAPP_PHONE_ID=          # Your WhatsApp Phone Number ID
REACT_APP_WHATSAPP_ACCOUNT_ID=        # Your Business Account ID
REACT_APP_WHATSAPP_WEBHOOK_TOKEN=     # Webhook verification token

# Telegram Integration
REACT_APP_TELEGRAM_BOT_TOKEN=         # Your Telegram Bot Token
REACT_APP_TELEGRAM_BOT_USERNAME=      # Your Bot Username
REACT_APP_TELEGRAM_WEBHOOK_URL=       # Your webhook URL
```

### Backend Environment Variables

Create `backend/.env` and add:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow

# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your_super_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# WhatsApp
WHATSAPP_PHONE_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_TOKEN=
WHATSAPP_WEBHOOK_TOKEN=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_URL=

# Optional Services
REDIS_URL=redis://localhost:6379
SENTRY_DSN=
```

---

## 🚀 Development Workflow

### Creating a New Task

1. Open the application
2. Click "New Task" button
3. Fill in task details:
   - Title (required)
   - Description (optional)
   - Priority (Low, Medium, High, Urgent)
   - Due date
   - Tags for organization
   - Assign to team member

4. Task appears in Kanban board

### Managing Tasks

- **Drag-and-drop**: Move tasks between status columns
- **Click task**: View full details
- **Edit**: Click task and modify details
- **Delete**: Right-click task for delete option
- **Filter**: Use filters for priority, status, assignee
- **View modes**: Toggle between Kanban and List views

### Dashboard Insights

The dashboard shows:
- Completed tasks count
- Tasks in progress
- Overdue tasks
- Productivity score (0-100)
- Completion trends chart
- Priority distribution
- Focus session data
- AI-generated insights

---

## 🔌 Setting Up Integrations

### WhatsApp Integration

1. **Get credentials:**
   - Visit meta.com/en_US/developers
   - Create Business Account
   - Create WhatsApp Business App
   - Get Phone Number ID and Access Token

2. **Add to environment:**
   ```env
   REACT_APP_WHATSAPP_PHONE_ID=123456789
   WHATSAPP_TOKEN=EAAxxxxxx
   WHATSAPP_WEBHOOK_TOKEN=my_webhook_token
   ```

3. **Test:**
   ```bash
   # In backend code, WhatsApp service is ready to use
   import { whatsappService } from '@integrations/whatsapp.config'
   await whatsappService.sendMessage('1234567890', 'Task reminder!')
   ```

### Telegram Integration

1. **Get credentials:**
   - Open Telegram, search for @BotFather
   - Create new bot with /newbot command
   - Get bot token

2. **Add to environment:**
   ```env
   REACT_APP_TELEGRAM_BOT_TOKEN=123456789:ABCDefg
   REACT_APP_TELEGRAM_BOT_USERNAME=taskflow_bot
   REACT_APP_TELEGRAM_WEBHOOK_URL=https://api.example.com/webhook/telegram
   ```

3. **Test:**
   ```bash
   # In backend code, Telegram service is ready to use
   import { telegramService } from '@integrations/telegram.config'
   await telegramService.sendMessage('123456789', 'Task reminder!')
   ```

---

## 📊 Database Schema

The application uses 13 main tables:

1. **users** - User accounts
2. **teams** - Team organization
3. **team_members** - Team membership
4. **projects** - Project grouping
5. **tasks** - Individual tasks
6. **subtasks** - Task subdivisions
7. **attachments** - File attachments
8. **notifications** - User notifications
9. **integrations** - Connected services
10. **focus_sessions** - Pomodoro/focus tracking
11. **ai_insights** - AI-generated recommendations
12. **reports** - Generated reports
13. **audit_logs** - Activity tracking

See `prisma/schema.prisma` for full details.

---

## 🧪 Testing & Debugging

### View Database UI
```bash
cd backend
npx prisma studio
# Opens http://localhost:5555
```

### Check API Endpoints
```bash
# Open http://localhost:3000/api/health
# Should return: { status: "OK", timestamp: "..." }
```

### Browser DevTools
- React DevTools browser extension
- Redux DevTools (for Zustand state)
- Network tab to see API calls
- Application tab to check localStorage

### Common Issues

**Port already in use:**
```bash
# Change port in backend/.env
PORT=3001

# For frontend, Vite will ask to use next port
```

**Database connection error:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string format
postgresql://username:password@localhost:5432/taskflow
```

**Module not found:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Next Steps

### 1. Explore the Application
- Create tasks
- Try different views (Kanban, List)
- Check the Dashboard
- View Analytics (mock data)

### 2. Customize for Your Needs
- Add team members
- Create projects
- Setup integrations
- Configure notifications

### 3. Deploy to Production
- See `DEPLOYMENT.md` for full guide
- Popular options: Vercel (frontend), Railway (backend)
- Database: Supabase, AWS RDS, or DigitalOcean

### 4. Extend Features
- Add more pages
- Implement advanced filters
- Create custom reports
- Build mobile app (React Native)

---

## 📖 Documentation Map

| Document | Content |
|----------|---------|
| README.md | Project overview, features, quick start |
| ARCHITECTURE.md | System design, API endpoints, data models |
| DEPLOYMENT.md | Production deployment guide, CI/CD, monitoring |
| SETUP_GUIDE.md | This guide - step-by-step setup |

---

## 🆘 Getting Help

### Common Questions

**Q: How do I reset the database?**
```bash
cd backend
npx prisma migrate reset
# This clears data and reruns migrations
```

**Q: How do I add a new feature?**
1. Add to database schema (`prisma/schema.prisma`)
2. Run migration (`npx prisma migrate dev`)
3. Create API endpoint (backend)
4. Create React component (frontend)
5. Connect with Zustand store

**Q: How do I change the port?**
```env
# backend/.env
PORT=3001

# Frontend: Vite auto-detects available ports
```

### Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/)

### Support

- Open issues on GitHub
- Check existing issues for solutions
- Read documentation first
- Provide error messages when asking for help

---

## ✅ Verification Checklist

Before going to production, verify:

- [ ] All environment variables set
- [ ] Database migrations run successfully
- [ ] Frontend builds without errors
- [ ] Backend starts without errors
- [ ] Can create/edit/delete tasks
- [ ] Dashboard loads all metrics
- [ ] Integrations configured (optional)
- [ ] Tested on different browsers
- [ ] Mobile responsive design works
- [ ] All tests passing (if added)

---

## 🎉 You're All Set!

Your productivity dashboard is ready to use. Enjoy managing tasks more efficiently!

For questions or issues, refer to the documentation or open a GitHub issue.

**Happy tasking! 🚀**
