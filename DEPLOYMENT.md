# PurpleBee - Deployment Guide

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/SaphoM/PurpleBee.git
cd PurpleBee
npm install
```

### Environment Variables (Optional)

Create `.env` from the example:
```bash
cp .env.example .env
```

Add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these, the app runs in demo mode with mock data.

### Run Development Server

```bash
npm run dev
# Opens at http://localhost:5173
```

### Type Check

```bash
npx tsc --noEmit
```

### Production Build

```bash
npm run build
# Output in dist/
```

---

## Staging Deployment (Render)

PurpleBee staging is deployed as a **Render Static Site** that auto-deploys from the `staging` branch.

### Render Configuration
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Branch:** `staging`
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Deploy Process

```bash
# Push to staging triggers auto-deploy
git push origin staging
```

**Staging URL:** https://purplebee-staging.onrender.com

---

## Production Deployment

### Option 1: Render
Same setup as staging but pointing to `main` branch.

### Option 2: Vercel
```bash
npm i -g vercel
vercel --prod
```

### Option 3: Netlify
```bash
npm run build
# Deploy dist/ folder via Netlify CLI or dashboard
```

### Option 4: Any Static Host
The build output (`dist/`) is a static SPA. Deploy to any static file host (S3 + CloudFront, GitHub Pages, etc.). Ensure all routes serve `index.html` (SPA fallback).

---

## Supabase Configuration

### Required Settings (Auth > URL Configuration)
- **Site URL:** `https://your-production-url.com`
- **Redirect URLs:** Add both staging and production URLs

### Database
All tables are created via Supabase migrations. Key tables: `profiles`, `teams`, `team_members`, `tasks`, `projects`, `project_tasks`, `invites`, `conversations`, `messages`, `notifications`.

### Row Level Security
All tables have RLS enabled with team-scoped policies. The `handle_new_user()` trigger auto-creates profiles and accepts pending invites on signup.

---

## Git Workflow

| Branch | Purpose |
|--------|---------|
| `main` | Production |
| `staging` | Active development, auto-deploys to Render |

```bash
# Commit (no global git config on dev machine)
git -c user.name="Sapho Maqhwazima" -c user.email="sapho@xspark.co.za" commit -m "message"

# Push to staging
GITHUB_TOKEN=<token> git push origin staging
```
