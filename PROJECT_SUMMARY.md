# PurpleBee - Project Summary

## What Is PurpleBee?

A production-ready, enterprise-grade AI-powered productivity dashboard for teams. Features task management, project tracking, team chat, analytics, AI insights, and multi-channel notifications.

**Live staging:** https://purplebee-staging.onrender.com
**Repo:** https://github.com/SaphoM/PurpleBee
**Supabase project:** `sudkymxnzuiubnszpxbc`

---

## Key Features

### Task Management
- Create, read, update, delete tasks with drag-and-drop Kanban board
- Multi-level priorities (Low, Medium, High, Urgent)
- Status tracking (To Do, In Progress, Review, Completed)
- Progress tracking (0-100%), subtasks, file attachments
- Recurring tasks with customizable patterns
- Time estimation and tracking
- Task assignment to team members
- Multiple views: Kanban, List, Calendar, Timeline

### Project Management
- 8 project templates (Web App, Mobile, Marketing, API, Design System, Training, Services, Custom)
- Suggested tasks per template with priority and time estimates
- Team member assignment per project task
- Project status tracking (Planning, Active, On Hold, Completed)
- Delete projects with confirmation modal (hover trash icon on cards)
- Projects persist to Supabase DB for real users, localStorage for demo

### Team Collaboration
- Team invite system (Supabase magic link email + shareable URL)
- Role-based access control (Admin, Manager, User)
- In-app team chat with docked floating chat windows
- Admin "View As" to preview dashboards as other team members
- Smart notifications (assignments, due dates, mentions, AI insights)

### Analytics & AI
- Completion trends chart, priority distribution
- Productivity score calculation
- Focus session tracking
- AI-generated recommendations
- Team performance metrics
- Custom report generation

### Customization
- 6 accent color themes (Purple, Blue, Green, Amber, Red, Pink)
- Dark/Light mode
- Classic and Modern dashboard layouts (gradient hero cards, donut chart)
- Collapsible sidebar (icon-only mode on desktop)
- Welcome tips and configurable tooltip system

### Authentication & Security
- Supabase Auth (email/password + magic links)
- Quick Login demo mode (5 demo profiles with different roles)
- Row Level Security (RLS) on all Supabase tables
- Role-based permissions
- Team-scoped data isolation

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 18, TypeScript 5, Vite 4 |
| **Styling** | Tailwind CSS, CSS custom properties (accent theming) |
| **State** | Zustand 4 (7 stores) |
| **Charts** | Recharts 2 |
| **Icons** | Lucide React |
| **Auth & DB** | Supabase (Auth + Postgres + RLS) |
| **Hosting** | Render (static site, auto-deploy from staging) |
| **Utilities** | clsx, uuid, date-fns |

---

## Project Structure

```
src/
├── components/       # Reusable UI components (20+)
│   ├── Sidebar.tsx          # Collapsible nav, accent-themed
│   ├── TopBar.tsx           # Header, search, notifications, role switcher
│   ├── ModernDashboard.tsx  # Alternative dashboard layout
│   ├── KanbanBoard.tsx      # Drag-and-drop task board
│   ├── ChatBot.tsx          # AI assistant panel
│   ├── DockedChats.tsx      # Floating chat windows
│   └── ...                  # Card, Badge, Toast, Modal, MemberTooltip, etc.
│
├── pages/            # 11 page components
│   ├── Dashboard.tsx         # KPI cards, charts, layout toggle
│   ├── Tasks.tsx             # Task list/kanban with filters
│   ├── Projects.tsx          # Project cards, detail view, create/delete
│   ├── Chat.tsx              # Team messaging
│   ├── Team.tsx              # Member management + invite modal
│   ├── Analytics.tsx         # Charts and reports
│   ├── AIInsights.tsx        # AI recommendations
│   ├── CalendarPage.tsx      # Calendar view
│   ├── SettingsPage.tsx      # General, Appearance, Notifications, Data
│   ├── LoginPage.tsx         # Quick Login + email/password
│   ├── InviteAcceptPage.tsx  # Invite acceptance flow
│   └── InviteOnboardPage.tsx # Post-invite onboarding
│
├── stores/           # 7 Zustand stores
│   ├── taskStore.ts         # Tasks CRUD, DB hydration
│   ├── projectStore.ts      # Projects + project_tasks CRUD, localStorage + DB
│   ├── chatStore.ts         # Conversations, messages
│   ├── notificationStore.ts # Notifications, preferences
│   ├── userStore.ts         # Auth, session, roles, team context
│   ├── settingsStore.ts     # App prefs (accent, layout, mock toggle)
│   └── uiStore.ts           # Dark mode, sidebar collapse
│
├── lib/
│   ├── supabase.ts      # Supabase client init
│   └── dataService.ts   # DB abstraction layer (taskDb, projectDb, chatDb, etc.)
│
├── types/index.ts       # Shared TypeScript types
├── App.tsx              # Root layout + hash routing
├── index.css            # Tailwind + accent color CSS variables
└── main.tsx             # Entry point
```

---

## Supabase Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (id, name, email, role, avatar) |
| `teams` | Companies/workspaces |
| `team_members` | User-Team relationship |
| `tasks` | Task backlog (team-scoped) |
| `projects` | Project portfolio (team-scoped) |
| `project_tasks` | Tasks within a project |
| `invites` | Pending team invitations |
| `conversations` | Chat rooms |
| `messages` | Chat messages |
| `notifications` | In-app notification inbox |
| `user_settings` | Per-user preferences |

---

## Data Persistence

### Mock Mode ON (`keepMockData: true`, default)
- All data lives in-memory only (Zustand stores) — DB is never read or written
- Applies equally to Quick Login demo users and real Supabase users
- `restoreMockData()` populates 10 tasks, 3 projects, seed notifications, and chat channels
- Task assignment dropdowns show 5 hardcoded demo profiles (`user-1` through `user-5`)
- Projects are also cached to `purplebee-projects` localStorage key to survive page refresh

### Mock Mode OFF (`keepMockData: false`)
- Projects, tasks, chat, and notifications all persist to Supabase DB
- `isMockMode()` = `keepMockData` — same logic for all user types
- Mock `assigned_to` values (e.g. `user-1`) are sanitised to `null` before DB writes to avoid FK violations
- New users get demo data seeded to DB with proper UUIDs on first login (when DB is empty)
- localStorage acts as a fast cache for instant display while DB hydration runs in the background
- Task assignment dropdowns show real team members fetched from `team_members` + `invites` tables

---

## Getting Started

```bash
# Clone and install
git clone https://github.com/SaphoM/PurpleBee.git
cd PurpleBee && npm install

# Run in demo mode (no Supabase needed)
npm run dev

# Or with Supabase: copy .env.example to .env, add credentials
```

---

## Deployment

| Branch | Purpose |
|--------|---------|
| `staging` | Active development, auto-deploys to Render |
| `main` | Production |

```bash
# Build
npm run build

# Type check
npx tsc --noEmit

# Push to staging (triggers Render deploy)
GITHUB_TOKEN=<token> git push origin staging
```

---

**PurpleBee** | Built by Sapho Maqhwazima
