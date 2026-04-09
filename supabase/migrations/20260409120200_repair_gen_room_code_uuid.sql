-- Repair for DBs that applied an older 20260409120100 where gen_room_code used
-- gen_random_bytes() before pgcrypto existed → "function gen_random_bytes(integer) does not exist".
-- Idempotent: safe to run on fresh DBs too (CREATE OR REPLACE only).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.gen_room_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  LOOP
    v := upper(substring(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms WHERE room_code = v);
  END LOOP;
  RETURN v;
END;
$$;
