# Vercel Deployment Issues & Solutions

## ⚠️ Current Problems with Vercel

### 1. SQLite Database Won't Work
- **Problem**: Vercel serverless functions have no persistent file system
- **Impact**: Your database gets wiped after each request
- **Solution Required**: Switch to PostgreSQL, MongoDB, or another hosted database

### 2. Background Scheduler Won't Work
- **Problem**: Serverless functions are stateless and short-lived
- **Impact**: The auto-refresh scheduler cannot run continuously
- **Solution Required**: Use Vercel Cron Jobs or external scheduler service

### 3. Timeout Limits
- **Problem**: Vercel free tier has 10-second timeout, pro has 60 seconds
- **Impact**: Long-running scraping operations may fail
- **Solution Required**: Optimize scraping or use async processing

## 🔧 Required Changes for Vercel

### Step 1: Replace SQLite with PostgreSQL

```bash
npm install pg
```

Update `src/database/db.js`:
```javascript
// Use PostgreSQL instead of SQLite
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
```

### Step 2: Remove Background Scheduler

The scheduler in `src/utils/scheduler.js` won't work. Instead:

1. Use Vercel Cron Jobs in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/refresh",
    "schedule": "0 * * * *"
  }]
}
```

2. Create cron endpoint:
```javascript
// src/routes/cronRoutes.js
exports.refreshAllFeeds = async (req, res) => {
  // Verify it's from Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Trigger refresh logic
  // ...
};
```

### Step 3: Add Environment Variables in Vercel

1. Go to your Vercel project settings
2. Add these environment variables:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `CRON_SECRET` - Random secret for cron authentication
   - `NODE_ENV` - Set to "production"

### Step 4: Handle Cold Starts

Serverless functions "sleep" when not used. First request will be slow.

```javascript
// Add warming endpoint
app.get('/api/warm', (req, res) => {
  res.json({ status: 'warm' });
});
```

## 📊 Cost Comparison

### Railway (Recommended)
- **Free Tier**: 500 hours/month ($0)
- **Paid**: $5/month for hobby plan
- **Works out of the box**: No code changes

### Vercel
- **Free Tier**: Available but requires major refactoring
- **Paid**: $20/month for Pro (need database separately)
- **Requires**: Complete database migration + scheduler replacement

## 🎯 Recommendation

**Use Railway or Render instead of Vercel for this project.**

This app is designed as a traditional Node.js server with:
- Persistent database
- Background processes
- Long-running operations

Vercel is optimized for:
- Static sites
- Serverless APIs
- Short-lived functions

## 🚀 Quick Railway Deploy

1. Go to https://railway.app
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository
5. Railway auto-detects the setup
6. Click deploy
7. Done! Your app is live with zero config changes

## Alternative: If You MUST Use Vercel

I've included a basic `vercel.json` file, but you'll need to:

1. ❌ Remove SQLite, add PostgreSQL (provision from Vercel/Supabase)
2. ❌ Remove the scheduler from `src/server.js`
3. ❌ Set up Vercel Cron Jobs for feed refresh
4. ❌ Update all database code to use PostgreSQL
5. ❌ Test thoroughly as timeouts may occur

**Estimated work**: 4-6 hours of refactoring

**vs Railway deployment**: 2 minutes, zero changes needed

The choice is yours!
