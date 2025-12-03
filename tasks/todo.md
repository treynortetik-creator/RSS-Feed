# Vercel Deployment - Task Plan

## Problem
App crashes on Vercel with `500: FUNCTION_INVOCATION_FAILED` error.

## Root Causes
1. **SQLite incompatible** - Vercel has ephemeral file system, SQLite file gets wiped
2. **Background scheduler incompatible** - Serverless functions are stateless, can't run continuous processes
3. **Express app not adapted** - Needs serverless export

## Solution Strategy
Make minimal, simple changes to support Vercel's serverless architecture.

---

## Tasks

### Phase 1: Database Migration (SQLite → Vercel Postgres)
- [ ] Install @vercel/postgres package
- [ ] Create new database adapter for Postgres
- [ ] Update database initialization to use Postgres
- [ ] Keep SQLite as fallback for local development
- [ ] Update all queries to be Postgres-compatible

### Phase 2: Remove Background Scheduler
- [ ] Disable scheduler in server.js for Vercel environment
- [ ] Create /api/cron/refresh endpoint for Vercel Cron Jobs
- [ ] Update vercel.json to configure cron schedule
- [ ] Add auth token to secure cron endpoint

### Phase 3: Serverless Adaptation
- [ ] Export Express app for serverless
- [ ] Update vercel.json routing configuration
- [ ] Add environment detection (local vs Vercel)
- [ ] Test health endpoint

### Phase 4: Configuration & Testing
- [ ] Update .env.example with Postgres variables
- [ ] Add deployment instructions for Vercel
- [ ] Test feed creation
- [ ] Test RSS generation
- [ ] Verify cron endpoint works

---

## Changes Summary (To be filled after completion)

### Files Modified:
- TBD

### Files Created:
- TBD

### Key Decisions:
- TBD

### Testing Results:
- TBD
