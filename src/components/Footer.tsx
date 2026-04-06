import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full px-6 py-12 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-2 h-5 bg-destructive rounded-sm" />
                <div className="w-2 h-5 bg-chart-5 rounded-sm" />
                <div className="w-2 h-5 bg-primary rounded-sm" />
              </div>
              <span className="text-foreground font-semibold text-sm">cfclash</span>
            </Link>
            <p className="text-muted-foreground text-sm">Real-time Competitive Battles</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="text-sm text-muted-foreground">Powered by</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card">
                <div className="w-6 h-6 rounded btn-primary-gradient flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">CF</span>
                </div>
                <span className="text-foreground text-sm font-medium">Codeforces</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-foreground text-sm font-medium">Lovable Cloud</span>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground text-sm">&copy; 2026 cfclash</p>
        </div>
      </div>
    </footer>
  );
}
