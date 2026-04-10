import { supabase } from "@/integrations/supabase/client";
import type { CfSubmission } from "@/services/codeforces";

const POLL_INTERVAL_MS = 60_000;
const CACHE_TTL_MS = 90_000;

interface CachedSubmissions {
  submissions: CfSubmission[];
  fetched_at: string;
  isStale: boolean;
}

export async function getCachedSubmissions(handle: string): Promise<CachedSubmissions> {
  const { data, error } = await supabase
    .from("submission_cache")
    .select("submissions, fetched_at")
    .eq("cf_handle", handle)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Cache query error:", error);
    return { submissions: [], fetched_at: "", isStale: true };
  }

  if (!data) {
    return { submissions: [], fetched_at: "", isStale: true };
  }

  const fetchedAt = new Date(data.fetched_at).getTime();
  const isStale = Date.now() - fetchedAt > CACHE_TTL_MS;

  return {
    submissions: (data.submissions as CfSubmission[]) || [],
    fetched_at: data.fetched_at,
    isStale,
  };
}

export async function requestPoll(handles: string[], battleId?: string): Promise<void> {
  const uniqueHandles = handles.filter(h => h && !h.startsWith("user_"));
  
  if (uniqueHandles.length === 0) return;

  try {
    // FIX: Supabase edge functions need apikey header + user JWT as Bearer token.
    // The old code used the anon key as Bearer — Supabase rejected it with 401.
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      console.warn("[submission-cache] No session token, cannot call edge function");
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submission-poller`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        handles: uniqueHandles,
        battle_id: battleId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Poll request failed:", response.status, error);
      throw new Error("Failed to trigger poll");
    }

    console.log("Poll triggered for handles:", uniqueHandles);
  } catch (error) {
    console.error("Error requesting poll:", error);
    throw error;
  }
}

export function shouldPoll(isStale: boolean, activeBattleCount: number): boolean {
  if (!isStale) return false;
  return activeBattleCount > 0;
}
