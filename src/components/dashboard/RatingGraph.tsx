import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface RatingEntry { contest: string; rating: number; date: string; }

export function RatingGraph() {
  const { profile } = useAuth();
  const [data, setData] = useState<RatingEntry[]>([]);

  useEffect(() => {
    if (!profile?.cf_handle) return;
    let cancelled = false;
    fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(profile.cf_handle)}`)
      .then(r => {
        if (!r.ok) throw new Error(`CF API ${r.status}`);
        return r.json();
      })
      .then(res => {
        if (cancelled) return;
        if (res.status === "OK") {
          const entries = res.result.slice(-15).map((r: any) => ({
            contest: r.contestName.substring(0, 20),
            rating: r.newRating,
            date: new Date(r.ratingUpdateTimeSeconds * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          }));
          setData(entries);
        }
      }).catch((err) => {
        if (!cancelled) console.warn("RatingGraph: CF API error (non-critical):", err.message);
      });
    return () => { cancelled = true; };
  }, [profile?.cf_handle]);

  const ratingBands = [
    { rating: 1200, color: "#22c55e" }, { rating: 1400, color: "#06b6d4" },
    { rating: 1600, color: "#3b82f6" }, { rating: 1900, color: "#8b5cf6" },
    { rating: 2100, color: "#f97316" }, { rating: 2400, color: "#ef4444" },
  ];

  return (
    <div className="glass-card-hover p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Rating History</h3>
      <div className="h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(222, 47%, 8%)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '8px', color: '#e2e8f0' }} />
              {ratingBands.map(b => <ReferenceLine key={b.rating} y={b.rating} stroke={b.color} strokeDasharray="3 3" strokeOpacity={0.3} />)}
              <Line type="monotone" dataKey="rating" stroke="url(#ratingGradient)" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#60a5fa' }} />
              <defs>
                <linearGradient id="ratingGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No rating data available
          </div>
        )}
      </div>
    </div>
  );
}
