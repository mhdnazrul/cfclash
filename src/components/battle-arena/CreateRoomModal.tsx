import { useState } from "react";
import { X } from "lucide-react";
import { createBattleRoom } from "@/lib/cfclash-service";
import { toast } from "sonner";

interface Props { onClose: () => void; onCreated: (roomId: string) => void; }

export function CreateRoomModal({ onClose, onCreated }: Props) {
  const [duration, setDuration] = useState(45);
  const [ratings, setRatings] = useState("800,1000,1200");
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card bg-background/95 p-6">
        <button onClick={onClose} className="absolute top-4 right-4"><X className="w-5 h-5" /></button>
        <h2 className="text-2xl font-bold mb-4">Create Room</h2>
        <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 45)} className="w-full px-4 py-3 rounded-lg bg-card/50 border border-border mb-3" />
        <input value={ratings} onChange={(e) => setRatings(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-card/50 border border-border mb-4" />
        <button onClick={async () => {
          setLoading(true);
          try {
            const room = await createBattleRoom(duration, ratings.split(",").map((r) => parseInt(r.trim())).filter(Boolean));
            onCreated(room.id);
          } catch (e: any) {
            toast.error(e.message || "Failed to create room");
          }
          setLoading(false);
        }} disabled={loading} className="w-full py-3 rounded-lg btn-primary-gradient text-primary-foreground">{loading ? "Creating..." : "Create Room"}</button>
      </div>
    </div>
  );
}
