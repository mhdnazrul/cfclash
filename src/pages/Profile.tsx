import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, ExternalLink, Bug, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GITHUB_ISSUES_URL } from "@/lib/site";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingFallback } from "@/components/common/LoadingFallback";

interface LbRow {
  total_points: number;
  total_battles: number;
  wins: number;
  losses: number;
}

const Profile = () => {
  const { user, profile, loading, isProfileComplete } = useAuth();
  const [lb, setLb] = useState<LbRow | null>(null);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLbLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("total_points, total_battles, wins, losses")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (cancelled) return;
      
      if (error) {
        console.error("Profile leaderboard query error:", error);
      } else {
        setLb(data as LbRow | null);
      }
      setLbLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <PageLayout>
        <LoadingFallback message="Loading profile..." />
      </PageLayout>
    );
  }
  
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (!isProfileComplete) return <Navigate to="/auth/complete-profile" replace />;

  return (
    <PageLayout>
      <section className="w-full px-4 sm:px-6 py-10 max-w-3xl mx-auto">
        <div className="glass-card rounded-2xl border border-border/80 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="w-20 h-20 rounded-2xl border-2 border-cyan-500/30">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg rounded-2xl bg-muted">
                {(profile?.cf_handle ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1">
              <h1 className="text-2xl font-bold text-foreground truncate">{profile?.cf_handle ?? "Player"}</h1>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <a
                href={`https://codeforces.com/profile/${profile?.cf_handle ?? ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline mt-2"
              >
                Codeforces profile <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {lbLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : (
              <>
                <div className="rounded-xl bg-background/60 border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">Points</p>
                  <p className="text-xl font-bold text-foreground">{lb?.total_points ?? profile?.total_points ?? 0}</p>
                </div>
                <div className="rounded-xl bg-background/60 border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">Battles</p>
                  <p className="text-xl font-bold">{lb?.total_battles ?? 0}</p>
                </div>
                <div className="rounded-xl bg-background/60 border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">Wins</p>
                  <p className="text-xl font-bold text-emerald-400">{lb?.wins ?? 0}</p>
                </div>
                <div className="rounded-xl bg-background/60 border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">Losses</p>
                  <p className="text-xl font-bold text-red-400">{lb?.losses ?? 0}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <Button asChild variant="outline" className="rounded-xl border-cyan-500/40 text-cyan-400">
              <Link to="/profile/points" className="gap-2">
                <Award className="w-4 h-4" /> Points system
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/settings" className="gap-2">
                <Settings className="w-4 h-4" /> Settings
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => window.open(GITHUB_ISSUES_URL, "_blank", "noopener,noreferrer")}
            >
              <Bug className="w-4 h-4 mr-2" /> Report an issue
            </Button>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Profile;
