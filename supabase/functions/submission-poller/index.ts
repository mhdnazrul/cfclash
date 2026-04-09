import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

interface CfSubmission {
  id: number;
  creationTimeSeconds: number;
  problem: { contestId?: number; index: string; name: string };
  verdict?: string;
  author: { members: { handle: string }[] };
}

const POLL_INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 300_000;
const BASE_DELAY_MS = 1000;
const MAX_RETRIES = 3;

const backoffMap = new Map<string, number>();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { handles, battle_id } = await req.json();

    if (!handles || !Array.isArray(handles) || handles.length === 0) {
      return Response.json(
        { error: "handles array is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    const uniqueHandles = [...new Set(handles.filter(h => h && !h.startsWith("user_")))];
    const results: Record<string, { submissions: CfSubmission[]; error?: string }> = {};

    for (const handle of uniqueHandles) {
      const result = await pollWithBackoff(handle);
      results[handle] = result;

      await updateCache(supabase, handle, result.submissions);

      if (uniqueHandles.indexOf(handle) < uniqueHandles.length - 1) {
        await delay(500 + Math.random() * 500);
      }
    }

    return Response.json({
      success: true,
      battle_id,
      results,
      polled_at: new Date().toISOString(),
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("Poll error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

async function pollWithBackoff(handle: string): Promise<{ submissions: CfSubmission[]; error?: string }> {
  const backoffUntil = backoffMap.get(handle);
  if (backoffUntil && Date.now() < backoffUntil) {
    await delay(backoffUntil - Date.now());
  }

  let lastError: Error | null = null;
  
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    if (retry > 0) {
      const backoffMs = Math.min(BASE_DELAY_MS * Math.pow(2, retry), MAX_BACKOFF_MS);
      const jitter = Math.random() * backoffMs * 0.3;
      backoffMap.set(handle, Date.now() + backoffMs + jitter);
      await delay(backoffMs + jitter);
    }

    try {
      const response = await fetch(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=0&count=100`,
        {
          headers: {
            "User-Agent": "CFClash/1.0 (contact@cfclash.app)",
            "Accept": "application/json",
          },
        }
      );

      if (response.status === 403 || response.status === 429) {
        lastError = new Error(`Rate limited: ${response.status}`);
        continue;
      }

      if (response.status >= 500) {
        lastError = new Error(`Server error: ${response.status}`);
        continue;
      }

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.status !== "OK") {
        lastError = new Error(data.comment || "CF API error");
        continue;
      }

      backoffMap.delete(handle);
      return { submissions: data.result };

    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  backoffMap.delete(handle);
  return { submissions: [], error: lastError?.message };
}

async function updateCache(
  supabase: SupabaseClient,
  handle: string,
  submissions: CfSubmission[]
): Promise<void> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const nextFetchAt = new Date(now.getTime() + POLL_INTERVAL_MS).toISOString();

  await supabase
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
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
