# PurpleBee - Quick Start (3 Minutes)

## Prerequisites
- Node.js 18+ ([download](https://nodejs.org/))
- npm (comes with Node.js)

## Setup

```bash
git clone https://github.com/SaphoM/PurpleBee.git
cd PurpleBee
npm install
npm run dev
```

Open **http://localhost:5173**

Use **Quick Login** to pick a role (Admin, Manager, Team Member) and explore all features with demo data.

---

## Optional: Connect Supabase

For real data persistence:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server. Sign up with email/password for a real account.

---

## Useful Commands

```bash
# Development server
npm run dev

# Type check
npx tsc --noEmit

# Production build
npm run build

# Preview production build
npm run preview
```

---

## What You Can Do

- Create and manage tasks (Kanban, List, Calendar views)
- Create projects from 8 templates
- Invite team members via email or link
- Chat with your team
- View analytics and AI insights
- Customize theme (6 accent colors, dark/light mode)
- Switch between Classic and Modern dashboard layouts

---

## Troubleshooting

**Page won't load:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**TypeScript errors:**
```bash
npx tsc --noEmit
```

---

## Next Steps

- `SETUP_GUIDE.md` - Detailed setup with explanations
- `ARCHITECTURE.md` - How the system works
- `DEPLOYMENT.md` - Deploy to staging/production

---

**PurpleBee** | Built by Sapho Maqhwazima
