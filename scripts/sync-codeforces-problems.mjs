import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const response = await fetch("https://codeforces.com/api/problemset.problems");
  const payload = await response.json();
  if (payload.status !== "OK") throw new Error("Codeforces API failed");

  const problems = payload.result.problems
    .filter((p) => p.contestId && p.index && p.name && p.rating)
    .map((p) => ({
      id: `${p.contestId}-${p.index}`,
      contest_id: p.contestId,
      problem_index: p.index,
      title: p.name,
      rating: p.rating,
      url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
      tags: p.tags ?? [],
    }));

  for (let i = 0; i < problems.length; i += 1000) {
    const batch = problems.slice(i, i + 1000);
    const { error } = await supabase.from("problems").upsert(batch, { onConflict: "id" });
    if (error) throw error;
  }

  console.log(`Synced ${problems.length} problems.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
