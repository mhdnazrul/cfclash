import { Link } from "react-router-dom";
import { CodeWindow } from "./CodeWindow";
import { Zap } from "lucide-react";

export function HeroSection() {
  return (
    <section className="w-full px-6 py-16 md:py-24">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(187_92%_69%/0.1)] border border-[hsl(187_92%_69%/0.2)]">
            <Zap className="w-4 h-4 text-[hsl(187,92%,69%)]" />
            <span className="text-sm text-[hsl(187,92%,69%)] font-medium">Compete. Improve. Dominate.</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
            Sharpen Your{" "}
            <span className="gradient-text-cyan">Coding Skills</span>
          </h1>

          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md">
            Real-time competitive battles powered by Codeforces data. Create battle rooms, compete 1v1 or in teams, and climb the leaderboard.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/battle-arena"
              className="px-8 py-3 rounded-lg btn-primary-gradient text-primary-foreground font-medium hover:glow-blue transition-all duration-300 flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Start Battle
            </Link>
            <Link
              to="/contests"
              className="px-8 py-3 rounded-lg border border-border glass-card-hover text-foreground font-medium"
            >
              View Contests
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute top-8 right-0 w-[280px] opacity-60">
            <CodeWindow variant="secondary" />
          </div>
          <div className="relative z-10">
            <CodeWindow variant="primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
