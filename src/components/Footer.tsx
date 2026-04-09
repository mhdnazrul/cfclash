import { Link } from "react-router-dom";
import { Github } from "lucide-react";
import { AppLogo } from "@/components/common/AppLogo";
import { GITHUB_PROFILE_URL, SITE_AUTHOR } from "@/lib/site";

export function Footer() {
  return (
    <footer className="w-full px-6 py-10 sm:py-12 border-t border-border/80">
      <div className="max-w-7xl mx-auto flex flex-col gap-8 sm:gap-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
            <Link to="/" className="flex items-center gap-2.5 group">
              <AppLogo />
              <span className="text-foreground font-semibold text-sm tracking-tight group-hover:text-primary transition-colors">
                cfclash
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm">
              Real-time competitive programming battles on Codeforces-style problems.
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-2">
            <p className="text-sm text-muted-foreground">
              Developed by{" "}
              <span className="text-foreground font-medium">{SITE_AUTHOR}</span>
            </p>
            <a
              href={GITHUB_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub profile
            </a>
          </div>
        </div>
        <p className="text-center sm:text-left text-muted-foreground text-xs">&copy; {new Date().getFullYear()} cfclash</p>
      </div>
    </footer>
  );
}
