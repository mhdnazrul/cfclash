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
    // Use Supabase SDK to call edge function — handles JWT auth automatically
    const { error } = await supabase.functions.invoke("submission-poller", {
      body: {
        handles: uniqueHandles,
        battle_id: battleId,
      },
    });

    if (error) {
      console.error("Poll request failed:", error.message);
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
