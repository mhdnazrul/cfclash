-- CFClash: triggers + RPCs (SECURITY DEFINER)
--
-- pgcrypto: enable before any function that used gen_random_bytes (repair old deploys).
-- gen_room_code() below uses gen_random_uuid() only (built-in PG13+) so RPC works even if
-- extension order was wrong; no runtime dependency on gen_random_bytes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop stale definitions if they were created when gen_random_bytes was missing (broken bodies).
DROP FUNCTION IF EXISTS public.create_room_with_difficulties(text, text, int, int[]) CASCADE;
DROP FUNCTION IF EXISTS public.gen_room_code() CASCADE;

-- ---------------------------------------------------------------------------
-- Auth: bootstrap profile + leaderboard row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.leaderboard (user_id, total_points) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.create_profile_for_new_user();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_valid_cf_handle(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_uid
      AND p.cf_handle IS NOT NULL
      AND length(trim(p.cf_handle)) > 0
  );
$$;

CREATE OR REPLACE FUNCTION public.gen_room_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  LOOP
    -- 6-char codes from hex chars (no pgcrypto required). Collisions retried via loop.
    v := upper(substring(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms WHERE room_code = v);
  END LOOP;
  RETURN v;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_room_with_difficulties
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_room_with_difficulties(
  p_display_name text,
  p_visibility text,
  p_duration_minutes int,
  p_difficulties int[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_room_id uuid;
  v_code text;
  rec public.problems%ROWTYPE;
  i int;
  lbl text;
  n int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_valid_cf_handle(v_uid) THEN
    RAISE EXCEPTION 'Link a Codeforces handle in Settings before creating a room';
  END IF;

  IF p_visibility IS NULL OR p_visibility NOT IN ('public', 'unlisted', 'private') THEN
    RAISE EXCEPTION 'Invalid visibility';
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  n := coalesce(array_length(p_difficulties, 1), 0);
  IF n < 1 OR n > 8 THEN
    RAISE EXCEPTION 'Provide between 1 and 8 difficulties';
  END IF;

  v_code := public.gen_room_code();

  INSERT INTO public.rooms (
    room_code, creator_id, display_name, visibility, duration_minutes, status, approved_participants
  ) VALUES (
    v_code, v_uid, nullif(trim(p_display_name), ''), p_visibility, p_duration_minutes, 'waiting', ARRAY[v_uid]::uuid[]
  )
  RETURNING id INTO v_room_id;

  INSERT INTO public.room_participants (room_id, user_id, cf_handle)
  SELECT v_room_id, v_uid, trim(cf_handle) FROM public.profiles WHERE id = v_uid
  ON CONFLICT (room_id, user_id) DO UPDATE SET cf_handle = excluded.cf_handle;

  FOR i IN 1..n LOOP
    SELECT * INTO rec FROM public.problems
    WHERE difficulty = p_difficulties[i]
    ORDER BY random() LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No problem available for difficulty %', p_difficulties[i];
    END IF;

    lbl := chr(64 + i);
    INSERT INTO public.room_problems (
      room_id, problem_label, contest_id, problem_index, title, rating, url, problem_key, sort_order
    ) VALUES (
      v_room_id,
      lbl,
      rec.contest_id,
      rec.problem_index,
      rec.name,
      rec.difficulty,
      coalesce(rec.link, format('https://codeforces.com/problemset/problem/%s/%s', rec.contest_id, rec.problem_index)),
      rec.contest_id::text || '/' || rec.problem_index,
      i
    );
  END LOOP;

  RETURN json_build_object(
    'id', v_room_id,
    'room_code', v_code,
    'display_name', nullif(trim(p_display_name), ''),
    'visibility', p_visibility,
    'status', 'waiting'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- request_join_room (by code)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_join_room(p_room_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  rid uuid;
  host uuid;
  ap uuid[];
  req_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, creator_id, coalesce(approved_participants, '{}') INTO rid, host, ap
  FROM public.rooms WHERE upper(trim(room_code)) = upper(trim(p_room_code)) LIMIT 1;

  IF rid IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF host = v_uid THEN RAISE EXCEPTION 'You are the host'; END IF;
  IF v_uid = ANY (ap) THEN RAISE EXCEPTION 'Already a participant'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.join_requests
    WHERE room_id = rid AND requester_user_id = v_uid AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'duplicate pending join request';
  END IF;

  INSERT INTO public.join_requests (room_id, requester_user_id, status)
  VALUES (rid, v_uid, 'pending')
  RETURNING id INTO req_id;

  INSERT INTO public.notifications (user_id, sender_id, room_id, type, message, metadata, is_read)
  VALUES (
    host, v_uid, rid, 'join_request',
    'New join request for your battle room',
    jsonb_build_object('kind', 'join_request', 'requester_id', v_uid::text, 'request_id', req_id::text),
    false
  );

  RETURN json_build_object('ok', true, 'room_id', rid);
END;
$$;

-- ---------------------------------------------------------------------------
-- request_join_room_by_room_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_join_room_by_room_id(p_room_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  host uuid;
  ap uuid[];
  vis text;
  req_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT creator_id, coalesce(approved_participants, '{}'), visibility
  INTO host, ap, vis
  FROM public.rooms WHERE id = p_room_id LIMIT 1;

  IF host IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF vis <> 'public' THEN RAISE EXCEPTION 'Room is not public'; END IF;
  IF host = v_uid THEN RAISE EXCEPTION 'You are the host'; END IF;
  IF v_uid = ANY (ap) THEN RAISE EXCEPTION 'Already a participant'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.join_requests
    WHERE room_id = p_room_id AND requester_user_id = v_uid AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'duplicate pending join request';
  END IF;

  INSERT INTO public.join_requests (room_id, requester_user_id, status)
  VALUES (p_room_id, v_uid, 'pending')
  RETURNING id INTO req_id;

  INSERT INTO public.notifications (user_id, sender_id, room_id, type, message, metadata, is_read)
  VALUES (
    host, v_uid, p_room_id, 'join_request',
    'New join request for your battle room',
    jsonb_build_object('kind', 'join_request', 'requester_id', v_uid::text, 'request_id', req_id::text),
    false
  );

  RETURN json_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- handle_room_request
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_room_request(p_request_id uuid, p_approve boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  jr public.join_requests%ROWTYPE;
  ap uuid[];
  h text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO jr FROM public.join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF jr.status <> 'pending' THEN RAISE EXCEPTION 'Request already handled'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = jr.room_id AND creator_id = v_uid) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF p_approve THEN
    SELECT cf_handle INTO h FROM public.profiles WHERE id = jr.requester_user_id;
    UPDATE public.join_requests SET status = 'approved' WHERE id = p_request_id;

    UPDATE public.rooms
    SET approved_participants = CASE
      WHEN jr.requester_user_id = ANY (coalesce(approved_participants, '{}')) THEN approved_participants
      ELSE array_append(coalesce(approved_participants, '{}'), jr.requester_user_id)
    END
    WHERE id = jr.room_id;

    INSERT INTO public.room_participants (room_id, user_id, cf_handle)
    VALUES (jr.room_id, jr.requester_user_id, coalesce(trim(h), ''))
    ON CONFLICT (room_id, user_id) DO UPDATE SET cf_handle = excluded.cf_handle;

    INSERT INTO public.notifications (user_id, sender_id, room_id, type, message, metadata, is_read)
    VALUES (
      jr.requester_user_id, v_uid, jr.room_id, 'join_approved',
      'Your join request was approved',
      jsonb_build_object('room_id', jr.room_id::text),
      false
    );
  ELSE
    UPDATE public.join_requests SET status = 'rejected' WHERE id = p_request_id;

    INSERT INTO public.notifications (user_id, sender_id, room_id, type, message, metadata, is_read)
    VALUES (
      jr.requester_user_id, v_uid, jr.room_id, 'join_rejected',
      'Your join request was rejected',
      jsonb_build_object('room_id', jr.room_id::text),
      false
    );
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- start_battle
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_battle(p_room_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  st text;
  ap uuid[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT status, coalesce(approved_participants, '{}') INTO st, ap
  FROM public.rooms WHERE id = p_room_id FOR UPDATE;

  IF st IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND creator_id = v_uid) THEN
    RAISE EXCEPTION 'Only the host can start';
  END IF;
  IF st <> 'waiting' THEN RAISE EXCEPTION 'Battle already started or finished'; END IF;
  IF array_length(ap, 1) IS NULL OR array_length(ap, 1) < 2 THEN
    RAISE EXCEPTION 'Need at least 2 participants';
  END IF;

  UPDATE public.rooms
  SET status = 'active', started_at = now()
  WHERE id = p_room_id;

  RETURN json_build_object('id', p_room_id, 'status', 'active', 'started_at', now());
END;
$$;

-- ---------------------------------------------------------------------------
-- finalize_battle_points
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_battle_points(p_room_id uuid, p_points jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  st text;
  rk text;
  pts int;
  mx int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT status INTO st FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF st IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND creator_id = v_uid) THEN
    RAISE EXCEPTION 'Only the host can finalize';
  END IF;
  IF st = 'ended' THEN
    RETURN;
  END IF;
  IF st <> 'active' THEN
    RAISE EXCEPTION 'Room is not active';
  END IF;

  IF p_points IS NULL OR p_points = '{}'::jsonb THEN
    RAISE EXCEPTION 'No scores provided';
  END IF;

  SELECT max((value)::int) INTO mx FROM jsonb_each_text(p_points);

  FOR rk, pts IN SELECT * FROM jsonb_each_text(p_points)
  LOOP
    UPDATE public.profiles
    SET total_points = coalesce(total_points, 0) + pts::int, updated_at = now()
    WHERE id = rk::uuid;

    INSERT INTO public.leaderboard (user_id, total_points, total_battles, wins, losses, cf_handle)
    SELECT rk::uuid, pts::int, 1,
      CASE WHEN pts::int = mx AND mx > 0 THEN 1 ELSE 0 END,
      CASE WHEN pts::int < mx OR mx = 0 THEN 1 ELSE 0 END,
      p.cf_handle
    FROM public.profiles p WHERE p.id = rk::uuid
    ON CONFLICT (user_id) DO UPDATE SET
      total_points = public.leaderboard.total_points + excluded.total_points,
      total_battles = public.leaderboard.total_battles + 1,
      wins = public.leaderboard.wins + excluded.wins,
      losses = public.leaderboard.losses + excluded.losses,
      cf_handle = coalesce(excluded.cf_handle, public.leaderboard.cf_handle),
      updated_at = now();
  END LOOP;

  UPDATE public.rooms SET status = 'ended' WHERE id = p_room_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- delete_my_account
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_room_with_difficulties(text, text, int, int[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_join_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_join_room_by_room_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_room_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_battle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_battle_points(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ---------------------------------------------------------------------------
-- Manual verification (run in SQL editor after migrate)
-- ---------------------------------------------------------------------------
-- SELECT extname, extversion FROM pg_extension WHERE extname = 'pgcrypto';
-- SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc
--   WHERE pronamespace = 'public'::regnamespace AND proname IN ('gen_room_code', 'create_room_with_difficulties');
