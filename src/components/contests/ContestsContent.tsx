import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchContestList } from "@/services/codeforces";
import {
  getContestsCached,
  ensureContestsFresh,
  filterContests,
  syncContestsToSupabase,
  type ContestPhaseFilter,
  type ContestDivisionFilter,
  type ContestSort,
  detectDivision,
  filterByDivision,
  sortContests,
  type ContestView,
} from "@/services/contests";
import { ContestCard } from "./ContestCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const PAGE = 24;

export function ContestsContent() {
  const { user } = useAuth();
  const [contests, setContests] = useState<ContestView[]>([]);
  const [phase, setPhase] = useState<ContestPhaseFilter>("past");
  const [division, setDivision] = useState<ContestDivisionFilter>("all");
  const [sortBy, setSortBy] = useState<ContestSort>("newest");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
        await ensureContestsFresh().catch(() => {});
      }
      const cached = await getContestsCached();
      setStale(cached.stale);
      if (cached.rows.length && !cached.error) {
        setContests(cached.rows);
        setLoading(false);
        return;
      }
      const live = await fetchContestList();
      setContests(live as ContestView[]);
      if (user && live.length) {
        void syncContestsToSupabase().catch(() => {});
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load contests");
      setContests([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const nowSec = Math.floor(Date.now() / 1000);
  const filtered = useMemo(() => {
    const phaseFiltered = filterContests(contests, phase, nowSec) as ContestView[];
    const divisionFiltered = filterByDivision(phaseFiltered, division);
    return sortContests(divisionFiltered, sortBy);
  }, [contests, phase, division, nowSec, sortBy]);

  const slice = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const hasMore = (page + 1) * PAGE < filtered.length;

  const getDivision = (name: string) => {
    const d = detectDivision(name);
    if (d === "div1") return "Div. 1";
    if (d === "div2") return "Div. 2";
    if (d === "div3") return "Div. 3";
    if (d === "div4") return "Div. 4";
    return "Others";
  };

  return (
    <section className="w-full px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Codeforces contests</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            From 2010 to present {stale && <span className="text-amber-400/90">(cache refreshing in background)</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 rounded-xl border border-border/60 bg-background/50 p-3">
          {(["upcoming", "past", "all"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={phase === p ? "default" : "outline"}
              className={phase === p ? "bg-cyan-600 hover:bg-cyan-500" : ""}
              onClick={() => {
                setPhase(p);
                setPage(0);
              }}
            >
              {p === "all" ? "All" : p === "upcoming" ? "Upcoming" : "Past"}
            </Button>
          ))}
          <select
            value={division}
            onChange={(e) => {
              setDivision(e.target.value as ContestDivisionFilter);
              setPage(0);
            }}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          >
            <option value="all">All divisions</option>
            <option value="div1">Div 1</option>
            <option value="div2">Div 2</option>
            <option value="div3">Div 3</option>
            <option value="div4">Div 4</option>
            <option value="others">Others</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              const v = e.target.value as ContestSort;
              setSortBy(v);
              setPage(0);
            }}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="participation" disabled>
              Most Participation (coming soon)
            </option>
          </select>
          {error && (
            <Button type="button" size="sm" variant="destructive" onClick={() => void load()}>
              Retry
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : error && !contests.length ? (
          <div className="glass-card p-12 text-center rounded-xl mt-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => void load()}>Retry</Button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {slice.map((c) => (
                <ContestCard key={c.id} contest={c} division={getDivision(c.name)} />
              ))}
            </div>
            {!slice.length && (
              <div className="text-center py-16 glass-card rounded-xl mt-8">
                <p className="text-muted-foreground mb-4">No contests in this filter.</p>
                <Button variant="outline" onClick={() => void load()}>
                  Refresh
                </Button>
              </div>
            )}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
