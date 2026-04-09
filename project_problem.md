# Project problem report — CFClash (maintenance notes)

This file tracks **known constraints** and how the codebase addresses them. It replaces older notes that referred to deleted migration filenames or a broken Codeforces base URL.

## Resolved in current tree

- **Codeforces API URL:** `src/services/codeforces.ts` builds URLs as `` `${base}/${path}` `` so paths such as `contest.list` resolve correctly.
- **Create room errors:** `CreateRoomModal` uses `supabaseErrorMessage()` so PostgREST / RPC messages surface in toasts.
- **Join approve from notifications:** RPCs `request_join_room` and `request_join_room_by_room_id` include `request_id` in notification `metadata` for `NotificationBell`.
- **Contest sync shape:** `scripts/cf-sync-core.mjs` upserts the same columns as `src/services/contests.ts` (`contest_id`, `duration_seconds`, `start_time_seconds`, `synced_at`, etc.).
- **Vercel cron:** `vercel.json` calls `/api/sync-codeforces-cron` (not a static `.mjs` path). SPA rewrite excludes `/api/*`.

## Operational requirements

1. **`problems` must be populated** before `create_room_with_difficulties` can pick random rows by difficulty. Run `npm run sync:problems` with service role env vars, or rely on production cron after deploy.
2. **Apply Supabase migrations** in order: `20260409120000_cfclash_schema_rls_realtime.sql`, then `20260409120100_cfclash_functions.sql`. See `SETUP.md`.
3. **`CRON_SECRET` on Vercel:** If unset, the sync API does not verify the caller — set it in production.

## Schema / typing

- Generated types live in `src/integrations/supabase/types.ts`. The `contests` row type includes `contest_id` (business key) alongside the internal `id` serial where both exist.
- Reference DDL: `supabase_schema_already_created.sql` (greenfield); production changes should go through `supabase/migrations/`.

## Optional follow-ups

- Move heavy contest/problem sync entirely off the browser (already partly done via cron); tighten RLS if you want to block authenticated clients from bulk-upserting `contests`.
- Recalculate `leaderboard.rank` periodically if you want a stored rank column; the UI can also derive order from `total_points`.
