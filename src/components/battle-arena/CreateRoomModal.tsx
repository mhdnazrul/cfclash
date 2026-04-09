import { useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import { createRoomWithDifficulties } from "@/lib/cfclash-service";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { toast } from "sonner";
import { RoomCreatedDialog } from "./RoomCreatedDialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Props {
  onClose: () => void;
  onCreated?: (roomId: string) => void;
}

const labels = "ABCDEFGH";

export function CreateRoomModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(45);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [rows, setRows] = useState<string[]>(["800", "1000", "1200"]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    id: string;
    room_code: string;
    display_name: string;
    visibility: "public" | "unlisted";
  } | null>(null);

  const addRow = () => {
    if (rows.length >= 8) return;
    setRows((r) => [...r, "800"]);
  };

  const removeRow = (i: number) => {
    if (rows.length <= 1) return;
    setRows((r) => r.filter((_, j) => j !== i));
  };

  const create = async () => {
    if (!name.trim()) {
      toast.error("Room name is required");
      return;
    }
    if (duration < 1) {
      toast.error("Invalid duration");
      return;
    }
    setLoading(true);
    try {
      const difficulties = rows
        .map((v) => parseInt(v.trim(), 10))
        .filter((v) => Number.isFinite(v) && v >= 800 && v <= 3500);
      if (difficulties.length !== rows.length) {
        toast.error("Use valid difficulty values (e.g. 800, 1000, 1200)");
        setLoading(false);
        return;
      }
      const room = await createRoomWithDifficulties(name.trim(), visibility, duration, difficulties);
      toast.success("Room created");
      onCreated?.(room.id);
      setSuccess({
        id: room.id,
        room_code: room.room_code,
        display_name: room.display_name || name.trim(),
        visibility,
      });
    } catch (e: unknown) {
      toast.error(supabaseErrorMessage(e, "Failed to create room"));
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
        <div className="relative w-full max-w-lg rounded-2xl border border-border bg-[#09101b]/95 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <button type="button" onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground pr-8 mb-6">Create battle room</h2>

          <div className="space-y-4 mb-6">
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Room name</Label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full px-4 py-3 rounded-xl bg-background/80 border border-border text-foreground placeholder:text-muted-foreground"
                placeholder="My duel"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Duration (minutes)</Label>
              <input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 45)}
                className="mt-1.5 w-full px-4 py-3 rounded-xl bg-background/80 border border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wide mb-2 block">Visibility</Label>
              <RadioGroup
                value={visibility}
                onValueChange={(v) => setVisibility(v as "public" | "unlisted")}
                className="flex gap-6"
              >
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="public" />
                  Public (listed)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="unlisted" />
                  Private (unlisted — join by code only)
                </label>

              </RadioGroup>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Problems ({rows.length})</span>
            <button type="button" onClick={addRow} className="text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-background/60 border border-border/80"
              >
                <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">Problem {labels[i]}</span>
                <div className="flex flex-1 flex-wrap gap-2 min-w-0">
                  <input
                    placeholder="Difficulty"
                    value={row}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r, j) => (j === i ? e.target.value : r)))
                    }
                    className="w-28 px-2 py-2 rounded-lg bg-background border border-border text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-destructive p-2 rounded-lg hover:bg-destructive/10 shrink-0 self-end sm:self-center"
                  aria-label="Remove problem"
                >
                  <Minus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void create()}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create room"}
          </button>
        </div>
      </div>

      {success && (
        <RoomCreatedDialog
          open
          roomId={success.id}
          roomCode={success.room_code}
          displayName={success.display_name}
          visibility={success.visibility}
          onClose={() => {
            setSuccess(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
