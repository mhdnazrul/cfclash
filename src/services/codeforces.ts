const DEFAULT_BASE = "https://codeforces.com/api";

export function getCfApiBase(): string {
  return (import.meta.env.VITE_CF_API_BASE as string | undefined)?.replace(/\/$/, "") ?? DEFAULT_BASE;
}

export interface CfApiResult<T> {
  status: "OK" | "FAILED";
  result?: T;
  comment?: string;
}

async function cfCall<T>(path: string, params?: Record<string, string>): Promise<T> {
  const base = getCfApiBase();
  const q = params ? new URLSearchParams(params).toString() : "";
  const url = `${base}/${path}${q ? `?${q}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Codeforces HTTP ${res.status}`);
  const data = (await res.json()) as CfApiResult<T>;
  if (data.status !== "OK") throw new Error(data.comment || "Codeforces API error");
  return data.result as T;
}

export interface CfContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  durationSeconds: number;
  startTimeSeconds?: number;
}

export async function fetchContestList(): Promise<CfContest[]> {
  return cfCall<CfContest[]>("contest.list", { gym: "false" });
}

export interface CfUser {
  handle: string;
  titlePhoto?: string;
  rating?: number;
}

export async function fetchUserInfo(handles: string): Promise<CfUser[]> {
  const h = handles.trim();
  if (!h) throw new Error("Handle required");
  return cfCall<CfUser[]>("user.info", { handles: h });
}

export interface CfProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  type?: string;
}

let problemListCache: CfProblem[] | null = null;
let problemListPromise: Promise<CfProblem[]> | null = null;

export async function fetchProblemList(): Promise<CfProblem[]> {
  if (problemListCache) return problemListCache;
  if (!problemListPromise) {
    problemListPromise = cfCall<{ problems: CfProblem[] }>("problemset.problems").then((res) => {
      problemListCache = res.problems ?? [];
      return problemListCache;
    });
  }
  return problemListPromise;
}

/** Resolve a single problem by contest id + index (uses cached problemset list). */
export async function findProblemByContestIndex(
  contestId: number,
  index: string,
): Promise<CfProblem | null> {
  const problems = await fetchProblemList();
  const ix = index.trim().toUpperCase();
  return problems.find((p) => p.contestId === contestId && p.index.toUpperCase() === ix) ?? null;
}

export interface CfSubmission {
  id: number;
  creationTimeSeconds: number;
  problem: { contestId?: number; problemsetName?: string; index: string; name: string };
  verdict?: string;
  author: { members: { handle: string }[] };
}

export async function fetchUserStatus(handle: string, count = 30): Promise<CfSubmission[]> {
  // `from` is 0-based; must start at 0 so the latest submissions are included.
  return cfCall<CfSubmission[]>("user.status", { handle, from: "0", count: String(count) });
}

export function problemKey(contestId: number, index: string): string {
  return `${contestId}-${index.toUpperCase()}`;
}
