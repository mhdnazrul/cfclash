import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PointsDetail = () => {
  const { user, loading, isProfileComplete } = useAuth();

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-20 text-muted-foreground">Loading…</div>
      </PageLayout>
    );
  }
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (!isProfileComplete) return <Navigate to="/auth/complete-profile" replace />;

  return (
    <PageLayout>
      <section className="w-full px-4 sm:px-6 py-8 max-w-2xl mx-auto">
        <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to profile
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">Points system</h1>
        <p className="text-muted-foreground mb-8">How battle points are calculated when a room ends.</p>

        <div className="glass-card rounded-2xl border border-border/80 p-6 space-y-6 text-sm leading-relaxed">
          <p>
            After a battle, each participant receives points from the base formula plus an optional <strong>rank bonus</strong>{" "}
            when enough players competed.
          </p>
          <div className="rounded-xl bg-background/70 border border-border p-4 font-mono text-cyan-300 text-center text-base">
            Points = ((P × 5) + (N × 10)) / T + RankBonus
          </div>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">P</span> — number of participants in the room
            </li>
            <li>
              <span className="text-foreground font-medium">N</span> — number of problems in the room (1–8)
            </li>
            <li>
              <span className="text-foreground font-medium">T</span> — battle duration in minutes
            </li>
            <li>
              <span className="text-foreground font-medium">RankBonus</span> — only when{" "}
              <span className="text-foreground">P ≥ 10</span>: 1st place +10, 2nd +9, …, 10th +1
            </li>
          </ul>
          <p className="text-muted-foreground">
            In the room, standings use <strong>ICPC rules</strong>: more problems solved wins; ties broken by lower penalty (and
            submission timing). Global points above are then applied in rank order after the battle is finalized.
          </p>
        </div>
      </section>
    </PageLayout>
  );
};

export default PointsDetail;
