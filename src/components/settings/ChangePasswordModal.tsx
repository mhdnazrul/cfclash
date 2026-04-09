import { useState } from "react";
import { X, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  email: string | null | undefined;
}

export function ChangePasswordModal({ open, onClose, email }: Props) {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (pw1.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (pw1 !== pw2) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      toast.success("Password updated");
      setPw1("");
      setPw2("");
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/75 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-[#0e121a] p-6 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-foreground mb-6 pr-8">Account</h2>

        <div className="space-y-4 mb-6">
          <div className="flex gap-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium text-foreground truncate">{email ?? "—"}</p>
            </div>
          </div>

          <div className="flex gap-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">New password</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type={show1 ? "text" : "password"}
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShow1(!show1)} className="text-muted-foreground p-1">
                  {show1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Confirm password</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type={show2 ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShow2(!show2)} className="text-muted-foreground p-1">
                  {show2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void submit()}
          className="w-full py-3.5 rounded-full font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Updating…" : "Change password"}
        </button>
      </div>
    </div>
  );
}
