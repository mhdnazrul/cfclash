import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function CompleteProfileForm() {
  const [cfHandle, setCfHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfHandle.trim() || !user) return;
    setLoading(true);
    const { error } = await (supabase as any).from("profiles").upsert({ id: user.id, cf_handle: cfHandle.trim() });
    if (error) toast.error(error.message);
    else {
      await (supabase as any).from("leaderboard").upsert({ user_id: user.id, cf_handle: cfHandle.trim() }, { onConflict: "user_id" });
      await refreshProfile();
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-md mx-auto glass-card p-8">
        <h1 className="text-3xl font-bold mb-4">Complete Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Code className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="text" value={cfHandle} onChange={(e) => setCfHandle(e.target.value)} placeholder="Codeforces handle" className="w-full pl-12 pr-4 py-3 rounded-lg bg-background/50 border border-border" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg btn-primary-gradient text-primary-foreground">{loading ? "Saving..." : "Complete Profile"}</button>
        </form>
      </div>
    </section>
  );
}
