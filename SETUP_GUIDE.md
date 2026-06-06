# PurpleBee - Setup Guide

## What You're Getting

A production-ready, enterprise-grade AI-powered productivity dashboard with:
- React 18 frontend with TypeScript
- Tailwind CSS with accent color theming
- Zustand state management (7 stores)
- Recharts data visualization
- Kanban board with drag-and-drop
- Supabase backend (Auth + Postgres + RLS)
- Team collaboration with invite system
- In-app chat and notifications

## Quick Start (3 minutes)

### 1. Prerequisites
```bash
node --version   # Need 18+
npm --version    # Need 8+
```

### 2. Install and Run
```bash
git clone https://github.com/SaphoM/PurpleBee.git
cd PurpleBee
npm install
npm run dev
# Opens at http://localhost:5173
```

That's it! The app runs in demo mode without any backend configuration.

### 3. Optional: Connect Supabase
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Project Files Overview

### Frontend (`src/`)

**Components** (`src/components/`) - 20+ reusable UI components
- `Sidebar.tsx` - Collapsible navigation, accent-themed
- `TopBar.tsx` - Header, search, notifications, role switcher
- `ModernDashboard.tsx` - Alternative dashboard layout
- `KanbanBoard.tsx` - Drag-and-drop task board
- `ChatBot.tsx` - AI assistant panel
- `DockedChats.tsx` - Floating chat windows
- `MemberTooltip.tsx` - Team member hover cards
- Card, Badge, Toast, Modal components

**Pages** (`src/pages/`) - 11 page components
- `Dashboard.tsx` - KPI cards, charts, layout toggle
- `Tasks.tsx` - Task list/kanban with filters
- `Projects.tsx` - Project cards, detail view, create/delete
- `Chat.tsx` - Team messaging
- `Team.tsx` - Member management + invite modal
- `Analytics.tsx` - Charts and reports
- `AIInsights.tsx` - AI recommendations
- `CalendarPage.tsx` - Calendar view
- `SettingsPage.tsx` - General, Appearance, Notifications, Data
- `LoginPage.tsx` - Quick Login + email/password
- `InviteAcceptPage.tsx` / `InviteOnboardPage.tsx` - Invite flow

**State Management** (`src/stores/`) - 7 Zustand stores
- `taskStore.ts` - Tasks CRUD, DB hydration
- `projectStore.ts` - Projects + project_tasks CRUD, localStorage + DB
- `chatStore.ts` - Conversations, messages
- `notificationStore.ts` - Notifications, preferences
- `userStore.ts` - Auth, session, roles, team context
- `settingsStore.ts` - App prefs (accent, layout, mock toggle)
- `uiStore.ts` - Dark mode, sidebar collapse

**Data Layer** (`src/lib/`)
- `supabase.ts` - Supabase client initialization
- `dataService.ts` - DB abstraction layer (taskDb, projectDb, chatDb, etc.)

**Types** (`src/types/`)
- `index.ts` - All shared TypeScript interfaces

**Other Files**
- `App.tsx` - Root layout + hash-based routing
- `main.tsx` - Entry point
- `index.css` - Tailwind base + accent color CSS variables

### Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS config
- `vite.config.ts` - Vite build configuration
- `.env.example` - Environment variables template

---

## Environment Variables

Create `.env` from the template:
```bash
cp .env.example .env
```

Add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these, the app runs fully in demo mode with mock data.

---

## Mock Mode vs Real Mode

The `keepMockData` setting (default: `true`) controls data separation uniformly for **all** user types.

### Mock Mode ON (`keepMockData: true`)
- No Supabase credentials needed — works with Quick Login and real accounts alike
- 5 hardcoded demo profiles (Sapho, Thando, Lerato, Kabelo, Naledi) used for task/project assignment
- All data in-memory only (Zustand stores) — DB is never read or written
- `restoreMockData()` populates 10 tasks, 3 projects, notifications, and chat channels
- Projects also cached to `purplebee-projects` localStorage key to survive page refresh

### Mock Mode OFF (`keepMockData: false`)
- Requires Supabase URL and anon key in `.env` for full functionality
- Email/password + magic link authentication
- All data persists to Supabase Postgres (tasks, projects, notifications, chat)
- `isMockMode()` = `keepMockData` — same function for Quick Login and real Supabase users
- New users get demo data seeded to DB with proper UUIDs on first login (when DB is empty)
- Task/project assignment dropdowns show real team members from `team_members` + `invites` tables
- localStorage acts as cache for instant display during async DB hydration

> **Toggling in SettingsPage** calls `loadAssignableMembers()` in both directions so dropdowns update immediately without a page reload.

---

## Development Workflow

### Using the App

**Creating a Task:**
1. Navigate to Tasks page
2. Click "New Task" button
3. Fill in details (title, priority, due date, assignee)
4. Task appears in Kanban board or list view

**Managing Projects:**
1. Navigate to Projects page
2. Click "Create Project" - choose from 8 templates
3. Hover project card for delete icon
4. Click project card for detail view with tasks

**Team Features:**
1. Navigate to Team page
2. Invite members via email or shareable link
3. Use Chat for team messaging
4. Admin can "View As" other team members

### Useful Commands
```bash
# Development server
npm run dev

# Type check
npx tsc --noEmit

# Production build
npm run build
# Output in dist/

# Preview production build
npm run preview
```

---

## Supabase Database

### Key Tables (all RLS-enabled)
| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (id, name, email, role, avatar) |
| `teams` | Companies/workspaces |
| `team_members` | User-Team relationship with role |
| `tasks` | Task backlog (team-scoped) |
| `projects` | Project portfolio (team-scoped) |
| `project_tasks` | Tasks within a project |
| `invites` | Pending team invitations |
| `conversations` | Chat rooms |
| `messages` | Chat messages |
| `notifications` | In-app notification inbox |
| `user_settings` | Per-user preferences |

### Row Level Security
- Team-scoped reads via `team_members` join
- `is_admin_or_manager()` helper function
- `handle_new_user()` trigger auto-creates profile + accepts pending invites

---

## Troubleshooting

**"Module not found" errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
```bash
npx tsc --noEmit
# Fix any reported issues
```

**Projects not persisting:**
- Check if logged in as real user (not Quick Login)
- Check browser console for Supabase errors
- Verify `.env` has correct Supabase credentials

**Blank page after login:**
- Check browser console for errors
- Try clearing localStorage: `localStorage.clear()`
- Refresh the page

---

## Documentation Map

| Document | Content |
|----------|---------|
| `README.md` | Project overview, features, quick start |
| `PROJECT_SUMMARY.md` | Comprehensive project summary |
| `ARCHITECTURE.md` | System design, state management, data flow |
| `DEPLOYMENT.md` | Staging and production deployment |
| `SETUP_GUIDE.md` | This file - detailed setup walkthrough |
| `QUICK_START.md` | Minimal 3-minute setup |
| `START_HERE.md` | Entry point for new developers |
| `FILE_TREE.md` | Complete file structure |
| `INDEX.md` | File navigation guide |
| `CONTEXT.md` | Development context and recent changes |

---

**PurpleBee** | Built by Sapho Maqhwazima
