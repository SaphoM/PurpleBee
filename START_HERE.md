# PurpleBee - Start Here

Welcome! PurpleBee is a production-ready, AI-powered productivity dashboard for teams.

**Live staging:** https://purplebee-staging.onrender.com
**Repo:** https://github.com/SaphoM/PurpleBee

---

## Get Running (3 minutes)

```bash
git clone https://github.com/SaphoM/PurpleBee.git
cd PurpleBee
npm install
npm run dev
```

Open **http://localhost:5173** and use Quick Login to explore with demo data.

For real data persistence, add Supabase credentials to `.env` (see SETUP_GUIDE.md).

---

## What You'll See

- **Dashboard** - KPI cards, charts, productivity metrics
- **Tasks** - Kanban board with drag-and-drop
- **Projects** - Project cards with templates and task breakdown
- **Chat** - Team messaging with docked windows
- **Analytics** - Completion trends, priority distribution
- **AI Insights** - AI-generated recommendations
- **Settings** - Accent colors, dark mode, layout options

---

## Key Files

| File | Purpose |
|------|---------|
| `QUICK_START.md` | Minimal setup steps |
| `SETUP_GUIDE.md` | Detailed setup with explanations |
| `README.md` | Features overview |
| `ARCHITECTURE.md` | System design and data flow |
| `DEPLOYMENT.md` | Staging and production deploy |
| `CONTEXT.md` | Development context and recent changes |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript 5 + Vite 4 |
| Styling | Tailwind CSS + CSS custom properties |
| State | Zustand 4 (7 stores) |
| Charts | Recharts 2 |
| Auth & DB | Supabase (Auth + Postgres + RLS) |
| Hosting | Render (static site, auto-deploy) |

---

## Prerequisites

- **Node.js 18+** - https://nodejs.org/
- **npm** - comes with Node.js

Supabase is optional - the app runs in demo mode without it.

---

## Project Structure

```
src/
├── components/     # 20+ reusable UI components
├── pages/          # 11 page components
├── stores/         # 7 Zustand state stores
├── lib/            # Supabase client + data service
├── types/          # Shared TypeScript types
├── App.tsx         # Root layout + hash routing
├── index.css       # Tailwind + accent color variables
└── main.tsx        # Entry point
```

---

## Next Steps

1. Run the app locally
2. Explore features with Quick Login
3. Read `ARCHITECTURE.md` to understand the system
4. Connect Supabase for real data persistence
5. Deploy with `DEPLOYMENT.md`

---

**PurpleBee** | Built by Sapho Maqhwazima
