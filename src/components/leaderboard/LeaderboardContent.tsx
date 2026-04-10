import { useEffect, useState, useCallback } from "react";
import { Trophy, Medal, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  user_id: string; cf_handle: string; total_points: number;
  total_battles: number; wins: number; losses: number;
}

function getRatingColor(rank: number): string {
  if (rank === 1) return "text-chart-5";
  if (rank === 2) return "text-muted-foreground";
  if (rank === 3) return "text-chart-5/70";
  return "text-foreground";
}

export function LeaderboardContent() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .order("total_points", { ascending: false })
      .limit(50);
    if (data) setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const ch = supabase.channel("leaderboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard" }, () => fetchLeaderboard())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLeaderboard]);

  return (
    <section className="w-full px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-chart-5/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-chart-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-muted-foreground">Global rankings based on battle points</p>
          </div>
        </div>

        {loading ? (
          <div className="glass-card overflow-hidden p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">No entries yet. Start battling to appear here!</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Rank</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Handle</th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-muted-foreground">Battles</th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-muted-foreground">W/L</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Points</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.user_id} className="border-b border-border/50 hover:bg-card/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {i < 3 ? (
                          <Medal className={`w-5 h-5 ${getRatingColor(i + 1)}`} />
                        ) : (
                          <span className="text-muted-foreground text-sm w-5 text-center">{i + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <a href={`https://codeforces.com/profile/${e.cf_handle}`} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-foreground hover:text-primary transition-colors">{e.cf_handle}</a>
                    </td>
                    <td className="py-4 px-6 text-center text-muted-foreground">{e.total_battles}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-[hsl(120,50%,50%)]">{e.wins}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-destructive">{e.losses}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="font-bold text-foreground">{e.total_points}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
