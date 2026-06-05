# PurpleBee - File Index

## Documentation

| Document | Content |
|----------|---------|
| `START_HERE.md` | Entry point for new developers |
| `QUICK_START.md` | 3-minute setup |
| `SETUP_GUIDE.md` | Detailed setup walkthrough |
| `README.md` | Project overview and features |
| `PROJECT_SUMMARY.md` | Comprehensive project summary |
| `ARCHITECTURE.md` | System design, state management, data flow |
| `DEPLOYMENT.md` | Staging and production deployment |
| `FILE_TREE.md` | Complete directory structure |
| `INDEX.md` | This file |
| `CONTEXT.md` | Development context and recent changes |

---

## Source Code

### Entry Point
```
src/main.tsx               # React entry point
src/App.tsx                # Root layout + hash-based routing
src/index.css              # Tailwind base + accent color CSS variables
```

### Components (`src/components/`) - 20+ files
Reusable UI: Sidebar, TopBar, ModernDashboard, KanbanBoard, ChatBot, DockedChats, MemberTooltip, Card, Badge, Toast, Modal, and more.

### Pages (`src/pages/`) - 11 files
```
Dashboard.tsx              # KPI cards, charts, layout toggle
Tasks.tsx                  # Task list/kanban with filters
Projects.tsx               # Project cards, create/delete
Chat.tsx                   # Team messaging
Team.tsx                   # Member management + invite modal
Analytics.tsx              # Charts and reports
AIInsights.tsx             # AI recommendations
CalendarPage.tsx           # Calendar view
SettingsPage.tsx           # General, Appearance, Notifications, Data
LoginPage.tsx              # Quick Login + email/password auth
InviteAcceptPage.tsx       # Invite acceptance flow
InviteOnboardPage.tsx      # Post-invite onboarding
```

### Zustand Stores (`src/stores/`) - 7 files
```
taskStore.ts               # Tasks CRUD, DB hydration
projectStore.ts            # Projects + project_tasks, localStorage + DB
chatStore.ts               # Conversations, messages
notificationStore.ts       # Notifications, preferences
userStore.ts               # Auth, session, roles, team context
settingsStore.ts           # Accent color, layout, mock toggle
uiStore.ts                 # Dark mode, sidebar collapse
```

### Data Layer (`src/lib/`)
```
supabase.ts                # Supabase client initialization
dataService.ts             # DB abstraction (taskDb, projectDb, chatDb, etc.)
```

### Types (`src/types/`)
```
index.ts                   # All shared TypeScript interfaces
```

---

## Configuration
```
package.json               # Dependencies and scripts
tsconfig.json              # TypeScript configuration
tailwind.config.js         # Tailwind CSS config
vite.config.ts             # Vite build configuration
.env.example               # Environment variables template
```

---

## Navigation by Purpose

**Getting started:** START_HERE.md > QUICK_START.md > SETUP_GUIDE.md

**Understanding the system:** ARCHITECTURE.md > CONTEXT.md

**Deploying:** DEPLOYMENT.md

**Frontend development:** `src/components/` > `src/pages/` > `src/stores/`

**Data persistence:** `src/lib/dataService.ts` > `src/stores/projectStore.ts`

**Theming:** `src/index.css` > `src/stores/settingsStore.ts`

---

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts |
| `teams` | Workspaces |
| `team_members` | User-Team with role |
| `tasks` | Task backlog |
| `projects` | Project portfolio |
| `project_tasks` | Tasks within projects |
| `invites` | Team invitations |
| `conversations` | Chat rooms |
| `messages` | Chat messages |
| `notifications` | Notification inbox |
| `user_settings` | Per-user preferences |

---

**PurpleBee** | Built by Sapho Maqhwazima | Last updated June 2026
