import { supabase } from "@/integrations/supabase/client";
import { fetchContestList, type CfContest } from "@/services/codeforces";

const TTL_MS = 24 * 60 * 60 * 1000;
const YEAR_START = 2010;

export type ContestPhaseFilter = "upcoming" | "past" | "all";
export type ContestDivisionFilter = "all" | "div1" | "div2" | "div3" | "div4" | "others";
export type ContestSort = "newest" | "oldest" | "participation";

export interface ContestView extends CfContest {
  participantCount?: number | null;
}

function yearFromContest(c: CfContest): number {
  if (c.startTimeSeconds) return new Date(c.startTimeSeconds * 1000).getFullYear();
  return YEAR_START;
}

export async function syncContestsToSupabase(): Promise<number> {
  const list = await fetchContestList();
  const filtered = list.filter((c) => {
    const y = yearFromContest(c);
    return y >= YEAR_START && y <= new Date().getFullYear() + 1;
  });

  const rows = filtered.map((c) => ({
    contest_id: c.id,
    name: c.name,
    type: c.type ?? null,
    phase: c.phase,
    duration_seconds: c.durationSeconds ?? 0,
    start_time_seconds: c.startTimeSeconds ?? null,
    synced_at: new Date().toISOString(),
  }));

  const chunk = 200;
  let n = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await supabase.from("contests").upsert(part, { onConflict: "contest_id" });
    if (error) throw error;
    n += part.length;
  }
  return n;
}

export async function getContestsCached(): Promise<{ rows: ContestView[]; stale: boolean; error?: string }> {
  try {
    const { data: meta } = await supabase
      .from("contests")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const syncedAt = (meta as { synced_at?: string } | null)?.synced_at;
    const stale = !syncedAt || Date.now() - new Date(syncedAt).getTime() > TTL_MS;

    const { data, error } = await supabase
      .from("contests")
      .select("contest_id,name,type,phase,duration_seconds,start_time_seconds,participant_count")
      .order("start_time_seconds", { ascending: false, nullsFirst: false });

    if (error) throw error;

    const rows = (data || []) as {
      contest_id: number;
      name: string;
      type: string | null;
      phase: string;
      duration_seconds: number;
      start_time_seconds: number | null;
      participant_count?: number | null;
    }[];

    if (rows.length === 0) {
      return { rows: [], stale: true };
    }

    const mapped: ContestView[] = rows.map((r) => ({
      id: r.contest_id,
      name: r.name,
      type: r.type || "",
      phase: r.phase,
      durationSeconds: r.duration_seconds,
      startTimeSeconds: r.start_time_seconds ?? undefined,
      participantCount: r.participant_count ?? null,
    }));

    return { rows: mapped, stale };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load contests";
    return { rows: [], stale: true, error: msg };
  }
}

export async function ensureContestsFresh(): Promise<void> {
  const { stale, rows } = await getContestsCached();
  if (rows.length === 0 || stale) {
    try {
      await syncContestsToSupabase();
    } catch {
      /* caller may fallback */
    }
  }
}

export function filterContests(list: CfContest[], phase: ContestPhaseFilter, nowSec: number): CfContest[] {
  let out = list.filter((c) => yearFromContest(c) >= YEAR_START);
  if (phase === "upcoming") {
    out = out.filter((c) => c.phase !== "FINISHED" && (c.startTimeSeconds ?? 0) > nowSec);
  } else if (phase === "past") {
    out = out.filter((c) => c.phase === "FINISHED" || (c.startTimeSeconds ?? 0) <= nowSec);
  }
  return out;
}

function normalizeName(name: string): string {
  return name.toLowerCase();
}

export function detectDivision(name: string): ContestDivisionFilter {
  const n = normalizeName(name);
  if (n.includes("div. 1") || n.includes("div 1")) return "div1";
  if (n.includes("div. 2") || n.includes("div 2")) return "div2";
  if (n.includes("div. 3") || n.includes("div 3")) return "div3";
  if (n.includes("div. 4") || n.includes("div 4")) return "div4";
  return "others";
}

export function filterByDivision(list: ContestView[], division: ContestDivisionFilter): ContestView[] {
  if (division === "all") return list;
  return list.filter((c) => detectDivision(c.name) === division);
}

export function sortContests(list: ContestView[], sort: ContestSort): ContestView[] {
  return [...list].sort((a, b) => {
    if (sort === "oldest") return (a.startTimeSeconds ?? 0) - (b.startTimeSeconds ?? 0);
    if (sort === "participation") return (b.participantCount ?? 0) - (a.participantCount ?? 0);
    return (b.startTimeSeconds ?? 0) - (a.startTimeSeconds ?? 0);
  });
}
