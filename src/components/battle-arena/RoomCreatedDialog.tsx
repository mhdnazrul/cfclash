import { X, CheckCircle2, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  open: boolean;
  roomId: string;
  roomCode: string;
  displayName: string;
  visibility?: "public" | "unlisted";
  onClose: () => void;
}

export function RoomCreatedDialog({ open, roomId, roomCode, displayName, visibility = "unlisted", onClose }: Props) {
  const navigate = useNavigate();

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/95 p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Room created!</h2>
            <p className="text-sm text-muted-foreground mt-1">{displayName}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {visibility === "public"
              ? "This room is listed on Battle Arena. Others can open it and send a join request, or use the code."
              : "This room is unlisted. Share the code so others can find it and request to join."}
          </p>
          <div className="flex items-center gap-3 w-full justify-center flex-wrap">
            <span className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">{roomCode}</span>
            <button
              type="button"
              onClick={copy}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-cyan-400 hover:border-cyan-400/50 transition-colors"
              aria-label="Copy room code"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/battle-arena/room/${roomId}`);
            }}
            className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 transition-opacity"
          >
            Enter battle
          </button>
        </div>
      </div>
    </div>
  );
}
