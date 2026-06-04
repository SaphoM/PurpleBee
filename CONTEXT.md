# PurpleBee — Project Context

> Lightweight reference for AI-assisted development sessions.
> Update this file as the project evolves.

---

## 1. What Is PurpleBee?

A **productivity dashboard SaaS** for teams — task management, project tracking, team chat, notifications, analytics, and AI insights. Built as a single-page React app with Supabase backend.

**Live staging:** https://purplebee-staging.onrender.com
**Repo:** https://github.com/SaphoM/PurpleBee

---

## 2. Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 4 |
| Styling | Tailwind CSS + CSS custom properties (accent theming) |
| State | Zustand 4 (7 stores, no Redux) |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Auth & DB | Supabase (Auth + Postgres + Edge Functions) |
| Hosting | Render (static site, staging branch auto-deploys) |
| Utilities | clsx, uuid, date-fns |

---

## 3. Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Sidebar.tsx          # Main nav — collapsible, accent-themed
│   ├── TopBar.tsx           # Header bar — notifications, search, role switcher
│   ├── ModernDashboard.tsx  # Alternative dashboard layout (gradient hero cards)
│   ├── DockedChats.tsx      # Floating chat windows
│   ├── KanbanBoard.tsx      # Drag-and-drop task board
│   ├── ChatBot.tsx          # AI assistant panel
│   ├── Tip.tsx              # Tooltip system + WelcomeTipsModal
│   ├── CreateTaskModal.tsx  # New task form
│   ├── TaskDetailModal.tsx  # Task detail/edit view
│   ├── MemberTooltip.tsx    # Team member hover card
│   └── (Card, Badge, Button, Input, Modal, Select, StatCard, Toast, TaskCard)
│
├── pages/
│   ├── LoginPage.tsx     # Auth: quick-login (demo) + Supabase email/password
│   ├── Dashboard.tsx     # KPI cards, charts, AI insights — has layout toggle
│   ├── Tasks.tsx         # Task list/kanban with filters
│   ├── Projects.tsx      # Project cards + detail view
│   ├── CalendarPage.tsx  # Calendar with task events
│   ├── Chat.tsx          # Full-page team messaging
│   ├── Team.tsx          # Team member management
│   ├── Analytics.tsx     # Charts and reports
│   ├── AIInsights.tsx    # AI recommendations page
│   └── SettingsPage.tsx  # General, Appearance, Notifications, Data
│
├── stores/              # Zustand state management
│   ├── taskStore.ts         # Tasks CRUD, mock data, DB hydration
│   ├── projectStore.ts      # Projects CRUD, seed data
│   ├── chatStore.ts         # Conversations, messages, team members
│   ├── notificationStore.ts # Notifications, preferences, grouping
│   ├── userStore.ts         # Auth, session, roles, hydrateStores()
│   ├── settingsStore.ts     # App prefs (accent, layout, mock toggle)
│   └── uiStore.ts           # Dark mode, sidebar collapse
│
├── lib/
│   ├── supabase.ts      # Supabase client init, isDbConnected()
│   └── dataService.ts   # DB abstraction: authDb, taskDb, chatDb
│
├── types/
│   └── index.ts         # Shared TypeScript types (Task, Project, etc.)
│
├── App.tsx              # Root layout: sidebar + topbar + routes
├── index.css            # Tailwind base + accent color CSS variables
└── main.tsx             # Entry point
```

---

## 4. Key Architectural Patterns

### State Management
- **7 Zustand stores** — no prop drilling, components subscribe directly.
- `settingsStore` persists to `localStorage` key `purplebee-settings`.
- `uiStore` persists sidebar collapse to `purplebee-sidebar-collapsed`.

### Mock Data System
- `keepMockData` (default: `true`) controls whether stores show sample data.
- On toggle OFF: all stores call `clearMockData()`, then hydrate from Supabase.
- On toggle ON: all stores call `restoreMockData()` with current user ID.
- **Important:** `taskStore` and `projectStore` read `keepMockData` from localStorage at *module init* to decide initial state (avoids flash of mock data on refresh).
- `restoreMockData(userId)` in taskStore reassigns half the mock tasks to the current user's ID so non-admin users see data.

### Hydration Flow (`hydrateStores()` in userStore.ts)
Called after every login (demo, email, or session restore):
1. **Mock ON** → populate all stores with mock/seed data
2. **Mock OFF** → clear all stores first, then hydrate from Supabase if connected

### Auth
- **Quick Login** — demo profiles (`user-1` through `user-5`) for development
- **Supabase Auth** — email/password sign-up with email confirmation
- `emailRedirectTo: window.location.origin` ensures confirmation links go to the right environment
- DB trigger `handle_new_user()` auto-creates profile on sign-up; first user gets `admin` role

### Accent Color Theming
- CSS custom properties `--accent-50` through `--accent-900` defined in `index.css`
- `data-accent` attribute on `<html>` activates color overrides
- 6 palettes: purple (default), blue, green, amber, red, pink
- `accentColorMap` in settingsStore maps each to hex/label/tw values

### Dashboard Layouts
- `dashboardLayout: 'default' | 'modern'` in settingsStore
- Toggle in `Dashboard.tsx` and `SettingsPage.tsx`
- Both layouts share the same greeting header wrapper

### Roles & Permissions
- Roles: `admin`, `manager`, `user`
- `canViewAllTasks()` — admin/manager see all; users see only their assigned tasks
- `canInviteMembers()` — admin only
- `canManageTeam()` — admin only
- `viewAs` system lets admins view dashboards as other users

---

## 5. Environment Variables

```env
VITE_SUPABASE_URL=https://sudkymxnzuiubnszpxbc.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

When these are missing, `isDbConnected()` returns `false` and the app runs in offline/demo mode.

---

## 6. Supabase Details

- **Project ID:** `sudkymxnzuiubnszpxbc`
- **Key tables:** `profiles`, `tasks`, `conversations`, `messages`, `conversation_participants`
- **Trigger:** `on_auth_user_created` → `handle_new_user()` (auto-creates profile, first user = admin)
- **Important:** Site URL in Supabase Auth > URL Configuration must match the deploy URL (not localhost)

---

## 7. Git & Deployment

| Branch | Purpose |
|--------|---------|
| `main` | Production (not yet live) |
| `staging` | Active development, auto-deploys to Render |
| `feature/*` | Feature branches |
| `setup/*` | Infrastructure branches |

- **Current working branch:** `staging`
- **PR:** #6 (staging → main)
- **Deploy:** Render static site, auto-deploys on push to staging
- **Git identity:** `Sapho Maqhwazima <sapho@xspark.co.za>` (must pass via `-c` flags — global config not set)

---

## 8. Path Aliases

```
@/*           → src/*
@components/* → src/components/*
@pages/*      → src/pages/*
@stores/*     → src/stores/*
@hooks/*      → src/hooks/*
```

---

## 9. Common Commands

```bash
# Dev server
npx vite --host --port 5173

# Type check (no emit)
npx tsc --noEmit

# Build for production
npx vite build

# Push to staging (triggers deploy)
GITHUB_TOKEN=<token> git push origin staging

# Commit (no global git config)
git -c user.name="Sapho Maqhwazima" -c user.email="sapho@xspark.co.za" commit -m "message"
```

---

## 10. Known Quirks & Gotchas

1. **Tailwind + CSS vars:** After adding new accent-* classes, Vite may need a restart to pick them up.
2. **Mock task assignment:** Mock tasks use IDs `user-1` to `user-5`. Real Supabase users have UUIDs. `restoreMockData(userId)` handles the mapping.
3. **localStorage keys:** `purplebee-settings`, `purplebee-sidebar-collapsed`, `purplebee-notif-prefs`.
4. **No global git config** on this machine — always use `-c user.name=... -c user.email=...` flags.
5. **Supabase MCP** is available for direct DB queries during development.

---

## 11. Recent Changes (Latest First)

| Commit | Description |
|--------|-------------|
| `0a8ea3e` | Clear all stores when mock data is off, regardless of DB connection |
| `bd842cb` | Fix notifications/chats reloading mock data when toggle is off |
| `7f54f0b` | Fix mock data reappearing on refresh when toggle is off |
| `36e257b` | Fix mock data not showing for Supabase users on first login |
| `9adb734` | Fix email confirmation redirect to use production URL |
| `3e150f6` | Align greeting padding between classic and modern dashboard layouts |
| `51768b4` | Add modern dashboard layout toggle with hero gradient cards |
| `7ee8851` | Add accent color theme system with 6 color options |
| `e528521` | Add sidebar collapse/expand toggle with icon-only mode |
| `24002e0` | Wire up Supabase Auth for real email/password login and sign-up |

---

## 12. Open Items / TODO

- [ ] Supabase dashboard: set Site URL to `https://purplebee-staging.onrender.com` in Auth > URL Configuration
- [ ] `projectStore.hydrateFromDb()` — not yet implemented (projects are mock-only)
- [ ] `notificationStore.hydrateFromDb()` — not yet implemented (notifications are mock-only)
- [ ] Real-time subscriptions for tasks/chat (Supabase Realtime)
- [ ] File uploads / attachments
- [ ] Production deploy to `main` branch
