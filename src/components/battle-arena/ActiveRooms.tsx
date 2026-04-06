import { useEffect, useState } from "react";
import { Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props { onJoinRoom: (id: string) => void; }

export function ActiveRooms({ onJoinRoom }: Props) {
  const [rooms, setRooms] = useState<any[]>([]);

  const fetchRooms = async () => {
    const { data } = await (supabase as any)
      .from("rooms")
      .select("id, room_code, status, duration_minutes, approved_participants")
      .in("status", ["waiting", "active"])
      .order("created_at", { ascending: false })
      .limit(10);
    setRooms(data || []);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  if (rooms.length === 0) return <div className="glass-card p-12 text-center mb-8 text-muted-foreground">No rooms accessible yet.</div>;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((room) => (
        <div key={room.id} className="glass-card-hover p-5 cursor-pointer" onClick={() => onJoinRoom(room.id)}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-lg font-bold text-primary">{room.room_code}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-chart-5/20 text-chart-5">{room.status}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <div className="flex items-center gap-1"><Users className="w-4 h-4" />{(room.approved_participants || []).length}</div>
            <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{room.duration_minutes}m</div>
          </div>
        </div>
      ))}
    </div>
  );
}
