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

### Multiple View Modes
- **Kanban Board** - Drag-and-drop task management
- **List View** - Traditional task list with filtering
- **Calendar View** - Deadline visualization
- **Timeline View** - Project timeline

### Project Management
- Project templates (Web App, Mobile, Marketing, API, Design System, Training, Services, Custom)
- Project task breakdown with suggested tasks per template
- Team member assignment per project task
- Project status tracking (Planning, Active, On Hold, Completed)
- Delete projects with confirmation modal
- Projects persist to Supabase for real users

### Team Collaboration
- Team invite system (magic link email + shareable URL)
- Role-based access control (Admin, Manager, User)
- In-app team chat with docked chat windows
- Admin "View As" to preview other members' dashboards
- Smart notifications (assignments, due dates, mentions, AI insights)
- Project task assignment triggers instant `task-assigned` notification to the assignee (live mode)

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
| Hosting | Render (static site, staging branch auto-deploys) |
| Utilities | clsx, uuid, date-fns |

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
