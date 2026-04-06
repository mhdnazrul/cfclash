# cfclash Production Guide (Vercel + Supabase)

## What is already implemented

- Supabase Auth (Email/Password + Google OAuth)
- Profile completion gate before battle access
- Battle room creation via RPC + problem cache
- Join request / approval notification flow
- Realtime subscriptions for room and notification updates
- Vercel SPA routing support via `vercel.json`

## Required environment variables

### Frontend (Vercel Project Settings -> Environment Variables)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`  
  (app also accepts `VITE_SUPABASE_PUBLISHABLE_KEY`)

### Problem sync job (server-side script / cron only)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Database migration

Run in Supabase SQL editor:

- `supabase/migrations/20260407090000_cfclash_prod_backend.sql`

This migration includes:

- schema updates for rooms, notifications, room requests, problems
- RLS policies
- secured RPC functions
- RPC execute grants restricted to `authenticated` users

## Problem cache sync

Initial + daily:

```bash
npm run sync:problems
```

Use a scheduler (GitHub Actions, cron, Railway, etc.) to run once per day.

## Deploy to Vercel checklist

1. Push code to GitHub.
2. Import repository in Vercel.
3. Add env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In Supabase Auth settings, set redirect URLs:
   - `https://YOUR_DOMAIN/auth/complete-profile`
   - `https://YOUR_DOMAIN/dashboard`
   - optional preview URL wildcard(s)
5. Deploy and verify:
   - Google login redirect works
   - Email/password login works
   - Deep links (`/dashboard`, `/battle-arena`) load (rewrite via `vercel.json`)
   - Room request/approve flow works in realtime

## Security notes

- Never commit `.env` files or local secret text files.
- Rotate credentials immediately if they were exposed previously.
- Keep `service_role` keys only in backend/cron environments, never in browser code.
