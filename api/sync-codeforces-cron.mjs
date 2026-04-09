import { createClient } from "@supabase/supabase-js";
import { runFullSync } from "../scripts/cf-sync-core.mjs";

/**
 * Vercel Serverless Function — scheduled via vercel.json `crons`.
 * Set env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (recommended).
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).setHeader("Allow", "GET, POST").end("Method Not Allowed");
    return;
  }

  const onVercel = process.env.VERCEL === "1";
  const secret = process.env.CRON_SECRET;
  if (onVercel && !secret) {
    res.status(503).json({
      ok: false,
      error: "CRON_SECRET must be set in Vercel project env for this endpoint",
    });
    return;
  }
  if (secret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(500).json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    return;
  }

  try {
    const supabase = createClient(url, key);
    const { contestsN, problemsN } = await runFullSync(supabase);
    res.status(200).json({ ok: true, contestsN, problemsN });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: message });
  }
}
