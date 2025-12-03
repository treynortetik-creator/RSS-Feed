# Deployment Guide

## ⚡ Quick Deploy (Recommended)

### Railway.app (Best for this project)
1. Go to [Railway.app](https://railway.app)
2. Click "Start a New Project"
3. Connect your GitHub repository
4. Railway auto-detects Node.js and runs `npm start`
5. Your app will be live in ~2 minutes!

**Why Railway:**
- ✅ Supports SQLite out of the box
- ✅ Persistent file system
- ✅ Background processes work
- ✅ Free tier: 500 hours/month
- ✅ Automatic HTTPS

### Render.com (Alternative)
1. Go to [Render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Click "Create Web Service"

**Why Render:**
- ✅ Free tier available
- ✅ Persistent disk storage
- ✅ Easy to use
- ✅ Automatic deploys

### Fly.io (For advanced users)
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app (follow prompts)
flyctl launch

# Deploy
flyctl deploy
```

## ❌ Vercel (Not Recommended)

Vercel is designed for **serverless** apps. This project needs:
- Persistent database (SQLite)
- Background scheduler
- Long-running processes

To use Vercel, you'd need to:
1. Replace SQLite with PostgreSQL/MongoDB
2. Replace scheduler with Vercel Cron Jobs
3. Refactor Express to serverless functions
4. Major code changes (not worth it)

## 🐳 Docker Deployment (Any VPS)

If you have a VPS (DigitalOcean, AWS, etc.):

```bash
# Create Dockerfile
docker build -t rss-feed-app .
docker run -p 3000:3000 rss-feed-app
```

## Environment Variables

Set these on your hosting platform:
```
PORT=3000
NODE_ENV=production
DATABASE_PATH=./data/feeds.db
REFRESH_INTERVAL=3600000
BASE_URL=https://your-domain.com
```

## Post-Deployment

1. Test health endpoint: `https://your-domain.com/health`
2. Create your first feed via the UI
3. Check logs to ensure scheduler is running
