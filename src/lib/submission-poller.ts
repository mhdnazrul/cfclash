import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface CfSubmission {
  id: number;
  creationTimeSeconds: number;
  problem: { contestId?: number; problemsetName?: string; index: string; name: string };
  verdict?: string;
  author: { members: { handle: string }[] };
}

export interface CachedSubmission {
  cf_handle: string;
  submissions: CfSubmission[];
  fetched_at: string;
  next_fetch_at: string;
}

const POLL_INTERVAL_MS = 60_000;      // 60 seconds between polls
const CACHE_TTL_MS = 90_000;           // Cache valid for 90 seconds
const MAX_BACKOFF_MS = 300_000;         // Max 5 minutes backoff
const BASE_DELAY_MS = 1000;            // 1 second base delay for retry
const MAX_RETRIES = 3;

interface BackoffState {
  handle: string;
  backoffUntil: number;
  retryCount: number;
}

const backoffMap = new Map<string, BackoffState>();

function getJitter(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * baseMs * 0.3);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithBackoff(
  url: string,
  handle: string,
  retryCount = 0
): Promise<Response> {
  const backoff = backoffMap.get(handle);
  if (backoff && Date.now() < backoff.backoffUntil) {
    const waitTime = backoff.backoffUntil - Date.now();
    console.log(`[CF-POLL] Backoff active for ${handle}, waiting ${waitTime}ms`);
    await sleep(waitTime);
  }

  const response = await fetch(url);

  if (response.status === 403 || response.status === 429) {
    const newRetryCount = retryCount + 1;
    if (newRetryCount > MAX_RETRIES) {
      console.error(`[CF-POLL] Max retries exceeded for ${handle}, giving up`);
      throw new Error(`CF API rate limited: ${response.status}`);
    }

    const backoffMs = getJitter(Math.min(BASE_DELAY_MS * Math.pow(2, newRetryCount), MAX_BACKOFF_MS));
    backoffMap.set(handle, {
      handle,
      backoffUntil: Date.now() + backoffMs,
      retryCount: newRetryCount,
    });

    console.warn(`[CF-POLL] Rate limited for ${handle}, backing off ${backoffMs}ms (retry ${newRetryCount}/${MAX_RETRIES})`);
    await sleep(backoffMs);
    return fetchWithBackoff(url, handle, newRetryCount);
  }

  if (response.status >= 500) {
    const newRetryCount = retryCount + 1;
    if (newRetryCount > MAX_RETRIES) {
      throw new Error(`CF API server error: ${response.status}`);
    }
    const backoffMs = getJitter(BASE_DELAY_MS * Math.pow(2, newRetryCount));
    console.warn(`[CF-POLL] Server error ${response.status} for ${handle}, retrying in ${backoffMs}ms`);
    await sleep(backoffMs);
    return fetchWithBackoff(url, handle, newRetryCount);
  }

  if (backoffMap.has(handle)) {
    backoffMap.delete(handle);
  }

  return response;
}

async function fetchUserSubmissions(handle: string): Promise<CfSubmission[]> {
  const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=0&count=100`;
  
  const response = await fetchWithBackoff(url, handle);

  if (!response.ok) {
    throw new Error(`CF API HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(data.comment || "CF API returned FAILED status");
  }

  return data.result as CfSubmission[];
}

export async function getCachedSubmissions(
  supabase: SupabaseClient,
  handle: string
): Promise<{ submissions: CfSubmission[]; isStale: boolean }> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("submission_cache")
    .select("submissions, fetched_at, next_fetch_at")
    .eq("cf_handle", handle)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error(`[CF-POLL] Cache query error for ${handle}:`, error);
  }

  if (!data || !data.submissions) {
    return { submissions: [], isStale: true };
  }

  const nextFetchAt = new Date(data.next_fetch_at).getTime();
  const isStale = Date.now() > nextFetchAt;

  return {
    submissions: data.submissions as CfSubmission[],
    isStale,
  };
}

export async function updateSubmissionCache(
  supabase: SupabaseClient,
  handle: string,
  submissions: CfSubmission[]
): Promise<void> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const nextFetchAt = new Date(now.getTime() + POLL_INTERVAL_MS).toISOString();

  const { error } = await supabase
    .from("submission_cache")
    .upsert({
      cf_handle: handle,
      submissions: submissions as unknown as string,
      fetched_at: fetchedAt,
      next_fetch_at: nextFetchAt,
      updated_at: fetchedAt,
    }, {
      onConflict: "cf_handle",
    });

  if (error) {
    console.error(`[CF-POLL] Failed to update cache for ${handle}:`, error);
    throw error;
  }
}

export async function pollAndCacheSubmission(
  supabase: SupabaseClient,
  handle: string
): Promise<CfSubmission[]> {
  try {
    console.log(`[CF-POLL] Fetching submissions for ${handle}...`);
    const submissions = await fetchUserSubmissions(handle);
    await updateSubmissionCache(supabase, handle, submissions);
    console.log(`[CF-POLL] Cached ${submissions.length} submissions for ${handle}`);
    return submissions;
  } catch (error) {
    console.error(`[CF-POLL] Failed to poll ${handle}:`, error);
    throw error;
  }
}

export interface PollResult {
  handle: string;
  submissions: CfSubmission[];
  success: boolean;
  error?: string;
}

export async function pollMultipleHandles(
  supabase: SupabaseClient,
  handles: string[]
): Promise<PollResult[]> {
  const results: PollResult[] = [];
  const uniqueHandles = [...new Set(handles.filter(h => h && !h.startsWith("user_")))];

  for (const handle of uniqueHandles) {
    try {
      const submissions = await pollAndCacheSubmission(supabase, handle);
      results.push({ handle, submissions, success: true });
    } catch (error) {
      const cached = await getCachedSubmissions(supabase, handle);
      results.push({
        handle,
        submissions: cached.submissions,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (uniqueHandles.indexOf(handle) < uniqueHandles.length - 1) {
      await sleep(getJitter(500));
    }
  }

  return results;
}

export async function warmCacheForBattle(
  supabase: SupabaseClient,
  participants: { cf_handle: string }[]
): Promise<void> {
  const handles = participants
    .map(p => p.cf_handle)
    .filter(h => h && !h.startsWith("user_"));

  if (handles.length === 0) return;

  const uniqueHandles = [...new Set(handles)];
  
  for (const handle of uniqueHandles) {
    const { isStale } = await getCachedSubmissions(supabase, handle);
    if (isStale) {
      try {
        await pollAndCacheSubmission(supabase, handle);
      } catch {
        console.warn(`[CF-POLL] Failed to warm cache for ${handle}`);
      }
      await sleep(getJitter(500));
    }
  }
}

export function clearBackoff(handle: string): void {
  backoffMap.delete(handle);
}

export function clearAllBackoffs(): void {
  backoffMap.clear();
}
