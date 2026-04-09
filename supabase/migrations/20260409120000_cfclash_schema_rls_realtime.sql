-- CFClash: extensions, columns, indexes, RLS, realtime publication
-- Idempotent where possible for existing projects.

-- ---------------------------------------------------------------------------
-- Extensions (pgcrypto: gen_random_bytes in gen_room_code; idempotent with other migrations)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Contests: optional participant_count (UI sort); app upserts use contest_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.contests
  ADD COLUMN IF NOT EXISTS participant_count INT;

-- ---------------------------------------------------------------------------
-- Profiles: align with Settings / frontend
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS age INT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'gray',
  ADD COLUMN IF NOT EXISTS win_loss_ratio REAL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Notifications: read flag (NotificationBell)
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.notifications
  ALTER COLUMN sender_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- Join requests: allow re-request after reject; dedupe only pending
-- ---------------------------------------------------------------------------
ALTER TABLE public.join_requests DROP CONSTRAINT IF EXISTS join_requests_room_id_requester_user_id_key;

DROP INDEX IF EXISTS join_requests_room_requester_pending_uidx;
CREATE UNIQUE INDEX join_requests_room_requester_pending_uidx
  ON public.join_requests (room_id, requester_user_id)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Leaderboard: optional rank snapshot (UI computes rank from order)
-- ---------------------------------------------------------------------------
ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS rank INT;

-- ---------------------------------------------------------------------------
-- Room participants: optional joined_at for future use
-- ---------------------------------------------------------------------------
ALTER TABLE public.room_participants
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-run
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','problems','contests','rooms','room_problems','room_participants',
        'join_requests','notifications','leaderboard'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- profiles
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- problems (read-only for clients)
CREATE POLICY problems_select_all ON public.problems FOR SELECT TO anon, authenticated USING (true);

-- contests (cache: public read; authenticated can upsert for app sync)
CREATE POLICY contests_select_all ON public.contests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY contests_insert_auth ON public.contests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY contests_update_auth ON public.contests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- rooms
CREATE POLICY rooms_select_visible ON public.rooms FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR creator_id = auth.uid()
    OR auth.uid() = ANY (COALESCE(approved_participants, '{}'::uuid[]))
  );
CREATE POLICY rooms_insert_creator ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY rooms_update_creator ON public.rooms FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- room_problems: visible when room is visible
CREATE POLICY room_problems_select ON public.room_problems FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_problems.room_id
        AND (
          r.visibility = 'public'
          OR r.creator_id = auth.uid()
          OR auth.uid() = ANY (COALESCE(r.approved_participants, '{}'::uuid[]))
        )
    )
  );

-- room_participants
CREATE POLICY room_participants_select ON public.room_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_participants.room_id
        AND (
          r.visibility = 'public'
          OR r.creator_id = auth.uid()
          OR auth.uid() = ANY (COALESCE(r.approved_participants, '{}'::uuid[]))
        )
    )
  );
CREATE POLICY room_participants_insert ON public.room_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.creator_id = auth.uid())
  );
CREATE POLICY room_participants_update ON public.room_participants FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_participants.room_id AND r.creator_id = auth.uid())
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_participants.room_id AND r.creator_id = auth.uid())
    OR user_id = auth.uid()
  );

-- join_requests
CREATE POLICY join_requests_select ON public.join_requests FOR SELECT TO authenticated
  USING (
    requester_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = join_requests.room_id AND r.creator_id = auth.uid())
  );
CREATE POLICY join_requests_insert ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());
CREATE POLICY join_requests_update_host ON public.join_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = join_requests.room_id AND r.creator_id = auth.uid()));

-- notifications
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- leaderboard
CREATE POLICY leaderboard_select_all ON public.leaderboard FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
