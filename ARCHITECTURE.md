# PurpleBee - Architecture Documentation

## Overview

PurpleBee is a single-page React application with Supabase as the backend (Auth + Postgres + Row Level Security). There is no custom backend server — the frontend communicates directly with Supabase via the JS client.

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Tailwind CSS** - Utility-first styling + CSS custom properties for accent theming
- **Zustand 4** - Lightweight state management (7 stores)
- **Recharts 2** - Data visualization
- **Lucide React** - Icon library
- **Vite 4** - Build tool
- **clsx** - Conditional class names
- **uuid** - ID generation
- **date-fns** - Date utilities

### Backend (Supabase)
- **Supabase Auth** - Email/password + magic links
- **Supabase Postgres** - Database with Row Level Security
- **Supabase Realtime** - (Ready for real-time subscriptions)

## Architecture Diagram

```
User Browser
   │
   ├── React SPA (Vite)
   │     ├── Pages (11 route components)
   │     ├── Components (20+ reusable UI)
   │     └── Zustand Stores (7 stores)
   │           │
   │           ├── localStorage (cache/persistence)
   │           │
   │           └── dataService.ts (DB abstraction)
   │                 │
   │                 └── Supabase JS Client
   │                       │
   └───────────────────────┘
                            │
                     Supabase Cloud
                     ├── Auth (JWT sessions)
                     ├── Postgres (RLS-protected tables)
                     └── (Storage, Realtime — ready to add)
```

## State Management

### 7 Zustand Stores

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `taskStore` | Task CRUD, filtering, hydration | Supabase DB + localStorage (module init) |
| `projectStore` | Projects + project_tasks CRUD | Supabase DB + localStorage (`purplebee-projects`) |
| `chatStore` | Conversations, messages, team members | Supabase DB |
| `notificationStore` | Notifications, preferences, grouping | Supabase DB + localStorage (`purplebee-notif-prefs`) |
| `userStore` | Auth, session, roles, team context | Supabase Auth session |
| `settingsStore` | Accent color, layout, mock toggle, tips | localStorage (`purplebee-settings`) |
| `uiStore` | Dark mode, sidebar collapse | localStorage (`purplebee-sidebar-collapsed`) |

### Data Flow

```
User Action → Component → Zustand Store Action
  → 1. Update in-memory state (immediate UI update)
  → 2. Persist to localStorage (cache)
  → 3. Write to Supabase DB (fire-and-forget for real users)
```

### Mock vs Real Mode

`isMockMode()` = `useSettingsStore.getState().keepMockData` — a simple boolean, identical for all user types.

- **Mock ON** (default): DB reads and writes are skipped for all 4 data stores (task, project, chat, notification). Data lives in-memory only.
- **Mock OFF**: DB reads and writes are active. Stores hydrate from Supabase on login.
- `toDbProjectTask` sanitises mock `assigned_to` values (e.g. `user-1`) to `null` to avoid FK violations when seeds are written to DB.

### Assignable Members

All task and project assignment dropdowns use `userStore.assignableMembers`.

`loadAssignableMembers()` in `userStore.ts` checks `keepMockData` first:
- **Mock ON** → returns hardcoded `teamProfiles` (5 demo profiles: user-1 to user-5)
- **Mock OFF** → fetches accepted `team_members` + pending `invites` from Supabase, scoped to `currentTeamId`

`SettingsPage` calls `loadAssignableMembers()` in both toggle directions so dropdowns update immediately without a page reload.

### Hydration Flow

Two-phase hydration in `userStore.ts` runs after every login to avoid race conditions:

**Mock ON** → `restoreMockData()` on all 4 data stores (in-memory only, DB never touched).

**Mock OFF** → Two phases:
1. **Phase 1 (`hydrateStores`)** — hydrates `notificationStore` only (user-scoped, no team dependency)
2. **Phase 2 (`hydrateWithTeam`)** — runs AFTER `currentTeamId` resolves via `getOrCreateTeam`:
   - `taskStore.hydrateFromDb(userId)` — team-scoped task fetch, seeds 10 demo tasks if DB is empty
   - `chatStore.hydrateFromDb(userId)` — loads real team members, seeds General/Announcements if empty
   - `projectStore.hydrateFromDb(userId)` — project + project_tasks, seeds demo projects if empty

> **Why two phases?** Chat, tasks, and projects need `currentTeamId` for team-scoped RLS queries. Running `hydrateFromDb` before team resolves causes (a) RLS failures on seed inserts, (b) duplicate chat channels from concurrent calls.

## Routing

Hash-based routing via `App.tsx`:

| Hash | Component |
|------|-----------|
| `#dashboard` | Dashboard (default) |
| `#projects` | Projects |
| `#tasks` | Tasks |
| `#calendar` | CalendarPage |
| `#analytics` | Analytics |
| `#team` | Team |
| `#chat` | Chat |
| `#ai-insights` | AIInsights |
| `#settings` | SettingsPage |
| `#onboard` | InviteOnboardPage |
| `?invite_token=xxx` | InviteAcceptPage |
| `#invite?token=xxx` | InviteAcceptPage |

## Database Schema

### Key Tables (all RLS-enabled)

- **profiles** — User accounts, linked to `auth.users` via trigger
- **teams** — Workspaces/companies
- **team_members** — User-Team join table with role
- **tasks** — Task backlog, team-scoped
- **projects** — Project portfolio, team-scoped
- **project_tasks** — Tasks within a project (FK to projects, cascading delete)
- **invites** — Team invitations with token, expiry, status
- **conversations / messages** — Chat system
- **notifications** — In-app notification inbox

### RLS Patterns
- Team-scoped reads: `team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())`
- `is_admin_or_manager()` — `SECURITY DEFINER` helper to avoid recursive policy on team_members
- `handle_new_user()` trigger — `SECURITY DEFINER`, auto-creates profile + accepts pending invites on signup

## Accent Color Theming

CSS custom properties (`--accent-50` through `--accent-900`) defined in `index.css`:
- `data-accent` attribute on `<html>` activates color overrides
- 6 palettes: purple (default), blue, green, amber, red, pink
- Global `[data-accent]` CSS rules remap all `purple-*` Tailwind utilities to accent variables

## Security

- Supabase Auth with JWT sessions
- Row Level Security on every table
- Team-scoped data isolation
- Role-based permissions (admin, manager, user)
- `SECURITY DEFINER` functions for cross-table policy checks
- Input sanitisation (mock IDs stripped before DB writes)

## Deployment

- **Build:** `npx vite build` (outputs to `dist/`)
- **Type check:** `npx tsc --noEmit`
- **Staging:** Render static site, auto-deploys from `staging` branch
- **Production:** Deploy `main` branch

---

**PurpleBee Architecture** | Last updated June 2026 (isMockMode fix, two-phase hydration, assignableMembers)
