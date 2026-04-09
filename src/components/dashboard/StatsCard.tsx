import { useEffect, useState } from "react";
import { Swords, Trophy, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function StatsCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ battles: 0, wins: 0, points: 0, winRate: "0%" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase
      .from("leaderboard")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        
        if (error) {
          console.error("StatsCard query error:", error);
        } else if (data) {
          const total = data.wins + data.losses;
          setStats({
            battles: data.total_battles ?? 0,
            wins: data.wins ?? 0,
            points: data.total_points ?? 0,
            winRate: total > 0 ? `${Math.round((data.wins / total) * 100)}%` : "0%",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const items = [
    { icon: Swords, label: "Total Battles", value: stats.battles, color: "text-accent" },
    { icon: Trophy, label: "Wins", value: stats.wins, color: "text-chart-5" },
    { icon: Target, label: "Win Rate", value: stats.winRate, color: "text-[hsl(187,92%,69%)]" },
    { icon: TrendingUp, label: "Points", value: stats.points, color: "text-primary" },
  ];

  return (
    <div className="glass-card-hover p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Battle Stats</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <item.icon className={`w-8 h-8 mx-auto mb-2 ${item.color}`} />
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
