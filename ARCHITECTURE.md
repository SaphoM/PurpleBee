# Productivity Dashboard - Architecture Documentation

## Overview

A modern, AI-powered productivity dashboard application built with React, TypeScript, and Node.js. Designed for enterprise use with real-time collaboration, advanced analytics, and intelligent task management.

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **Recharts** - Data visualization
- **Framer Motion** - Animations
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime
- **Express.js** - REST API framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Prisma ORM** - Database access
- **Socket.IO** - Real-time communication
- **Redis** - Caching

### Integrations
- **Meta WhatsApp Cloud API** - Task reminders and notifications
- **Telegram Bot API** - Push notifications and commands
- **Firebase Auth** - Authentication (optional)

## Project Structure

```
productivity-dashboard/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── TaskCard.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── StatCard.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   │
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Tasks.tsx
│   │   ├── Calendar.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   │
│   ├── stores/              # Zustand state stores
│   │   ├── taskStore.ts
│   │   ├── uiStore.ts
│   │   ├── userStore.ts
│   │   └── notificationStore.ts
│   │
│   ├── services/            # API and business logic
│   │   ├── api.ts
│   │   └── mockService.ts
│   │
│   ├── integrations/        # Third-party integrations
│   │   ├── whatsapp.config.ts
│   │   └── telegram.config.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   │
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── App.tsx             # Main component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
│
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── index.ts
│   │
│   └── package.json
│
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Database Schema

### Core Models

**User**
- id, email, name, password, avatar, role
- Relations: tasks, teams, integrations, notifications, reports

**Team**
- id, name, description
- Relations: members, projects

**Task**
- id, title, description, status, priority
- dueDate, progress, estimatedHours, actualHours
- isRecurring, recurringPattern
- Relations: subtasks, attachments, assignedTo

**Project**
- id, name, description, color, icon
- Relations: tasks, team

**Integration**
- id, userId, type (whatsapp, telegram, slack)
- isActive, config (JSON)

**FocusSession**
- id, userId, taskId, duration, actualDuration
- breaks, distractions, completed

**Report**
- id, userId, type, period
- data (JSON with metrics)

**AuditLog**
- id, userId, action, entity, changes

## State Management

Using Zustand for lightweight state management:

### TaskStore
```typescript
- tasks: Task[]
- selectedTaskId: string | null
- filter: { status, priority, assignedTo, tags }
- sortBy: 'dueDate' | 'priority' | 'created'

Actions:
- addTask, updateTask, deleteTask
- setFilter, setSortBy
- getFilteredTasks, getSortedTasks
- updateTaskStatus, completeTask
```

### UIStore
```typescript
- sidebarOpen: boolean
- darkMode: boolean
- isModalOpen: boolean
- viewMode: 'kanban' | 'list' | 'calendar' | 'timeline'
- selectedFilter: object

Actions:
- toggleSidebar, toggleDarkMode
- openModal, closeModal
- setViewMode
```

### UserStore
```typescript
- user: User | null
- isAuthenticated: boolean
- isLoading: boolean
- error: string | null

Actions:
- setUser, logout
- setLoading, setError
```

### NotificationStore
```typescript
- notifications: Notification[]
- unreadCount: number

Actions:
- addNotification, removeNotification
- markAsRead, markAllAsRead
- clearAll
```

## API Architecture

### REST Endpoints

**Authentication**
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- POST `/api/auth/logout` - User logout
- POST `/api/auth/refresh` - Refresh token

**Tasks**
- GET `/api/tasks` - Fetch all tasks
- GET `/api/tasks/:id` - Fetch single task
- POST `/api/tasks` - Create task
- PUT `/api/tasks/:id` - Update task
- DELETE `/api/tasks/:id` - Delete task
- GET `/api/tasks?status=:status` - Filter by status

**User**
- GET `/api/user/profile` - Get user profile
- PUT `/api/user/profile` - Update profile
- GET `/api/user/settings` - Get settings
- PUT `/api/user/settings` - Update settings

**Teams**
- GET `/api/teams` - List teams
- GET `/api/teams/:id` - Get team
- POST `/api/teams` - Create team
- GET `/api/teams/:id/members` - Get members

**Analytics**
- GET `/api/analytics/metrics` - Get metrics
- GET `/api/analytics/trends?period=:period` - Get trends
- GET `/api/analytics/productivity` - Productivity stats

**Integrations**
- GET `/api/integrations` - List integrations
- POST `/api/integrations` - Create integration
- PUT `/api/integrations/:id` - Update integration
- DELETE `/api/integrations/:id` - Delete integration

**WhatsApp**
- POST `/api/integrations/whatsapp/verify` - Verify phone
- POST `/api/integrations/whatsapp/send` - Send message
- GET `/api/integrations/whatsapp/status` - Get status

**Telegram**
- POST `/api/integrations/telegram/verify` - Verify bot
- POST `/api/integrations/telegram/send` - Send message
- GET `/api/integrations/telegram/status` - Get status

### WebSocket Events

Real-time updates via Socket.IO:
- `task:created` - New task created
- `task:updated` - Task updated
- `task:deleted` - Task deleted
- `status:changed` - Task status changed
- `notification:new` - New notification

## Authentication Flow

1. User enters credentials
2. Backend validates and returns JWT token
3. Token stored in localStorage
4. API requests include token in Authorization header
5. Token refreshed automatically on expiry
6. Logout clears token and redirects to login

## Integration Implementation

### WhatsApp Integration
```
1. Connect WhatsApp Business Account
2. Configure webhook for incoming messages
3. Send messages via Meta WhatsApp Cloud API
4. Handle task reminders and notifications
5. Support command parsing from messages
```

### Telegram Integration
```
1. Create Telegram bot via BotFather
2. Set webhook URL
3. Handle incoming commands and messages
4. Send notifications with inline buttons
5. Parse /create, /list, /complete commands
```

## Key Features Implementation

### Kanban Board
- Drag-and-drop task management
- Status columns: To Do, In Progress, Review, Completed
- Add/edit tasks inline
- Filter by priority, assignee, tags

### Analytics Dashboard
- Completion trends (line chart)
- Priority distribution (pie chart)
- Focus sessions (bar chart)
- Productivity score calculation
- AI-generated insights

### Real-time Collaboration
- Socket.IO for instant updates
- Presence indicators
- Notification system
- Audit logs for accountability

### Task Management
- Multi-level priorities (Low, Medium, High, Urgent)
- Progress tracking (0-100%)
- Time estimation and actuals
- Recurring tasks
- Subtasks and attachments

## Performance Optimizations

1. **Code Splitting** - Lazy load pages and components
2. **Memoization** - React.memo for expensive components
3. **Caching** - Redis for analytics and expensive queries
4. **Database Indexing** - Proper indexes on frequently queried fields
5. **CDN** - Serve static assets from CDN
6. **Compression** - gzip compression for API responses
7. **Pagination** - Limit returned data

## Security Measures

1. **JWT Authentication** - Stateless auth
2. **CORS** - Restricted to trusted origins
3. **Rate Limiting** - Prevent API abuse
4. **Input Validation** - Server-side validation
5. **SQL Injection Prevention** - Prisma ORM
6. **XSS Protection** - React escaping
7. **HTTPS** - Encrypted connections
8. **Environment Variables** - Sensitive config
9. **Audit Logs** - Track all actions

## Deployment

### Frontend
- Build: `npm run build`
- Deploy to: Vercel, Netlify, AWS S3 + CloudFront

### Backend
- Build: `npm run build`
- Deploy to: AWS EC2, Heroku, DigitalOcean, Railway
- Database: AWS RDS PostgreSQL or managed PostgreSQL

### Environment Variables

Frontend:
```
REACT_APP_API_URL=https://api.taskflow.app
REACT_APP_WHATSAPP_PHONE_ID=...
REACT_APP_TELEGRAM_BOT_TOKEN=...
```

Backend:
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
WHATSAPP_TOKEN=...
TELEGRAM_BOT_TOKEN=...
REDIS_URL=...
```

## Monitoring and Logging

- Application Insights / New Relic for performance
- Sentry for error tracking
- CloudWatch for logs
- Datadog for infrastructure monitoring

## Future Enhancements

1. Mobile app (React Native)
2. Advanced AI features (GPT integration)
3. Video conferencing integration
4. File storage integration (S3, Drive)
5. Advanced reporting (PDF export)
6. Workflow automation
7. Custom integrations API
8. Multi-language support
9. Advanced role-based access
10. Machine learning for task prediction

## Contributing

1. Create feature branch
2. Write tests
3. Submit PR with description
4. Code review and merge

## License

MIT License
