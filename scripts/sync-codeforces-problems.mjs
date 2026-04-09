import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { runFullSync } from "./cf-sync-core.mjs";

dotenv.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  try {
    const { contestsN, problemsN } = await runFullSync(supabase);
    console.log(`✅ Contests upserted: ${contestsN}`);
    console.log(`✅ Problems upserted: ${problemsN}`);
    console.log("🎉 Sync complete");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
