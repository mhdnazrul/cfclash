-- ==========================================
-- CFClash — reference schema (greenfield / documentation)
-- Production: prefer `supabase db push` with migrations under supabase/migrations/
--   - 20260409120000_cfclash_schema_rls_realtime.sql  (columns, RLS, realtime)
--   - 20260409120100_cfclash_functions.sql             (auth trigger + RPCs)
-- ==========================================

-- Extensions: pgcrypto supplies gen_random_bytes() for room codes; gen_random_uuid() is built-in on PG13+
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cf_handle TEXT,
    display_email TEXT,
    first_name TEXT,
    last_name TEXT,
    gender TEXT,
    age INT,
    phone TEXT,
    total_points INT DEFAULT 0,
    avatar_url TEXT,
    rating_color TEXT DEFAULT 'gray',
    win_loss_ratio REAL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Problems (Codeforces problemset; sync script + cron)
CREATE TABLE IF NOT EXISTS public.problems (
    id BIGSERIAL PRIMARY KEY,
    contest_id INT NOT NULL,
    problem_index TEXT NOT NULL,
    name TEXT NOT NULL,
    difficulty INT,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (contest_id, problem_index)
);

-- 3. Contests cache (columns aligned with src/services/contests.ts + scripts/cf-sync-core.mjs)
CREATE TABLE IF NOT EXISTS public.contests (
    id BIGSERIAL PRIMARY KEY,
    contest_id INT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    phase TEXT NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    start_time_seconds BIGINT,
    synced_at TIMESTAMPTZ,
    participant_count INT
);

-- 4. Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    display_name TEXT,
    visibility TEXT CHECK (visibility IN ('public', 'unlisted', 'private')),
    duration_minutes INT NOT NULL,
    status TEXT DEFAULT 'waiting',
    problem_set JSONB,
    problem_ids JSONB,
    approved_participants UUID[] DEFAULT '{}',
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Room problems
CREATE TABLE IF NOT EXISTS public.room_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    problem_label TEXT NOT NULL CHECK (problem_label ~ '^[A-H]$'),
    contest_id INT NOT NULL,
    problem_index TEXT NOT NULL,
    title TEXT NOT NULL,
    rating INT,
    url TEXT NOT NULL,
    problem_key TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE (room_id, problem_label)
);

-- 6. Room participants
CREATE TABLE IF NOT EXISTS public.room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cf_handle TEXT,
    solved_count INT NOT NULL DEFAULT 0,
    penalty INT NOT NULL DEFAULT 0,
    problem_status JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_submission_time_seconds INT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (room_id, user_id)
);

-- 7. Join requests — only one *pending* row per (room, requester); re-request after reject allowed
CREATE TABLE IF NOT EXISTS public.join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    requester_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.join_requests DROP CONSTRAINT IF EXISTS join_requests_room_id_requester_user_id_key;

DROP INDEX IF EXISTS join_requests_room_requester_pending_uidx;
CREATE UNIQUE INDEX join_requests_room_requester_pending_uidx
  ON public.join_requests (room_id, requester_user_id)
  WHERE status = 'pending';

-- 8. Leaderboard
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    cf_handle TEXT,
    total_points INT DEFAULT 0,
    total_battles INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    rank INT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- After base tables, apply migrations for RLS + publication + SECURITY DEFINER RPCs (see filenames above).
