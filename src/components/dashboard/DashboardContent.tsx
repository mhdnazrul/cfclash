import { ProfileCard } from "./ProfileCard";
import { StatsCard } from "./StatsCard";
import { RatingGraph } from "./RatingGraph";
import { BattleHistory } from "./BattleHistory";

export function DashboardContent() {
  return (
    <section className="w-full px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Dashboard</h1>
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <ProfileCard />
          <div className="lg:col-span-2">
            <StatsCard />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <RatingGraph />
          <BattleHistory />
        </div>
      </div>
    </section>
  );
}
