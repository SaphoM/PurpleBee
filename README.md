# TaskFlow - AI-Powered Productivity Dashboard

A modern, enterprise-grade productivity management platform with advanced task management, real-time collaboration, AI insights, and multi-channel notifications.

![TaskFlow Dashboard](./docs/dashboard-preview.png)

## ✨ Features

### Core Functionality
- **Smart Task Management**
  - Multi-level priority system (Low, Medium, High, Urgent)
  - Status tracking (To Do, In Progress, Review, Completed)
  - Progress visualization (0-100%)
  - Time estimation and tracking
  - Recurring tasks with customizable patterns
  - Subtasks and file attachments

- **Flexible Views**
  - Kanban board with drag-and-drop
  - List view with advanced filtering
  - Calendar view for deadline planning
  - Timeline view for project visualization

- **Productivity Analytics**
  - Completion trends and metrics
  - Productivity score calculation
  - Focus session tracking
  - Team performance analytics
  - Custom report generation

- **AI-Powered Features**
  - Smart task prioritization
  - Automated deadline suggestions
  - Productivity insights and recommendations
  - Task forecasting
  - Anomaly detection for overdue items

- **Real-Time Collaboration**
  - Instant updates via WebSocket
  - Presence indicators
  - Team collaboration
  - Activity feeds
  - Notification system

- **Smart Integrations**
  - **WhatsApp** - Task reminders, notifications, approval workflows
  - **Telegram** - Push notifications, commands, status updates
  - Calendar sync
  - Email notifications
  - Custom webhook support

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/productivity-dashboard.git
cd productivity-dashboard
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd backend
npm install
cd ..
```

4. **Setup environment variables**

Create `.env` file in root:
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WHATSAPP_PHONE_ID=your_phone_id
REACT_APP_TELEGRAM_BOT_TOKEN=your_bot_token
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
JWT_SECRET=your_secret_key_here
WHATSAPP_TOKEN=your_whatsapp_token
TELEGRAM_BOT_TOKEN=your_telegram_token
NODE_ENV=development
PORT=3000
```

5. **Setup database**
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db push
cd ..
```

6. **Start development servers**

Frontend:
```bash
npm run dev
```

Backend (in another terminal):
```bash
cd backend
npm run dev
```

Visit `http://localhost:5173` (or your Vite port)

## 📁 Project Structure

```
productivity-dashboard/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components
│   ├── stores/             # Zustand state management
│   ├── services/           # API clients
│   ├── integrations/       # Third-party integrations
│   ├── types/              # TypeScript types
│   ├── hooks/              # Custom hooks
│   └── utils/              # Utility functions
│
├── backend/
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   └── index.ts        # Server entry point
│   └── package.json
│
├── prisma/
│   └── schema.prisma       # Database schema
│
└── docs/
    └── ARCHITECTURE.md     # Architecture documentation
```

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **Recharts** - Data visualization
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library
- **Vite** - Lightning-fast build tool

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Relational database
- **Prisma ORM** - Type-safe database client
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **Redis** - Caching and sessions

## 📚 Documentation

- [Architecture Guide](./ARCHITECTURE.md) - System design and data flow
- [API Reference](./docs/API.md) - Complete API documentation
- [Integration Guides](./docs/INTEGRATIONS.md) - WhatsApp & Telegram setup
- [Database Schema](./prisma/schema.prisma) - Data models

## 🔧 Configuration

### WhatsApp Integration

1. Create Meta Business Account
2. Configure WhatsApp Business API
3. Get Phone Number ID and Access Token
4. Add to environment variables:
   ```env
   REACT_APP_WHATSAPP_PHONE_ID=your_phone_id
   WHATSAPP_TOKEN=your_access_token
   ```

### Telegram Integration

1. Create bot via @BotFather on Telegram
2. Get bot token
3. Configure webhook URL
4. Add to environment variables:
   ```env
   REACT_APP_TELEGRAM_BOT_TOKEN=your_bot_token
   REACT_APP_TELEGRAM_BOT_USERNAME=your_bot_username
   ```

## 🎨 Features Demo

### Dashboard Overview
- Real-time metrics cards
- Completion trends chart
- Priority distribution pie chart
- Focus sessions bar chart
- AI insights panel
- Upcoming deadlines widget

### Task Management
- Create, read, update, delete tasks
- Assign tasks to team members
- Set priorities and deadlines
- Add subtasks and attachments
- Track progress with percentage
- Add tags for organization

### Kanban Board
- Drag-and-drop tasks between columns
- 4 status columns (To Do, In Progress, Review, Completed)
- Quick task creation
- Inline task preview
- Filter by priority, assignee, tags
- Responsive on mobile

### Analytics
- Weekly/Monthly productivity trends
- Task completion rate
- Average completion time
- Team velocity metrics
- Custom date range selection
- Export reports to PDF/CSV

## 🔐 Security

- JWT-based authentication
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention (Prisma ORM)
- XSS protection
- Secure password hashing
- Audit logging
- Environment-based secrets

## 🚢 Deployment

### Frontend
```bash
npm run build
# Deploy dist/ folder to:
# - Vercel (recommended)
# - Netlify
# - AWS S3 + CloudFront
# - GitHub Pages
```

### Backend
```bash
cd backend
npm run build
# Deploy to:
# - Heroku
# - Railway
# - AWS EC2
# - DigitalOcean
# - Fly.io
```

### Database
- AWS RDS PostgreSQL
- Supabase
- Railway Database
- DigitalOcean Managed Database

## 📊 Performance

- **Frontend Bundle**: ~150KB (gzipped)
- **API Response Time**: <200ms
- **Database Queries**: Optimized with indexes
- **Real-time Updates**: WebSocket connection
- **Caching**: Redis for analytics and expensive queries

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

## 💬 Support

For support, email support@taskflow.app or open an issue on GitHub.

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced AI features (GPT-4 integration)
- [ ] Video conferencing
- [ ] Advanced reporting
- [ ] Workflow automation
- [ ] Custom integrations API
- [ ] Multi-language support
- [ ] Dark/Light theme switcher
- [ ] More payment integrations
- [ ] Enterprise SSO

## 👥 Team

- **Lead Developer** - Sapho Maqhwazima (@sapho)

## 🙏 Acknowledgments

- Inspired by Linear, Notion, Monday.com, and ClickUp
- Built with modern web technologies
- Community feedback and contributions

---

**Made with ❤️ for productive teams**
