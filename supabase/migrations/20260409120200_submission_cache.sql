-- CFClash: Submission Cache Table
-- This table caches Codeforces user submissions to avoid hammering the API

CREATE TABLE IF NOT EXISTS public.submission_cache (
    id BIGSERIAL PRIMARY KEY,
    cf_handle TEXT UNIQUE NOT NULL,
    submissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_fetch_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_cache_handle ON public.submission_cache (cf_handle);
CREATE INDEX IF NOT EXISTS idx_submission_cache_next_fetch ON public.submission_cache (next_fetch_at);

ALTER TABLE public.submission_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS submission_cache_select_all ON public.submission_cache;
CREATE POLICY submission_cache_select_all ON public.submission_cache
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS submission_cache_insert_update ON public.submission_cache;
CREATE POLICY submission_cache_insert_update ON public.submission_cache
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY submission_cache_insert_update_anon ON public.submission_cache
    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY submission_cache_update_all ON public.submission_cache
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Function to clean old cache entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.clean_submission_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.submission_cache
    WHERE updated_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Auto-cleanup: runs every 30 minutes
-- Note: Requires pg_cron extension or external scheduler
