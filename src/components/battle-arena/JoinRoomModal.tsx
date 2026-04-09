import { useState } from "react";
import { X } from "lucide-react";
import { requestJoinRoom } from "@/lib/cfclash-service";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

export function JoinRoomModal({ onClose }: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60" onClick={onClose} />
      <div className="relative w-full max-w-md glass-card bg-background/95 p-6">
        <button onClick={onClose} className="absolute top-4 right-4"><X className="w-5 h-5" /></button>
        <h2 className="text-2xl font-bold mb-2">Join by room code</h2>
        <p className="text-sm text-muted-foreground mb-4">Unlisted rooms / hosts share codes like ROOM-ABC123</p>
        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          className="w-full px-4 py-3 rounded-xl bg-card/50 border border-border mb-4 font-mono"
          placeholder="ROOM-XXXXXX"
        />
        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            try {
              await requestJoinRoom(roomCode.trim());
              toast.success("Join request sent");
              onClose();
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
            setLoading(false);
          }}
          disabled={loading}
          className="w-full py-3 rounded-xl btn-primary-gradient text-primary-foreground font-medium"
        >
          {loading ? "Sending…" : "Request to join"}
        </button>
      </div>
    </div>
  );
}
