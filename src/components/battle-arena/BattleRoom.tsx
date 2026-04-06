import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props { roomId: string; onLeave: () => void; }

export function BattleRoom({ roomId, onLeave }: Props) {
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    (supabase as any).from("rooms").select("*").eq("id", roomId).single().then(({ data }: any) => setRoom(data));
  }, [roomId]);

  if (!room) return <div className="py-20 text-center text-muted-foreground">Loading room...</div>;

  return (
    <section className="w-full px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={onLeave} className="flex items-center gap-2 text-muted-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Back to Arena</button>
        <div className="glass-card p-6 mb-6">
          <h2 className="text-2xl font-bold">{room.room_code}</h2>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Problems</h3>
          <div className="space-y-2">
            {(room.problem_set || []).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-card/30">
                <span className="text-sm font-mono font-bold w-6">{String.fromCharCode(65 + i)}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{p.rating}</span>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[hsl(187,92%,69%)] hover:underline flex items-center gap-1">
                  {p.title}
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
