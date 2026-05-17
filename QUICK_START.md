# TaskFlow - Quick Start Guide (5 Minutes)

## 🚀 Fastest Way to Get Running

### Option 1: Automated Setup (Recommended)

#### On Mac/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

#### On Windows:
```bash
setup.bat
```

This will:
✅ Check prerequisites (Node.js, npm, PostgreSQL)
✅ Create environment files
✅ Install all dependencies
✅ Create database
✅ Run migrations
✅ Show you what to do next

---

### Option 2: Manual Setup (If automated fails)

#### Step 1: Prerequisites (2 minutes)
Make sure you have:
- Node.js 16+ ([download](https://nodejs.org/))
- npm 8+ (comes with Node.js)
- PostgreSQL 12+ ([download](https://www.postgresql.org/download/))

Verify:
```bash
node --version
npm --version
psql --version
```

#### Step 2: Environment Setup (1 minute)
```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit backend/.env:
# Change this line:
# DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
# Replace 'user' and 'password' with your PostgreSQL credentials
```

#### Step 3: Create Database (1 minute)
```bash
# Create the database
createdb taskflow

# Or if you need to specify user:
createdb -U postgres taskflow
```

#### Step 4: Install Dependencies (2 minutes)
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

#### Step 5: Database Migrations (1 minute)
```bash
cd backend
npx prisma migrate dev --name init
cd ..
```

---

## ▶️ Running the Application

### Terminal 1 - Start Frontend:
```bash
npm run dev
```

You'll see:
```
  VITE v4.5.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ Frontend running at **http://localhost:5173**

### Terminal 2 - Start Backend:
```bash
cd backend
npm run dev
```

You'll see:
```
✅ Database connected
✅ Server running on port 3000
📊 API: http://localhost:3000/api
```

✅ Backend running at **http://localhost:3000**

---

## 🎉 You're Done!

### Access the Application:
Open your browser and go to:
```
http://localhost:5173
```

### What You Can Do:
✅ Create tasks
✅ Drag tasks in Kanban board
✅ View dashboard
✅ Check analytics
✅ Manage priorities

---

## ❌ Troubleshooting

### "Port 3000 already in use"
Change port in `backend/.env`:
```env
PORT=3001
```

### "Database connection error"
Check your `backend/.env`:
```env
# Should look like:
DATABASE_URL=postgresql://postgres:password@localhost:5432/taskflow
```

Test connection:
```bash
psql postgresql://postgres:password@localhost:5432/taskflow
```

### "npm: command not found"
Reinstall Node.js from https://nodejs.org/

### "psql: command not found"
PostgreSQL not in PATH. Either:
1. Reinstall PostgreSQL
2. Add PostgreSQL to PATH
3. Use full path: `/usr/local/bin/psql` (Mac)

### "Module not found errors"
Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install

cd backend
rm -rf node_modules package-lock.json
npm install
cd ..
```

---

## 📝 Next Steps

### After Getting Running:

1. **Explore the Dashboard**
   - Create a few tasks
   - Try dragging in Kanban board
   - Check the metrics

2. **Read Documentation**
   - `SETUP_GUIDE.md` - Detailed setup
   - `ARCHITECTURE.md` - How it works
   - `README.md` - Features overview

3. **Customize**
   - Edit colors in `tailwind.config.js`
   - Add your logo
   - Setup integrations

4. **Deploy**
   - Follow `DEPLOYMENT.md` for production setup
   - Choose Vercel (frontend), Railway (backend)

---

## 🔧 Useful Commands

### Development
```bash
# Frontend dev server
npm run dev

# Frontend build
npm run build

# Backend dev server
cd backend && npm run dev

# Database UI
cd backend && npx prisma studio

# Check API health
curl http://localhost:3000/api/health
```

### Database
```bash
# Reset database
cd backend
npx prisma migrate reset

# View database
cd backend
npx prisma studio
```

### Cleanup
```bash
# Remove all node_modules
rm -rf node_modules backend/node_modules

# Clear npm cache
npm cache clean --force
```

---

## 📞 Getting Help

If something doesn't work:

1. **Read the error message** - Usually tells you what's wrong
2. **Check SETUP_GUIDE.md** - More detailed instructions
3. **Check prerequisites** - Make sure you have Node, npm, PostgreSQL
4. **Reinstall dependencies** - Sometimes fixes mysterious issues

---

## ✅ Verification Checklist

After running dev, verify:
- [ ] Frontend loads at http://localhost:5173
- [ ] Backend responds at http://localhost:3000/api/health
- [ ] Can create a task
- [ ] Dashboard shows metrics
- [ ] Can drag tasks in Kanban
- [ ] No console errors
- [ ] Database connected

---

## 🎯 What's Running

| Service | Port | URL | Started By |
|---------|------|-----|-----------|
| Frontend | 5173 | http://localhost:5173 | `npm run dev` |
| Backend API | 3000 | http://localhost:3000 | `cd backend && npm run dev` |
| Database | 5432 | localhost:5432 | PostgreSQL |
| Prisma Studio | 5555 | http://localhost:5555 | `npx prisma studio` |

---

## 💡 Pro Tips

- **Use two terminals** - One for frontend, one for backend
- **Hot reload works** - Edit code and changes appear instantly
- **Database UI** - Run `npx prisma studio` to explore data
- **API docs** - All endpoints documented in `ARCHITECTURE.md`
- **Mock data** - Sample tasks pre-loaded in database

---

## 🚢 Ready to Deploy?

Once you're happy with your setup:

1. **Read DEPLOYMENT.md**
2. **Choose your platform:**
   - Frontend: Vercel (easiest)
   - Backend: Railway (easiest)
   - Database: Supabase or AWS RDS

3. **Deploy in 10 minutes**

---

## 🎓 Learning Resources

Inside the project:
- Well-commented code
- TypeScript types everywhere
- Architecture documentation
- API endpoints documented

Online:
- React Docs: https://react.dev
- TypeScript: https://www.typescriptlang.org
- Tailwind: https://tailwindcss.com
- Prisma: https://www.prisma.io
- Express: https://expressjs.com

---

## 🎉 You're All Set!

You now have a production-ready productivity dashboard running locally!

**Happy coding!** 🚀

---

**Need help?** Check the docs or open an issue on GitHub.  
**Ready to customize?** Edit the code - it's well-organized and documented.  
**Ready to deploy?** Follow DEPLOYMENT.md.
