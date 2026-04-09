import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Play,
  Shield,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  approveRoomRequest,
  declineRoomRequest,
  startBattle,
  finalizeBattlePoints,
} from "@/lib/cfclash-service";
import { type CfSubmission } from "@/services/codeforces";
import { allocatePointsToRanks, sortIcpc, type IcpcRow } from "@/lib/battleScoring";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCachedSubmissions } from "@/services/submission-cache";

interface RoomData {
  id: string;
  room_code: string;
  display_name: string | null;
  creator_id: string;
  duration_minutes: number;
  status: string;
  started_at: string | null;
  approved_participants: string[] | null;
  visibility: string;
  problem_set: unknown;
}

interface RoomProblem {
  problem_label: string;
  contest_id: number;
  problem_index: string;
  title: string;
  rating: number | null;
  url: string;
  sort_order: number;
}

interface Participant {
  user_id: string;
  cf_handle: string;
  solved_count?: number;
  penalty?: number;
  problem_status?: Record<string, "none" | "try" | "ok">;
  last_submission_time_seconds?: number | null;
}

type ParticipantRow = {
  user_id: string;
  cf_handle: string | null;
  solved_count?: number;
  penalty?: number;
  problem_status?: Record<string, "none" | "try" | "ok">;
  last_submission_time_seconds?: number | null;
  profiles?: { cf_handle: string | null } | null;
};

function resolveParticipantHandle(row: ParticipantRow): string {
  const fromProfile = row.profiles?.cf_handle?.trim();
  const fromRow = row.cf_handle?.trim();
  const h = fromProfile || fromRow;
  if (h) return h;
  return `user_${row.user_id.slice(0, 8)}`;
}

/** Strict: same contest + same problem index + submission during battle (trim index only for whitespace). */
function submissionMatchesRoomProblem(s: CfSubmission, battleStartSec: number, pr: RoomProblem): boolean {
  if (s.creationTimeSeconds < battleStartSec) return false;
  if (s.problem.contestId == null) return false;
  if (Number(s.problem.contestId) !== Number(pr.contest_id)) return false;
  return String(s.problem.index).trim() === String(pr.problem_index).trim();
}

/** Dev-only: compare CF submissions vs room problems (capped per poll). */
function logCfSubmissionMatchDebug(subs: CfSubmission[], battleStartSec: number, probs: RoomProblem[], maxLinePairs: number) {
  if (!import.meta.env.DEV) return;
  let pairs = 0;
  outer: for (const sub of subs) {
    if (sub.creationTimeSeconds < battleStartSec || sub.verdict !== "OK") continue;
    for (const pr of probs) {
      if (pairs >= maxLinePairs) break outer;
      console.log("Checking:", sub.problem.contestId, sub.problem.index);
      console.log("Expected:", pr.contest_id, pr.problem_index);
      pairs += 1;
    }
  }
}

interface PendingReq {
  id: string;
  requester_user_id: string;
}

export function BattleRoom({ roomId }: { roomId: string }) {
  const { user, refreshProfile } = useAuth();
  const finalizeOnceRef = useRef(false);
  const finalizeLockRef = useRef(false);
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [problems, setProblems] = useState<RoomProblem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pending, setPending] = useState<PendingReq[]>([]);
  const [requesterHandles, setRequesterHandles] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  /** problemLabel -> userId -> 'none' | 'try' | 'ok' */
  const [grid, setGrid] = useState<Record<string, Record<string, "none" | "try" | "ok">>>({});
  const [nowTick, setNowTick] = useState(Date.now());
  const [finalizing, setFinalizing] = useState(false);

  const isCreator = user?.id === room?.creator_id;
  const approved = room?.approved_participants ?? [];
  const isParticipant = !!(user?.id && approved.includes(user.id));
  const canWatch = room?.visibility === "public" && !!user?.id;

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoadError(null);
    const { data: r, error: e1 } = await supabase
      .from("rooms" as never)
      .select(
        "id, room_code, display_name, creator_id, duration_minutes, status, started_at, approved_participants, visibility, problem_set",
      )
      .eq("id", roomId)
      .maybeSingle();

    if (e1 || !r) {
      setLoadError("You can’t open this room (private or not found).");
      setRoom(null);
      return;
    }

    const roomRow = r as RoomData;
    const approvedList = roomRow.approved_participants ?? [];
    setRoom(roomRow);

    const { data: rp } = await supabase
      .from("room_problems" as never)
      .select("problem_label, contest_id, problem_index, title, rating, url, sort_order")
      .eq("room_id", roomId)
      .order("sort_order", { ascending: true });

    let plist: RoomProblem[] = (rp as RoomProblem[] | null) ?? [];
    if (!plist.length && Array.isArray(roomRow.problem_set)) {
      plist = (roomRow.problem_set as Record<string, unknown>[]).map((p, i) => {
        const L = String.fromCharCode(65 + i);
        return {
          problem_label: L,
          contest_id: Number((p as { contestId?: number }).contestId ?? 0),
          problem_index: String((p as { index?: string }).index ?? ""),
          title: String((p as { title?: string }).title ?? ""),
          rating: (p as { rating?: number }).rating ?? null,
          url: String((p as { url?: string }).url ?? "#"),
          sort_order: i + 1,
        };
      });
    }
    setProblems(plist);

    const { data: parts } = await supabase
      .from("room_participants" as never)
      .select("user_id, cf_handle, solved_count, penalty, problem_status, last_submission_time_seconds")
      .eq("room_id", roomId);

    const partRows = (parts as Omit<ParticipantRow, "profiles">[] | null) ?? [];
    const uids = [...new Set(partRows.map((p) => p.user_id))];
    const profileMap = new Map<string, string | null>();
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, cf_handle").in("id", uids);
      for (const p of (profs ?? []) as { id: string; cf_handle: string | null }[]) {
        profileMap.set(p.id, p.cf_handle);
      }
    }
    const rawRows: ParticipantRow[] = partRows.map((row) => ({
      ...row,
      profiles: { cf_handle: profileMap.get(row.user_id) ?? null },
    }));
    let plistOut: Participant[] = rawRows.map((row) => ({
      user_id: row.user_id,
      cf_handle: resolveParticipantHandle(row),
      solved_count: row.solved_count,
      penalty: row.penalty,
      problem_status: row.problem_status,
      last_submission_time_seconds: row.last_submission_time_seconds,
    }));

    if (!plistOut.length && approvedList.length) {
      const { data: profRows } = await supabase.from("profiles").select("id, cf_handle").in("id", approvedList);
      const map = new Map<string, string | null>(
        ((profRows ?? []) as { id: string; cf_handle: string | null }[]).map((p) => [p.id, p.cf_handle]),
      );
      plistOut = approvedList.map((uid) => {
        const cf = map.get(uid)?.trim();
        return {
          user_id: uid,
          cf_handle: cf || `user_${uid.slice(0, 8)}`,
          solved_count: 0,
          penalty: 0,
          problem_status: {},
        };
      });
    }
    setParticipants(plistOut);

    const fromDbGrid: Record<string, Record<string, "none" | "try" | "ok">> = {};
    for (const pr of plist) fromDbGrid[pr.problem_label] = {};
    for (const part of plistOut) {
      const ps = (part.problem_status ?? {}) as Record<string, "none" | "try" | "ok">;
      for (const pr of plist) {
        fromDbGrid[pr.problem_label][part.user_id] = ps[pr.problem_label] ?? "none";
      }
    }
    if (Object.keys(fromDbGrid).length) setGrid(fromDbGrid);

    if (roomRow.creator_id === user.id) {
      const { data: reqs } = await supabase
        .from("join_requests" as never)
        .select("id, requester_user_id")
        .eq("room_id", roomId)
        .eq("status", "pending");
      const pr = (reqs as PendingReq[] | null) ?? [];
      setPending(pr);
      const handleMap: Record<string, string> = {};
      const ids = pr.map((q) => q.requester_user_id);
      if (ids.length) {
        const { data: profRows } = await supabase.from("profiles").select("id, cf_handle").in("id", ids);
        for (const p of (profRows ?? []) as { id: string; cf_handle: string | null }[]) {
          const h = p.cf_handle?.trim();
          handleMap[p.id] = h || `user_${p.id.slice(0, 8)}`;
        }
        ids.forEach((id) => {
          if (!handleMap[id]) handleMap[id] = `user_${id.slice(0, 8)}`;
        });
      }
      setRequesterHandles(handleMap);
    } else {
      setPending([]);
    }
  }, [roomId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "join_requests", filter: `room_id=eq.${roomId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, load]);

  const startedSec = room?.started_at ? Math.floor(new Date(room.started_at).getTime() / 1000) : null;
  const battleActive = room?.status === "active" && startedSec != null;

  const secondsLeft = useMemo(() => {
    if (!battleActive || !room) return 0;
    const end = startedSec! + room.duration_minutes * 60;
    return Math.max(0, end - Math.floor(nowTick / 1000));
  }, [battleActive, room, startedSec, nowTick]);

  useEffect(() => {
    if (!battleActive) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [battleActive]);

  const matchSubmissionToProblems = useCallback((subs: CfSubmission[], start: number, probs: RoomProblem[]) => {
    const byLabel: Record<string, "none" | "try" | "ok"> = {};
    for (const pr of probs) {
      byLabel[pr.problem_label] = "none";
      const isSolved = subs.some(
        (sub) => sub.verdict === "OK" && submissionMatchesRoomProblem(sub, start, pr),
      );
      const hasTry = subs.some(
        (sub) =>
          Boolean(sub.verdict) &&
          sub.verdict !== "OK" &&
          submissionMatchesRoomProblem(sub, start, pr),
      );
      byLabel[pr.problem_label] = isSolved ? "ok" : hasTry ? "try" : "none";
    }
    return byLabel;
  }, []);

  const pollSubmissions = useCallback(async () => {
    if (!battleActive || !startedSec || !problems.length || !participants.length) return;
    const nextGrid: Record<string, Record<string, "none" | "try" | "ok">> = {};
    for (const p of problems) nextGrid[p.problem_label] = {};
    const statusPerUser: Record<string, Record<string, "none" | "try" | "ok">> = {};
    const metrics: Record<string, { solved: number; penalty: number; last: number | null }> = {};

    const handles = participants
      .map(p => p.cf_handle?.trim())
      .filter(h => h && !h.startsWith("user_")) as string[];

    if (handles.length > 0) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submission-poller`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ handles, battle_id: roomId }),
          }
        );

        if (!response.ok) {
          console.warn("Failed to trigger poll, using cached data");
        }
      } catch (err) {
        console.warn("Poll trigger failed:", err);
      }
    }

    for (const part of participants) {
      statusPerUser[part.user_id] = {};
      const handle = part.cf_handle?.trim();
      if (!handle || handle.startsWith("user_")) {
        for (const pr of problems) {
          if (!nextGrid[pr.problem_label]) nextGrid[pr.problem_label] = {};
          nextGrid[pr.problem_label][part.user_id] = "none";
          statusPerUser[part.user_id][pr.problem_label] = "none";
        }
        metrics[part.user_id] = { solved: 0, penalty: 0, last: null };
        continue;
      }

      try {
        const cached = await getCachedSubmissions(handle);
        const subs = cached.submissions;

        if (subs.length === 0 && cached.isStale) {
          console.log(`[Battle] No cached data for ${handle}, will be fetched soon`);
        }

        logCfSubmissionMatchDebug(subs, startedSec, problems, 12);
        const byL = matchSubmissionToProblems(subs, startedSec, problems);
        const solvedSubs = subs
          .filter(
            (s) =>
              s.verdict === "OK" &&
              s.creationTimeSeconds >= startedSec &&
              problems.some((pr) => submissionMatchesRoomProblem(s, startedSec, pr)),
          )
          .sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);

        for (const pr of problems) {
          if (!nextGrid[pr.problem_label]) nextGrid[pr.problem_label] = {};
          nextGrid[pr.problem_label][part.user_id] = byL[pr.problem_label] ?? "none";
          statusPerUser[part.user_id][pr.problem_label] = byL[pr.problem_label] ?? "none";
        }
        metrics[part.user_id] = {
          solved: Object.values(byL).filter((v) => v === "ok").length,
          penalty: Object.values(byL).filter((v) => v === "try").length + Object.values(byL).filter((v) => v === "ok").length,
          last: solvedSubs.length ? solvedSubs[solvedSubs.length - 1].creationTimeSeconds : null,
        };
      } catch {
        for (const pr of problems) {
          if (!nextGrid[pr.problem_label]) nextGrid[pr.problem_label] = {};
          nextGrid[pr.problem_label][part.user_id] = "none";
          statusPerUser[part.user_id][pr.problem_label] = "none";
        }
        metrics[part.user_id] = { solved: 0, penalty: 0, last: null };
      }
    }
    setGrid(nextGrid);

    const rowPayload = (p: Participant) => ({
      cf_handle: p.cf_handle?.trim() || "",
      solved_count: metrics[p.user_id]?.solved ?? 0,
      penalty: metrics[p.user_id]?.penalty ?? 0,
      problem_status: statusPerUser[p.user_id] ?? {},
      last_submission_time_seconds: metrics[p.user_id]?.last,
      updated_at: new Date().toISOString(),
    });

    if (isCreator) {
      await Promise.all(
        participants.map((p) =>
          supabase
            .from("room_participants" as never)
            .update(rowPayload(p) as never)
            .eq("room_id", roomId)
            .eq("user_id", p.user_id),
        ),
      );
    } else if (user?.id) {
      const me = participants.find((p) => p.user_id === user.id);
      if (me) {
        await supabase
          .from("room_participants" as never)
          .update(rowPayload(me) as never)
          .eq("room_id", roomId)
          .eq("user_id", user.id);
      }
    }
  }, [battleActive, startedSec, problems, participants, matchSubmissionToProblems, isCreator, roomId, user?.id]);

  useEffect(() => {
    if (!battleActive) return;
    void pollSubmissions();
    const id = setInterval(() => void pollSubmissions(), 60000);
    return () => clearInterval(id);
  }, [battleActive, pollSubmissions]);

  const icpcRows: IcpcRow[] = useMemo(() => {
    return participants.map((p) => {
      const solved = p.solved_count ?? Object.values(p.problem_status ?? {}).filter((v) => v === "ok").length;
      const penalty =
        p.penalty ??
        (Object.values(p.problem_status ?? {}).filter((v) => v === "try").length +
          Object.values(p.problem_status ?? {}).filter((v) => v === "ok").length);
      return {
        userId: p.user_id,
        handle: p.cf_handle,
        solved,
        penalty,
        lastAcSeconds: p.last_submission_time_seconds ?? undefined,
      };
    });
  }, [participants]);

  const sortedIcpc = useMemo(() => sortIcpc(icpcRows), [icpcRows]);

  const runFinalize = useCallback(async () => {
    if (!room || !isCreator || room.status !== "active" || finalizeOnceRef.current || finalizeLockRef.current) return;
    finalizeLockRef.current = true;
    const P = participants.length;
    const N = problems.length;
    const T = room.duration_minutes;
    const ordered = sortedIcpc.map((r) => r.userId);
    const pts = allocatePointsToRanks(ordered, P, N, T);
    const intMap: Record<string, number> = {};
    Object.entries(pts).forEach(([k, v]) => {
      intMap[k] = Math.round(v);
    });
    setFinalizing(true);
    try {
      await finalizeBattlePoints(room.id, intMap);
      finalizeOnceRef.current = true;
      toast.success("Battle finalized & points awarded");
      await refreshProfile();
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Finalize failed");
    } finally {
      finalizeLockRef.current = false;
      setFinalizing(false);
    }
  }, [room, isCreator, participants.length, problems.length, sortedIcpc, refreshProfile, load]);

  useEffect(() => {
    finalizeOnceRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (!battleActive || secondsLeft > 0 || !room || room.status !== "active" || !isCreator) return;
    void runFinalize();
  }, [secondsLeft, battleActive, room?.status, room?.id, isCreator, runFinalize, room]);

  if (loadError) {
    return (
      <section className="w-full px-6 py-16 text-center">
        <p className="text-muted-foreground mb-4">{loadError}</p>
        <Link to="/battle-arena" className="text-cyan-400 hover:underline">
          Back to arena
        </Link>
      </section>
    );
  }

  if (!room) {
    return <div className="py-20 text-center text-muted-foreground">Loading room…</div>;
  }

  const memberOrCreator = isCreator || isParticipant;
  if (!memberOrCreator && !canWatch) {
    return (
      <section className="w-full px-6 py-16 text-center">
        <p className="text-muted-foreground mb-4">Join this room (request access) to see details.</p>
        <Link to="/battle-arena" className="text-cyan-400 hover:underline">
          Back to arena
        </Link>
      </section>
    );
  }

  const nApproved = approved.length;
  const canStart = isCreator && room.status === "waiting" && nApproved >= 2;
  const st = String(room.status).toLowerCase();
  const statusBadge =
    st === "waiting"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
      : st === "active"
        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
        : "bg-muted text-muted-foreground border-border";

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      toast.success("Room code copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <section className="w-full px-4 sm:px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/battle-arena")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to arena
        </button>

        <div className="glass-card rounded-2xl border border-border/80 p-5 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-cyan-400 truncate">{room.display_name || "Battle room"}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full border uppercase font-medium ${statusBadge}`}>{st}</span>
              </div>
              {isCreator && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Room code (share for join)</span>
                  <span className="font-mono text-cyan-300">{room.room_code}</span>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => void copyCode()}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  {nApproved} participants
                </span>
                <span>{room.duration_minutes}m</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              {battleActive && (
                <div className="text-4xl font-mono tabular-nums text-foreground">{fmtTime(secondsLeft)}</div>
              )}
              {isCreator && room.status === "waiting" && (
                <Button
                  type="button"
                  disabled={!canStart}
                  onClick={async () => {
                    try {
                      await startBattle(room.id);
                      toast.success("Battle started");
                      await load();
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Could not start");
                    }
                  }}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-primary-foreground gap-2"
                >
                  <Play className="w-4 h-4" /> Start battle
                </Button>
              )}
              {isCreator && room.status === "active" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={finalizing}
                  onClick={() => void runFinalize()}
                  className="rounded-xl"
                >
                  {finalizing ? "Saving…" : "End & award points"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {isCreator && pending.length > 0 && (
          <div className="glass-card rounded-2xl border border-border/60 p-4 mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Join requests</h3>
            <ul className="space-y-2">
              {pending.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{requesterHandles[q.requester_user_id] ?? q.requester_user_id}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-400 border-emerald-500/40"
                      onClick={async () => {
                        try {
                          await approveRoomRequest(q.id);
                          toast.success("Approved");
                          await load();
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/40"
                      onClick={async () => {
                        try {
                          await declineRoomRequest(q.id);
                          toast.success("Rejected");
                          await load();
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="glass-card rounded-2xl border border-border/60 p-5 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Problems</h3>
          <div className="space-y-2">
            {problems.map((p) => (
              <div key={p.problem_label} className="flex flex-wrap items-center gap-3 py-2 px-3 rounded-xl bg-background/50">
                <span className="text-sm font-mono font-bold w-6">{p.problem_label}</span>
                {p.rating != null && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-primary/15 text-primary font-medium">{p.rating}</span>
                )}
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cyan-400 hover:underline flex items-center gap-1 min-w-0 break-words"
                >
                  {p.title}
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {memberOrCreator && (
          <div className="glass-card rounded-2xl border border-border/60 p-5 overflow-x-auto">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Participants</h3>
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3">Participant</th>
                  {problems.map((p) => (
                    <th key={p.problem_label} className="py-2 px-1 text-center w-10">
                      {p.problem_label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.map((part) => (
                  <tr key={part.user_id} className="border-b border-border/40">
                    <td className="py-3 pr-3 font-medium">{part.cf_handle}</td>
                    {problems.map((p) => {
                      const c = grid[p.problem_label]?.[part.user_id] ?? "none";
                      return (
                        <td key={p.problem_label} className="text-center py-3 px-1">
                          <span
                            className={`inline-flex w-8 h-8 items-center justify-center rounded-full border text-xs ${
                              c === "ok"
                                ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                                : c === "try"
                                  ? "border-amber-500/50 text-amber-400"
                                  : "border-border text-muted-foreground"
                            }`}
                          >
                            {c === "ok" ? "✓" : "✗"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {battleActive && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Updating submissions every 60 seconds (cached)…
              </p>
            )}
          </div>
        )}

        {memberOrCreator && st === "ended" && sortedIcpc.length > 0 && (
          <div className="glass-card rounded-2xl border border-border/60 p-5 mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Final ranking (ICPC order)</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {sortedIcpc.map((r) => (
                <li key={r.userId}>
                  {r.handle} — solved {r.solved}, penalty {r.penalty}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
