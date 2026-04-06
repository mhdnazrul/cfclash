import { useState, useEffect } from "react";
import { ContestFilters } from "./ContestFilters";
import { ContestCard } from "./ContestCard";

interface Contest {
  id: number; name: string; type: string; phase: string;
  durationSeconds: number; startTimeSeconds: number;
}

export function ContestsContent() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [division, setDivision] = useState("all");
  const [year, setYear] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://codeforces.com/api/contest.list?gym=false")
      .then(r => r.json())
      .then(data => {
        if (data.status === "OK") {
          setContests(data.result.filter((c: Contest) => c.phase === "FINISHED").slice(0, 200));
        }
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const getDivision = (name: string) => {
    if (name.includes("Div. 1") && !name.includes("Div. 2")) return "Div. 1";
    if (name.includes("Div. 2")) return "Div. 2";
    if (name.includes("Div. 3")) return "Div. 3";
    if (name.includes("Div. 4")) return "Div. 4";
    if (name.includes("Educational")) return "Educational";
    return "Other";
  };

  const filtered = contests
    .filter(c => {
      const div = getDivision(c.name);
      if (division !== "all" && div !== division) return false;
      if (year !== "all" && new Date(c.startTimeSeconds * 1000).getFullYear() !== parseInt(year)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return b.startTimeSeconds - a.startTimeSeconds;
      if (sortBy === "oldest") return a.startTimeSeconds - b.startTimeSeconds;
      return 0;
    });

  return (
    <section className="w-full px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Codeforces Contests</h1>
          <p className="text-muted-foreground">Browse and filter past Codeforces contests</p>
        </div>
        <ContestFilters division={division} setDivision={setDivision} year={year} setYear={setYear} sortBy={sortBy} setSortBy={setSortBy} />
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading contests...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filtered.map(c => <ContestCard key={c.id} contest={c} division={getDivision(c.name)} />)}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16"><p className="text-muted-foreground">No contests found matching your filters.</p></div>
        )}
      </div>
    </section>
  );
}
