# PurpleBee — Project Context

> Lightweight reference for AI-assisted development sessions.
> Update this file as the project evolves.

---

## 1. What Is PurpleBee?

A **productivity dashboard SaaS** for teams — task management, project tracking, team chat, notifications, analytics, and AI insights. Built as a single-page React app with Supabase backend.

**Live staging:** https://purplebee-staging.onrender.com  
**Repo:** https://github.com/SaphoM/PurpleBee  
**Supabase Project:** `sudkymxnzuiubnszpxbc`

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
| Auth & DB | Supabase (Auth + Postgres + RLS) |
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
│   ├── LoginPage.tsx         # Auth: quick-login (demo) + Supabase email/password
│   ├── InviteAcceptPage.tsx  # Invite acceptance — handles ?invite_token= and #invite?token=
│   ├── InviteOnboardPage.tsx # Post-invite onboarding — set password + preferences
│   ├── Dashboard.tsx         # KPI cards, charts, AI insights — has layout toggle
│   ├── Tasks.tsx             # Task list/kanban with filters
│   ├── Projects.tsx          # Project cards + detail view
│   ├── CalendarPage.tsx      # Calendar with task events
│   ├── Chat.tsx              # Full-page team messaging
│   ├── Team.tsx              # Team member management + invite modal
│   ├── Analytics.tsx         # Charts and reports
│   ├── AIInsights.tsx        # AI recommendations page
│   └── SettingsPage.tsx      # General, Appearance, Notifications, Data
│
├── stores/              # Zustand state management
│   ├── taskStore.ts         # Tasks CRUD, mock data, DB hydration, team_id stamping
│   ├── projectStore.ts      # Projects + project_tasks CRUD, seed data, DB persistence
│   ├── chatStore.ts         # Conversations, messages, team members
│   ├── notificationStore.ts # Notifications, preferences, grouping, DB persistence
│   ├── userStore.ts         # Auth, session, roles, currentTeamId, hydrateStores()
│   ├── settingsStore.ts     # App prefs (accent, layout, mock toggle)
│   └── uiStore.ts           # Dark mode, sidebar collapse
│
├── lib/
│   ├── supabase.ts      # Supabase client init, isDbConnected()
│   └── dataService.ts   # DB abstraction layer (see §6 for full API)
│
├── types/
│   └── index.ts         # Shared TypeScript types (Task, Project, Notification etc.)
│
├── App.tsx              # Root layout: sidebar + topbar + page routes + invite routing
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
- **All 4 stores** use the same `isMockMode()` = `keepMockData`. When true, all DB reads and writes are skipped — data lives in-memory only. This ensures clean separation between sample and real data.
- On toggle **OFF** (`applyRealMode` in SettingsPage): `clearMockData()` wipes Zustand state (not localStorage or DB), then `hydrateFromDb()` replaces state with DB data (seeding if empty).
- On toggle **ON**: all stores call `restoreMockData()` with the current user ID.
- `taskStore` and `projectStore` read `keepMockData` from localStorage at *module init* to avoid flash of mock data on refresh.
- `taskStore.restoreMockData(userId)` assigns **all** mock tasks to the current user so non-admin users see the full set.
- `projectStore.restoreMockData()` always uses built-in seed projects (never localStorage, which may contain real DB data).
- `taskStore.hydrateFromDb` seeds demo tasks when DB is empty (mirrors projectStore pattern).
- `toDbProjectTask` sanitises `assigned_to` — mock IDs like `user-1` are replaced with `null` to avoid FK violations.

### Hydration Flow (`hydrateStores()` + `hydrateWithTeam()` in userStore.ts)
Called after every login (demo, email, or session restore):
1. **Mock ON** → populate all stores with mock/seed data (in-memory only, DB never touched)
2. **Mock OFF** → two-phase hydration to avoid race conditions:
   - **Phase 1 (`hydrateStores`)**: Only hydrates `notificationStore` (user-scoped, no team dependency)
   - **Phase 2 (`hydrateWithTeam`)**: Runs AFTER `currentTeamId` resolves — hydrates tasks, chat, and projects with proper team context via `Promise.all`:
     - `taskStore.hydrateFromDb(userId)` — team-scoped task fetch
     - `chatStore.hydrateFromDb(userId)` — loads real team members, seeds General/Announcements if DB is empty
     - `projectStore.hydrateFromDb(userId)` — project + project_tasks, seeds demo projects if DB is empty
     - Auth session is guaranteed valid (getOrCreateTeam already succeeded)

> **Why two phases?** Chat, projects, and tasks need `currentTeamId` for team-scoped queries. Calling `hydrateFromDb` before team resolves caused: (a) project seed inserts rejected by RLS (`auth.uid()` timing), (b) duplicate chat channels from concurrent calls.

### Team Context & Data Scoping
Every DB write that should belong to a company attaches a `team_id`.  
`userStore` resolves and caches this as `currentTeamId` on login:

```
loginWithEmail / initSession
  → authDb.getOrCreateTeam(userId, name)
  → set({ currentTeamId, currentTeamName })
```

Each store reads `currentTeamId` via a lazy `require('@stores/userStore')` at call-time (avoids circular deps at module init).

| Store | team_id stamped on write? |
|-------|--------------------------|
| `taskStore.addTask` | ✅ `teamId || taskData.teamId` |
| `projectStore.createProject` | ✅ via `getTeamContext()` |
| `chatStore.createConversation` | ✅ passed by caller |
| Invite / `inviteDb.create` | ✅ `team_id` from `ensureTeam()` |

### Auth
- **Quick Login** — demo profiles (`user-1` through `user-5`) for development.
- **Supabase Auth** — email/password sign-up with email confirmation.
- `emailRedirectTo: window.location.origin` ensures confirmation links go to the right environment.
- DB trigger `handle_new_user()` (`SECURITY DEFINER`):
  - Auto-creates `profiles` row on sign-up
  - First user gets `admin` role
  - Auto-accepts pending invite by matching email in `invites` table
  - Auto-joins team from invite's `team_id`

### Invite Flow (End-to-End)
1. **Admin sends invite** (Team.tsx `InviteModal`):
   - `ensureTeam()` → `userStore.ensureTeam()` → `authDb.getOrCreateTeam()` (auto-creates team if none exists, caches `currentTeamId`)
   - `inviteDb.create(teamId, invitedBy, role, email)` → inserts into `invites` table with a UUID token
   - `authDb.sendMagicLinkInvite(email, token)` → Supabase OTP with `redirectTo: ?invite_token=<token>`
   - Optionally: "Generate Link" button creates invite and shows copyable `#invite?token=<token>` URL

2. **Invitee clicks link** (InviteAcceptPage.tsx):
   - `inviteDb.getByToken(token)` validates status, expiry
   - If authenticated (magic link flow) → `inviteDb.accept(token, userId)` → marks invite accepted, inserts `team_members` row → redirects to `#onboard`
   - If not authenticated → stores token in `sessionStorage('purplebee-invite-token')` → shows sign-up UI

3. **After sign-up** (`userStore.initSession`):
   - Detects `purplebee-invite-token` in `sessionStorage`
   - Calls `inviteDb.accept(token, userId)` → DB trigger also fires simultaneously (safe, idempotent)
   - Re-resolves team: `authDb.getTeamForUser()` to get the inviter's team_id (not a new auto-created one)
   - Redirects to `#onboard`

4. **Onboarding** (InviteOnboardPage.tsx):
   - Step 1: Set password (`authDb.updatePassword()` → `supabase.auth.updateUser({ password })`)
   - Step 2: Choose mock data (default OFF for invitees) + tooltips (default ON)
   - On submit: `setKeepMockData()`, `setShowTips()` persisted to `localStorage`
   - Redirects to `#dashboard`

### Task Assignment to Invited Team Members (DB)
When tasks are assigned to real Supabase users (UUIDs, not `user-1` demo IDs):
- `taskStore.addTask` stamps `team_id` from `currentTeamId` and `created_by` from `user.id`
- Tasks are fetched team-scoped: all members under the same `team_id` see the shared backlog
- `assigned_to` references `profiles.id` (UUID) so assignments survive re-login
- `taskDb.fetchAll(userId, mockMode, teamId)` prefers team scope — every invite-accepted member sees the full project backlog, not just their own tasks

### Accent Color Theming
- CSS custom properties `--accent-50` through `--accent-900` in `index.css`
- `data-accent` attribute on `<html>` activates color overrides
- 6 palettes: purple (default), blue, green, amber, red, pink
- `accentColorMap` in settingsStore maps each to hex/label/tw values

### Team Page Data Sources
The Team page (`Team.tsx`) uses different data sources depending on mode:
- **Mock ON** → `chatStore.teamMembers` (demo users) + hardcoded `mockExtendedData` (title, department, email for `user-1` through `user-5`)
- **Mock OFF** → `userStore.assignableMembers` (real DB profiles with title, department, email from `profiles` table), merged with `chatStore.teamMembers` for online status and chat DM functionality

The **project assignment dropdown** always uses `userStore.assignableMembers`, which loads from DB in real mode (showing real team members) and falls back to hardcoded `teamProfiles` in demo mode.

### Roles & Permissions
- Roles: `admin`, `manager`, `user`
- `canViewAllTasks()` — admin/manager see all; users see only their tasks
- `canInviteMembers()` — admin only
- `canManageTeam()` — admin + manager
- `viewAs` system lets admins preview dashboards as other team members

---

## 5. Routing

`App.tsx` handles routes via `window.location.hash`:

| Hash | Component | Notes |
|------|-----------|-------|
| `#dashboard` | Dashboard | Default |
| `#onboard?from=settings` | InviteOnboardPage | `skipPassword=true` — preferences only, no password step |
| `#projects` | Projects | |
| `#tasks` | Tasks | |
| `#calendar` | CalendarPage | |
| `#analytics` | Analytics | |
| `#team` | Team | |
| `#chat` | Chat | |
| `#ai-insights` | AIInsights | |
| `#settings` | SettingsPage | |
| `#onboard` | InviteOnboardPage | Fullscreen, no sidebar — shown when authenticated |
| `?invite_token=xxx` | InviteAcceptPage | Query param (from Supabase magic link redirect) |
| `#invite?token=xxx` | InviteAcceptPage | Hash param (from manually shared link) |

> **Why query param for magic link?** Supabase strips hash fragments on redirect. The invite token must be a query param.

---

## 6. DataService API (`src/lib/dataService.ts`)

| Export | Key Methods |
|--------|-------------|
| `taskDb` | `fetchAll(userId, mockMode, teamId?)`, `insert`, `update`, `delete`, `bulkInsert`, `deleteAllForUser` |
| `projectDb` | `fetchAll(userId, mockMode, teamId?)`, `insert`, `insertWithTasks`, `update`, `delete`, `insertTask`, `updateTask`, `deleteTask`, `deleteAllForUser` |
| `notificationDb` | `fetchAll`, `insert`, `markRead`, `deleteAllForUser` |
| `chatDb` | `fetchConversations`, `fetchMessages`, `sendMessage`, `createConversation`, `toggleReaction`, `markRead` |
| `settingsDb` | `fetch(userId)`, `upsert(userId, settings)` |
| `authDb` | `signIn`, `signUp`, `updatePassword`, `signOut`, `getSession`, `getProfile`, `getTeamForUser`, `getOrCreateTeam`, `sendMagicLinkInvite` |
| `inviteDb` | `create(teamId, invitedBy, role, email?)`, `getByToken`, `listForTeam`, `revoke`, `accept` |

**Gate function:**
```ts
const shouldPersist = (mockMode?: boolean): boolean => {
  if (mockMode === true) return false;  // mock ON → in-memory only
  return isDbConnected();               // mock OFF + DB connected → write to Supabase
};
```

---

## 7. Supabase Schema (Key Tables)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `profiles` | User accounts | `id`, `name`, `email`, `role`, `avatar_url` |
| `teams` | Companies/workspaces | `id`, `name`, `created_by` |
| `team_members` | User↔Team relationship | `team_id`, `user_id`, `role` |
| `tasks` | Task backlog | `id`, `title`, `status`, `assigned_to`, `team_id`, `project_id`, `created_by` |
| `projects` | Project portfolio | `id`, `name`, `status`, `team_id`, `created_by` |
| `project_tasks` | Tasks within a project | `id`, `project_id`, `title`, `assigned_to`, `linked_task_id` |
| `invites` | Pending invites | `id`, `token` (UUID PK), `team_id`, `invited_by`, `role`, `email`, `status`, `expires_at` |
| `conversations` | Chat rooms | `id`, `type`, `team_id` |
| `messages` | Chat messages | `id`, `conversation_id`, `sender_id`, `text` |
| `notifications` | In-app inbox | `id`, `user_id`, `type`, `title`, `message`, `read` |

**RLS notes:**
- `team_members` policy uses `is_admin_or_manager()` (`SECURITY DEFINER`) — avoid subqueries on the same table (infinite recursion).
- `handle_new_user()` trigger runs `SECURITY DEFINER` to bypass RLS for profile + team creation on signup.
- `invites` accept logic: trigger fires on insert to `auth.users` and checks `invites.email` — safe to call `inviteDb.accept` simultaneously (idempotent).

---

## 8. Environment Variables

```env
VITE_SUPABASE_URL=https://sudkymxnzuiubnszpxbc.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

When missing, `isDbConnected()` returns `false` → app runs in offline/demo mode (mock data only).

---

## 9. Git & Deployment

| Branch | Purpose |
|--------|---------|
| `main` | Production (not yet live) |
| `staging` | Active development, auto-deploys to Render |
| `feature/*` | Feature branches |

- **Current working branch:** `staging`
- **PR:** #6 (staging → main)
- **Deploy:** Render static site, auto-deploys on push to `staging`
- **Git identity:** No global config — always pass via flags:

```bash
git -c user.name="Sapho Maqhwazima" -c user.email="sapho@xspark.co.za" commit -m "..."
GITHUB_TOKEN=<token> git push origin staging
```

---

## 10. Path Aliases

```
@/*           → src/*
@components/* → src/components/*
@pages/*      → src/pages/*
@stores/*     → src/stores/*
@hooks/*      → src/hooks/*
```

---

## 11. Common Commands

```bash
# Dev server
npx vite --host --port 5173

# Type check (no emit)
npx tsc --noEmit

# Build for production
npx vite build

# Push to staging (triggers Render deploy)
GITHUB_TOKEN=<token> git push origin staging
```

---

## 12. Known Quirks & Gotchas

1. **Circular dep prevention:** Stores that need `userStore` data at call-time (not module init) use a lazy `require('@stores/userStore')` inside the action body.
2. **team_id on tasks:** All team-scoped hydration now waits for `currentTeamId` (via `hydrateWithTeam`). Legacy tasks without `team_id` are still found via `assigned_to`/`created_by` fallback.
3. **Mock task assignment:** Mock tasks use IDs `user-1` to `user-5`. Real Supabase users have UUIDs. `restoreMockData(userId)` handles the mapping.
4. **Supabase magic link redirects:** Hash fragments are stripped by Supabase. Invite tokens must travel as `?invite_token=xxx` query params (not `#invite?token=`).
5. **`localStorage` keys:** `purplebee-settings`, `purplebee-sidebar-collapsed`, `purplebee-notif-prefs`, `purplebee-projects`.
6. **No global git config** on this machine — always use `-c` flags.
7. **RLS infinite recursion:** Never write a policy on table X that subqueries table X. Use a `SECURITY DEFINER` helper function instead.
8. **Supabase MCP** available for direct DB queries during development.

---

## 13. Recent Changes (Latest First)

| Description |
|-------------|
| Fix race condition — two-phase hydration (hydrateStores + hydrateWithTeam) prevents duplicate seeding and RLS failures |
| Fix messaging and notifications not working when mock data OFF — chatStore always initializes user context + real team members |
| Fix modals not closing — wrap handleCreate/deleteProject in try/finally so onClose always runs |
| Fix delete modal showing blank project name — capture name at click time, not render time |
| Always persist projects to Supabase for real authenticated users — `isMockMode()` now returns false for non-Quick-Login users |
| Sanitise `assigned_to` in `toDbProjectTask` — mock IDs like `user-1` replaced with null to avoid FK violations |
| Fix projects disappearing on refresh — race condition in `hydrateStores` (clearMockData wiped state before async hydrateFromDb resolved) |
| Fix seed project IDs not being valid UUIDs — generate proper UUIDs via uuidv4() when seeding to Supabase |
| Seed demo projects to DB for new real-mode users when hydrateFromDb returns 0 rows |
| Add delete button on project cards (hover trash icon) with confirmation modal |
| Persist projects to localStorage — survives page refresh in both mock and real modes |
| Fix email confirmation redirect pointing to localhost — added `emailRedirectTo: window.location.origin` |
| Sidebar collapse/expand on desktop (icon-only mode) — persisted to localStorage |
| Accent color theming (6 palettes) — CSS custom properties + `data-accent` attribute |
| Modern dashboard layout option — gradient hero cards, donut chart, weekly activity bars |
| Demo-to-real auth modal in Settings — intercepts mock toggle OFF for Quick Login users, prompts sign-in or register, routes new users to onboarding (`skipPassword=true`) |
| `isQuickLoginUser()` helper on userStore — detects demo session (IDs `user-1` to `user-5`) |
| `InviteOnboardPage` now accepts `skipPassword` prop — skips password step when user already set one during sign-up |
| Persist notifications to DB (`notificationStore.addNotification`, `markAsRead`, `hydrateFromDb`) |
| Persist projects + project_tasks to DB (`projectStore` fully wired to `projectDb`) |
| Team-scope task fetching — all team members see the shared backlog when mock OFF |
| Add `currentTeamId` / `ensureTeam()` to `userStore` — every DB write attaches company `team_id` |
| Add `projectDb.insertWithTasks`, `insertTask`, `updateTask`, `deleteTask` to `dataService` |
| Invite onboarding flow (InviteOnboardPage) — set password, mock data choice, tooltips choice |
| InviteAcceptPage — handles magic link + manual link, auto-accept when authenticated |
| Team invite flow — dynamic link, Supabase OTP email, DB-backed `invites` table |
| Auto-team creation (`getOrCreateTeam`) — no "No team found" error on first invite |
| Fix RLS infinite recursion on `team_members` and `teams` policies |
| Fix mock data reappearing on refresh / after toggle OFF |
| Fix mock data not showing for real Supabase users on first login |

---

## 14. Open Items / TODO

- [ ] Supabase dashboard: set Site URL to `https://purplebee-staging.onrender.com` in Auth > URL Configuration (and add to Redirect URLs allowlist)
- [ ] Real-time subscriptions for tasks/chat (Supabase Realtime)
- [ ] File uploads / attachment storage (Supabase Storage bucket)
- [ ] `taskStore` team-member list — load real DB members (not hardcoded `teamProfiles`) when mock OFF
- [ ] `Projects.tsx` — assignee dropdown should show real team members from DB when mock OFF
- [ ] Notification fan-out: when a task is assigned to a teammate, write notification for *their* `user_id` (currently only writes to the creator's inbox)
- [ ] Production deploy to `main` branch
- [ ] Supabase Row Level Security audit — ensure all tables are properly locked down
