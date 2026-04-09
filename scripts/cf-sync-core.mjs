/**
 * Shared Codeforces → Supabase upsert logic for CLI sync and Vercel cron.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */

function contestTypeFromName(name) {
  const n = name || "";
  if (n.includes("Div. 1 + Div. 2")) return "Combined";
  if (n.includes("Div. 1")) return "Div1";
  if (n.includes("Div. 2")) return "Div2";
  if (n.includes("Div. 3")) return "Div3";
  if (n.includes("Div. 4")) return "Div4";
  if (n.includes("Educational")) return "Educational";
  if (n.includes("Global")) return "Global";
  return "Other";
}

/** @returns {Promise<number>} rows upserted */
export async function syncProblems(supabase) {
  const res = await fetch("https://codeforces.com/api/problemset.problems");
  const data = await res.json();
  if (data.status !== "OK") throw new Error(data.comment || "Codeforces problemset.problems failed");

  const problems = data.result.problems
    .filter((p) => p.contestId && p.index && p.name && p.rating)
    .map((p) => ({
      contest_id: p.contestId,
      problem_index: p.index,
      name: p.name,
      difficulty: p.rating,
      link: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
    }));

  let n = 0;
  for (let i = 0; i < problems.length; i += 1000) {
    const batch = problems.slice(i, i + 1000);
    const { error } = await supabase.from("problems").upsert(batch, {
      onConflict: "contest_id,problem_index",
    });
    if (error) throw error;
    n += batch.length;
  }
  return n;
}

/**
 * Columns aligned with src/services/contests.ts (contest_id, duration_seconds, start_time_seconds, synced_at).
 * @returns {Promise<number>} rows upserted
 */
export async function syncContests(supabase) {
  const res = await fetch("https://codeforces.com/api/contest.list?gym=false");
  const data = await res.json();
  if (data.status !== "OK") throw new Error(data.comment || "Codeforces contest.list failed");

  const now = new Date().toISOString();
  const rows = data.result.map((c) => ({
    contest_id: c.id,
    name: c.name,
    type: contestTypeFromName(c.name),
    phase: c.phase,
    duration_seconds: c.durationSeconds ?? 0,
    start_time_seconds: c.startTimeSeconds ?? null,
    synced_at: now,
  }));

  let n = 0;
  const chunk = 500;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const { error } = await supabase.from("contests").upsert(batch, { onConflict: "contest_id" });
    if (error) throw error;
    n += batch.length;
  }
  return n;
}

export async function runFullSync(supabase) {
  const contestsN = await syncContests(supabase);
  const problemsN = await syncProblems(supabase);
  return { contestsN, problemsN };
}
