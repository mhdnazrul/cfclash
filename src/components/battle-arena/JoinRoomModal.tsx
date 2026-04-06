import { useState } from "react";
import { X } from "lucide-react";
import { requestJoinRoom } from "@/lib/cfclash-service";
import { toast } from "sonner";

interface Props { onClose: () => void; onJoined: (_roomId: string) => void; }

export function JoinRoomModal({ onClose }: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60" onClick={onClose} />
      <div className="relative w-full max-w-md glass-card bg-background/95 p-6">
        <button onClick={onClose} className="absolute top-4 right-4"><X className="w-5 h-5" /></button>
        <h2 className="text-2xl font-bold mb-4">Request Join</h2>
        <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} className="w-full px-4 py-3 rounded-lg bg-card/50 border border-border mb-4" placeholder="ROOM-XXXXXX" />
        <button onClick={async () => {
          setLoading(true);
          try {
            await requestJoinRoom(roomCode);
            toast.success("Join request sent");
            onClose();
          } catch (e: any) {
            toast.error(e.message || "Failed");
          }
          setLoading(false);
        }} disabled={loading} className="w-full py-3 rounded-lg btn-primary-gradient text-primary-foreground">{loading ? "Sending..." : "Request to Join"}</button>
      </div>
    </div>
  );
}
