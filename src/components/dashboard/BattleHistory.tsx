import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Clock } from "lucide-react";

interface Battle { id: string; room_code: string; status: string; created_at: string; }

export function BattleHistory() {
  const { user } = useAuth();
  const [battles, setBattles] = useState<Battle[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("room_participants")
      .select("room_id, rooms(id, room_code, status, created_at)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) {
          setBattles(data.map((d: any) => ({
            id: d.rooms.id,
            room_code: d.rooms.room_code,
            status: d.rooms.status,
            created_at: d.rooms.created_at,
          })));
        }
      });
  }, [user]);

  return (
    <div className="glass-card-hover p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Battles</h3>
      {battles.length === 0 ? (
        <p className="text-muted-foreground text-sm">No battles yet. Join one!</p>
      ) : (
        <div className="space-y-3">
          {battles.map(b => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <Swords className="w-4 h-4 text-accent" />
                <span className="text-sm font-mono text-foreground">{b.room_code}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${b.status === 'active' ? 'bg-[hsl(120,50%,50%)]/20 text-[hsl(120,50%,50%)]' : 'bg-muted text-muted-foreground'}`}>
                  {b.status}
                </span>
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {new Date(b.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
