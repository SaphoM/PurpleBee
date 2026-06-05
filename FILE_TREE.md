# PurpleBee - File Tree

## Directory Structure

```
PurpleBee/
├── src/
│   ├── main.tsx                        # Entry point
│   ├── App.tsx                         # Root layout + hash routing
│   ├── index.css                       # Tailwind base + accent color CSS variables
│   │
│   ├── components/                     # Reusable UI (20+ files)
│   │   ├── Sidebar.tsx                 # Collapsible nav, accent-themed
│   │   ├── TopBar.tsx                  # Header, search, notifications
│   │   ├── ModernDashboard.tsx         # Alternative dashboard layout
│   │   ├── KanbanBoard.tsx             # Drag-and-drop task board
│   │   ├── ChatBot.tsx                 # AI assistant panel
│   │   ├── DockedChats.tsx             # Floating chat windows
│   │   ├── MemberTooltip.tsx           # Team member hover cards
│   │   └── ...                         # Card, Badge, Toast, Modal, etc.
│   │
│   ├── pages/                          # Page components (11 files)
│   │   ├── Dashboard.tsx               # KPI cards, charts, layout toggle
│   │   ├── Tasks.tsx                   # Task list/kanban with filters
│   │   ├── Projects.tsx                # Project cards, create/delete
│   │   ├── Chat.tsx                    # Team messaging
│   │   ├── Team.tsx                    # Member management + invites
│   │   ├── Analytics.tsx               # Charts and reports
│   │   ├── AIInsights.tsx              # AI recommendations
│   │   ├── CalendarPage.tsx            # Calendar view
│   │   ├── SettingsPage.tsx            # Settings (4 tabs)
│   │   ├── LoginPage.tsx               # Quick Login + email/password
│   │   ├── InviteAcceptPage.tsx        # Invite acceptance flow
│   │   └── InviteOnboardPage.tsx       # Post-invite onboarding
│   │
│   ├── stores/                         # Zustand state (7 files)
│   │   ├── taskStore.ts                # Tasks CRUD, DB hydration
│   │   ├── projectStore.ts             # Projects + project_tasks, localStorage + DB
│   │   ├── chatStore.ts                # Conversations, messages
│   │   ├── notificationStore.ts        # Notifications, preferences
│   │   ├── userStore.ts                # Auth, session, roles, team context
│   │   ├── settingsStore.ts            # Accent color, layout, mock toggle
│   │   └── uiStore.ts                  # Dark mode, sidebar collapse
│   │
│   ├── lib/                            # Data layer
│   │   ├── supabase.ts                 # Supabase client init
│   │   └── dataService.ts              # DB abstraction (taskDb, projectDb, etc.)
│   │
│   └── types/
│       └── index.ts                    # Shared TypeScript interfaces
│
├── public/                             # Static assets
│
├── package.json                        # Dependencies and scripts
├── tsconfig.json                       # TypeScript configuration
├── tailwind.config.js                  # Tailwind CSS config
├── vite.config.ts                      # Vite build config
├── .env.example                        # Environment variables template
│
├── README.md                           # Project overview
├── PROJECT_SUMMARY.md                  # Comprehensive summary
├── ARCHITECTURE.md                     # System design
├── DEPLOYMENT.md                       # Deploy guide
├── SETUP_GUIDE.md                      # Detailed setup
├── QUICK_START.md                      # Minimal setup
├── START_HERE.md                       # Entry point
├── FILE_TREE.md                        # This file
├── INDEX.md                            # File navigation
└── CONTEXT.md                          # Dev context and recent changes
```

---

## File Statistics

| Category | Count | Location |
|----------|-------|----------|
| React Components | 20+ | `src/components/` |
| Pages | 11 | `src/pages/` |
| Zustand Stores | 7 | `src/stores/` |
| Data Layer | 2 | `src/lib/` |
| Type Definitions | 1 | `src/types/` |
| Config Files | 4 | Root |
| Documentation | 10 | Root |

---

## Navigation by Feature

### Task Management
- `src/stores/taskStore.ts` - Task state and CRUD
- `src/components/KanbanBoard.tsx` - Kanban view
- `src/pages/Tasks.tsx` - Tasks page

### Project Management
- `src/stores/projectStore.ts` - Project state, localStorage + DB persistence
- `src/pages/Projects.tsx` - Project cards, create/delete with modals

### Team & Chat
- `src/stores/chatStore.ts` - Chat state
- `src/pages/Chat.tsx` - Team messaging
- `src/pages/Team.tsx` - Member management
- `src/components/DockedChats.tsx` - Floating chat windows

### Authentication
- `src/stores/userStore.ts` - Auth, session, hydration
- `src/pages/LoginPage.tsx` - Login UI
- `src/lib/supabase.ts` - Supabase client

### Theming & UI
- `src/index.css` - Accent color CSS variables (6 palettes)
- `src/stores/settingsStore.ts` - Accent, layout, mock toggle
- `src/stores/uiStore.ts` - Dark mode, sidebar

### Data Persistence
- `src/lib/dataService.ts` - DB abstraction layer
- `src/stores/projectStore.ts` - localStorage + Supabase persistence
- `src/stores/userStore.ts` - `hydrateStores()` orchestration

---

**PurpleBee** | Built by Sapho Maqhwazima
