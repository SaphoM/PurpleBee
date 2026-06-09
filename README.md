# PurpleBee - AI-Powered Productivity Dashboard

A modern, enterprise-grade productivity management platform with advanced task management, project tracking, team chat, AI insights, and multi-channel notifications.

**Live staging:** https://purplebee-staging.onrender.com
**Repo:** https://github.com/SaphoM/PurpleBee

## Features

### Task Management
- Multi-level priorities (Low, Medium, High, Urgent)
- Status tracking (To Do, In Progress, Review, Completed)
- Progress visualization (0-100%)
- Recurring tasks with customizable patterns
- Subtasks and file attachments
- Time estimation and tracking
- Task assignment to team members
- `createdBy` stamped on every new task; hydrated from `created_by` DB column on load

### Multiple View Modes
- **Kanban Board** - Drag-and-drop task management
- **List View** - Traditional task list with filtering
- **Calendar View** - Deadline visualization
- **Timeline View** - Project timeline

### Project Management
- Project templates (Web App, Mobile, Marketing, API, Design System, Training, Services, Custom)
- Project task breakdown with suggested tasks per template
- Team member assignment per project task — triggers instant `task-assigned` notification to the assignee (live mode)
- Project status tracking (Planning, Active, On Hold, Completed)
- **Edit projects** — Admin/Manager can update name, description, and status inline via edit modal
- Delete projects with confirmation modal
- Projects persist to Supabase for real users

### Team Collaboration
- Team invite system (magic link email + shareable URL)
- Role-based access control (Admin, Manager, User)
- **Edit team members** — Admin/Manager can update name, job title, department, and role; persists to `profiles` + `team_members` in live mode
- In-app team chat with docked chat windows
- Admin "View As" to preview other members' dashboards
- Smart notifications (assignments, due dates, mentions, AI insights)
- Chat messages trigger `mention` notifications to all other conversation participants (live mode)
- Task completion triggers `task-completed` notification to the task creator (live mode)

### Global Search
- TopBar search bar filters content across every page in real-time
- **Tasks page** — Kanban columns filter cards by title, description, and tags
- **Projects page** — project grid filters by name, description, status, and template type; inline page search bar is synced with the TopBar
- **Team page** — member cards filter by name, title, department, and email
- Clicking a dropdown result navigates to the matching page and pre-filters to that result
- Shared via `globalSearchQuery` in `uiStore` — single source of truth, no prop drilling

### Notifications (Live Mode)
All notifications are written directly to Supabase via `notificationDb.insert` and delivered in real-time to the recipient's bell via Supabase Realtime (`postgres_changes` on the `notifications` table filtered by `user_id`). Mock mode uses in-memory notifications only.

| Trigger | Type | Recipient |
|---|---|---|
| Project task assigned | `task-assigned` | Assignee |
| Kanban task assigned | `task-assigned` | Assignee |
| Kanban task completed | `task-completed` | Task creator |
| Chat message sent (DM or channel) | `mention` | All other participants |

### Sample Data Toggle
- **ON** — all stores use in-memory mock data; DB is never read or written
- **OFF** — all stores hydrate from Supabase on login; mock data is cleared
- Toggling OFF calls `clearMockData` + `hydrateFromDb` on all stores
- DB tables start empty for new accounts — no auto-seeding in live mode

### Analytics & AI Insights
- Completion trends and productivity score
- Priority distribution analysis
- Focus session tracking
- AI-generated recommendations
- Team performance metrics

### Customization
- 6 accent color themes (Purple, Blue, Green, Amber, Red, Pink)
- Dark/Light mode
- Classic and Modern dashboard layouts
- Collapsible sidebar (icon-only mode)
- Configurable tooltip system

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 4 |
| Styling | Tailwind CSS + CSS custom properties (accent theming) |
| State | Zustand 4 (7 stores) |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Auth & DB | Supabase (Auth + Postgres + RLS) |
| Realtime | Supabase Realtime (`postgres_changes`) |
| Hosting | Render (static site, staging branch auto-deploys) |
| Utilities | clsx, uuid, date-fns |

## Store Architecture

| Store | Responsibility |
|---|---|
| `userStore` | Auth, session, team resolution, store hydration orchestration, `updateMember` |
| `taskStore` | Kanban tasks, notifications on assign/complete, `createdBy` stamping |
| `projectStore` | Projects + project tasks, assignment notifications |
| `chatStore` | Conversations, messages, chat message notifications |
| `notificationStore` | Notification inbox, Realtime subscription, preferences |
| `settingsStore` | App settings, sample data toggle, accent colour |
| `uiStore` | Sidebar state, dark mode, view mode, `globalSearchQuery` (cross-page search) |

### Context injection (no circular deps)
`userStore` injects `userId`/`teamId`/`userName` into `taskStore` and `projectStore` via exported setter functions (`setTaskUserContext`, `setProjectUserContext`) — avoids the `require()` pattern which is not available in Vite's ESM browser runtime.

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/SaphoM/PurpleBee.git
cd PurpleBee

# Install dependencies
npm install

# Setup environment (optional - app runs in demo mode without Supabase)
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# Start development server
npm run dev
# Opens at http://localhost:5173
```

### Demo Mode
Without Supabase credentials, the app runs fully in demo mode with mock data. Use the Quick Login screen to pick a role (Admin, Manager, Team Member) and explore all features.

### Production Build
```bash
npm run build
# Output in dist/ — deploy to any static host
```

## Project Structure

```
src/
├── components/       # Reusable UI (Sidebar, TopBar, KanbanBoard, ChatBot, etc.)
├── pages/            # Page components (Dashboard, Tasks, Projects, Chat, etc.)
├── stores/           # Zustand state management (7 stores)
├── lib/              # Supabase client + data service layer
├── types/            # Shared TypeScript types
├── App.tsx           # Root layout + hash routing
├── index.css         # Tailwind base + accent color variables
└── main.tsx          # Entry point
```

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

When missing, the app runs in offline demo mode with mock data.

## Supabase RLS Policies (key)

| Table | Policy | Rule |
|---|---|---|
| `notifications` | INSERT | `WITH CHECK: true` — any authenticated user can insert for any `user_id` (enables cross-user notifications) |
| `notifications` | SELECT | `user_id = auth.uid()` — users see only their own notifications |
| `tasks` | SELECT/INSERT/UPDATE/DELETE | scoped to `team_id` or `created_by` |
| `projects` | SELECT/INSERT/UPDATE/DELETE | scoped to `team_id` or `created_by` |
| `profiles` | UPDATE | `id = auth.uid()` — users update own profile; admins update any via service role |
| `team_members` | UPDATE | scoped to `team_id` membership — role changes sync via `authDb.updateProfile` |
| `teams` | SELECT | `id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())` |

## Deployment

- **Staging:** Auto-deploys from `staging` branch to Render
- **Production:** Deploy `main` branch to any static hosting (Render, Vercel, Netlify)

## Security

- Supabase Auth (email/password + magic links)
- Row Level Security (RLS) on all tables
- Role-based access control (Admin, Manager, User)
- Team-scoped data isolation
- Input validation and XSS protection

## Team

- **Lead Developer** - Sapho Maqhwazima (@SaphoM)

---

**Made with care for productive teams**
