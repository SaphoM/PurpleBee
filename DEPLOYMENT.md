# Deployment Guide

## Local Development Setup

### 1. Prerequisites
- Node.js 16+ and npm/yarn
- PostgreSQL 12+
- Redis (optional, for caching)
- Git

### 2. Clone and Install

```bash
git clone <repository-url>
cd productivity-dashboard

# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### 3. Environment Configuration

Frontend (`.env`):
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WHATSAPP_PHONE_ID=your_phone_id
REACT_APP_TELEGRAM_BOT_TOKEN=your_bot_token
```

Backend (`backend/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
JWT_SECRET=dev_secret_key_123
PORT=3000
NODE_ENV=development
```

### 4. Database Setup

```bash
cd backend
npx prisma migrate dev --name init
npx prisma studio  # Optional: view database UI
cd ..
```

### 5. Start Development Servers

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
cd backend
npm run dev
```

Access application at `http://localhost:5173`

---

## Production Deployment

### Frontend Deployment

#### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
REACT_APP_API_URL=https://api.taskflow.app
REACT_APP_WHATSAPP_PHONE_ID=...
REACT_APP_TELEGRAM_BOT_TOKEN=...
```

#### Option 2: Netlify

```bash
# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist

# Or connect GitHub repository to Netlify for automatic deployments
```

#### Option 3: AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Backend Deployment

#### Option 1: Railway (Easiest)

1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy with single click

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=production
PORT=3000
```

#### Option 2: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0 --app=your-app-name

# Set environment variables
heroku config:set JWT_SECRET=... --app=your-app-name
heroku config:set WHATSAPP_TOKEN=... --app=your-app-name

# Deploy
git push heroku main
```

#### Option 3: AWS EC2

```bash
# 1. Launch EC2 instance (Ubuntu 20.04 LTS)
# 2. Install Node.js and PostgreSQL
sudo apt update && sudo apt upgrade -y
sudo apt install nodejs npm postgresql postgresql-contrib -y

# 3. Clone repository
git clone <repository-url>
cd productivity-dashboard/backend

# 4. Install dependencies
npm install --production

# 5. Setup environment variables
nano .env
# Add production values

# 6. Run migrations
npx prisma migrate deploy

# 7. Start with PM2 (process manager)
npm install -g pm2
pm2 start src/index.ts --name "taskflow-api"
pm2 startup
pm2 save
```

#### Option 4: DigitalOcean App Platform

1. Connect GitHub repository
2. Create PostgreSQL database
3. Set environment variables
4. Deploy

### Database Setup

#### PostgreSQL Managed Services

**AWS RDS:**
```bash
# After creating RDS instance, connect:
psql -h your-rds-endpoint.amazonaws.com -U admin -d taskflow

# Run migrations
npx prisma migrate deploy
```

**Supabase:**
```bash
# Get connection string from Supabase dashboard
export DATABASE_URL="postgresql://user:password@your-project.supabase.co:5432/postgres"

npx prisma migrate deploy
npx prisma studio
```

**Railway:**
```bash
# Connection string provided in Railway dashboard
# Auto-synced with DATABASE_URL environment variable
npx prisma migrate deploy
```

---

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build frontend
        run: npm run build

      - name: Deploy to Vercel
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}

      - name: Build backend
        run: cd backend && npm run build

      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway deploy --token ${{ secrets.RAILWAY_TOKEN }}
```

---

## Monitoring & Logging

### Sentry (Error Tracking)

```javascript
// In frontend
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// In backend
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### CloudWatch (AWS)

```bash
# Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb
```

### Application Insights (Azure)

Configure in backend `index.ts`:
```typescript
import appInsights from "applicationinsights";

appInsights.setup(process.env.APPINSIGHTS_CONNECTION_STRING)
  .setAutoCollectConsole(true)
  .start();
```

---

## Performance Optimization

### Frontend
```bash
# Build with optimizations
npm run build

# Analyze bundle size
npm install -g webpack-bundle-analyzer
```

### Backend
```javascript
// Enable compression
app.use(compression());

// Enable caching headers
app.use((req, res, next) => {
  if (req.path.match(/\.(js|css|png|jpg)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000');
  }
  next();
});
```

### Database
```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
```

---

## Scaling Strategy

### Horizontal Scaling
- Use load balancer (AWS ALB, Nginx)
- Run multiple backend instances
- Use managed database service
- Implement Redis caching

### Database Scaling
- Add read replicas
- Implement connection pooling
- Archive old data
- Partition large tables

### Caching Strategy
- Cache frequent queries (Redis)
- Cache static assets (CDN)
- Implement API response caching

---

## Security Checklist

- [ ] Enable HTTPS/SSL certificates
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure rate limiting
- [ ] Enable CORS only for trusted origins
- [ ] Implement DDoS protection
- [ ] Use environment variables for secrets
- [ ] Enable database encryption
- [ ] Setup automated backups
- [ ] Configure VPN/security groups
- [ ] Enable audit logging
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## Backup & Recovery

```bash
# PostgreSQL Backup
pg_dump -h localhost -U user -d taskflow > backup.sql

# Restore
psql -h localhost -U user -d taskflow < backup.sql

# AWS RDS Backup
aws rds create-db-snapshot \
  --db-instance-identifier taskflow-db \
  --db-snapshot-identifier taskflow-backup-$(date +%Y%m%d)
```

---

## Troubleshooting

**Database Connection Issues:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -c "SELECT 1"
```

**Application Crashes:**
```bash
# Check logs
pm2 logs taskflow-api
journalctl -u taskflow-api

# Restart application
pm2 restart taskflow-api
```

**Memory Issues:**
```bash
# Monitor memory usage
free -h

# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

---

For more help, visit the [documentation](./ARCHITECTURE.md) or open an issue on GitHub.
