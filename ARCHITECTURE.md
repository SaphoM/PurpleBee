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

The `isMockMode()` function determines whether DB writes happen:
- **Quick Login users** (`user-1` to `user-5`): follows `keepMockData` setting — DB never touched when ON
- **Real Supabase users**: always returns `false` — DB writes always happen regardless of toggle
- `toDbProjectTask` sanitises mock `assigned_to` values to `null` to avoid FK violations

### Hydration Flow

`hydrateStores()` in `userStore.ts` runs after every login:

1. **Mock ON** → `restoreMockData()` on all stores (in-memory only)
2. **Mock OFF** → `hydrateFromDb(userId)` on all stores (async, DB fetch)
   - No `clearMockData()` before hydration to avoid race condition flash
   - If DB returns 0 projects, seeds demo projects with proper UUIDs

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

**PurpleBee Architecture** | Last updated June 2026
