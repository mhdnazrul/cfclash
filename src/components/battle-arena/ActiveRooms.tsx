import { useEffect, useState, useCallback } from "react";
import { Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { requestJoinRoomByRoomId } from "@/lib/cfclash-service";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface RoomRow {
  id: string;
  display_name: string | null;
  room_code: string;
  status: string;
  duration_minutes: number;
  creator_id: string;
  approved_participants: string[] | null;
}

interface Props {
  /** @deprecated use navigate internally */
  onJoinRoom?: (id: string) => void;
}

export function ActiveRooms({ onJoinRoom }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    if (!user?.id) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("rooms" as never)
      .select("id, display_name, room_code, status, duration_minutes, creator_id, approved_participants")
      .eq("visibility", "public")
      .in("status", ["waiting", "active"])
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setRooms(data as RoomRow[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    const ch = supabase
      .channel("public-rooms-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => fetchRooms())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchRooms]);

  const goStage = (id: string) => {
    onJoinRoom?.(id);
    navigate(`/battle-arena/room/${id}`);
  };

  const requestJoin = async (e: React.MouseEvent, room: RoomRow) => {
    e.stopPropagation();
    if (!user?.id) return;
    if (room.creator_id === user.id) {
      toast.message("You are the host — open the room to start.");
      goStage(room.id);
      return;
    }
    const parts = room.approved_participants ?? [];
    if (parts.includes(user.id)) {
      goStage(room.id);
      return;
    }
    try {
      await requestJoinRoomByRoomId(room.id);
      toast.success("Join request sent");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not send request";
      if (msg.includes("duplicate") || msg.toLowerCase().includes("pending")) {
        toast.message("Request already pending");
      } else {
        toast.error(msg);
      }
    }
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="glass-card p-12 text-center mb-8 rounded-xl border border-border/60">
        <p className="text-muted-foreground mb-4">No public rooms right now.</p>
        <p className="text-sm text-muted-foreground">Create one or join with a room code.</p>
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    waiting: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    ended: "bg-muted text-muted-foreground",
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((room) => {
        const n = room.approved_participants?.length ?? 0;
        const isMember = user?.id && (room.approved_participants ?? []).includes(user.id);
        const isCreator = user?.id === room.creator_id;
        const st = String(room.status).toLowerCase();
        return (
          <div
            key={room.id}
            role="button"
            tabIndex={0}
            onClick={() => goStage(room.id)}
            onKeyDown={(e) => e.key === "Enter" && goStage(room.id)}
            className="glass-card-hover p-5 rounded-xl border border-border/60 cursor-pointer text-left transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="font-semibold text-lg text-cyan-400 line-clamp-2">
                {room.display_name || "Untitled room"}
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full border capitalize shrink-0 ${statusStyles[st] || statusStyles.waiting}`}
              >
                {st}
              </span>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {n}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {room.duration_minutes}m
              </div>
            </div>
            {!isCreator && !isMember && st === "waiting" && (
              <button
                type="button"
                onClick={(e) => void requestJoin(e, room)}
                className="w-full py-2.5 rounded-lg border border-cyan-500/40 text-cyan-400 text-sm font-medium hover:bg-cyan-500/10"
              >
                Request to join
              </button>
            )}
            {(isCreator || isMember) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goStage(room.id);
                }}
                className="w-full py-2.5 rounded-lg btn-primary-gradient text-primary-foreground text-sm font-medium"
              >
                Open room
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
