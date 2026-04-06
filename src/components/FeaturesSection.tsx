import { Link } from "react-router-dom";
import { ListChecks, Swords, Trophy } from "lucide-react";

const features = [
  {
    icon: ListChecks,
    title: "Contest List",
    description: "Browse and filter Codeforces contests by division and year",
    href: "/contests",
  },
  {
    icon: Swords,
    title: "Battle Arena",
    description: "Create or join real-time competitive battles",
    href: "/battle-arena",
  },
  {
    icon: Trophy,
    title: "Leaderboard",
    description: "Track rankings and compete for the top spot",
    href: "/leaderboard",
  },
];

export function FeaturesSection() {
  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Explore <span className="gradient-text-cyan">cfclash</span>
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          Track. Compete. Improve.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Link
              key={i}
              to={f.href}
              className="group glass-card-hover p-8 hover:shadow-[0_0_40px_hsl(217_91%_60%/0.15)]"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <f.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
                <span className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300">
                  Explore &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
