import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Award,
  Bug,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";
import { AppLogo } from "@/components/common/AppLogo";
import { GITHUB_ISSUES_URL } from "@/lib/site";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contests", label: "Contests List" },
  { href: "/battle-arena", label: "Battle Arena" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile, isProfileComplete } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    await supabase.auth.signOut();
    navigate("/");
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const issueLink = () => {
    window.open(GITHUB_ISSUES_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <header className="w-full px-4 sm:px-6 py-4 relative z-50">
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <AppLogo />
          <span className="text-foreground font-semibold text-sm tracking-tight">cfclash</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {user && <NotificationBell />}
          {user && isProfileComplete ? (
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass-card border border-border max-w-[200px]"
              >
                <span className="text-sm font-medium truncate">{profile?.cf_handle}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {profile?.cf_handle ?? "Player"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <User className="w-4 h-4 text-cyan-400" />
                      Profile
                    </Link>
                    <Link
                      to="/profile/points"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <Award className="w-4 h-4 text-cyan-400" />
                      Points system
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-dashed border-border/60 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        issueLink();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-muted/50 transition-colors"
                    >
                      <Bug className="w-4 h-4" />
                      Report an issue
                    </button>
                  </div>
                  <div className="border-t border-dashed border-border/60 py-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : user ? (
            <Link
              to="/auth/complete-profile"
              className="hidden md:inline-flex px-4 sm:px-6 py-2 rounded-full btn-accent-gradient text-primary-foreground text-sm font-medium"
            >
              Complete Profile
            </Link>
          ) : (
            <Link
              to="/auth/signin"
              className="hidden md:inline-flex px-4 sm:px-6 py-2 rounded-full btn-accent-gradient text-primary-foreground text-sm font-medium"
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            className="md:hidden p-2 rounded-lg border border-border text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden mt-4 mx-auto max-w-7xl rounded-xl border border-border bg-card/95 p-4 flex flex-col gap-1 animate-in fade-in duration-200">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="py-3 px-2 text-sm text-foreground border-b border-border/40 last:border-0"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user && isProfileComplete && (
            <>
              <Link to="/profile" className="py-3 px-2 text-sm" onClick={() => setMenuOpen(false)}>
                Profile
              </Link>
              <Link to="/profile/points" className="py-3 px-2 text-sm" onClick={() => setMenuOpen(false)}>
                Points system
              </Link>
              <Link to="/settings" className="py-3 px-2 text-sm" onClick={() => setMenuOpen(false)}>
                Settings
              </Link>
              <button type="button" className="py-3 px-2 text-sm text-left" onClick={() => { issueLink(); setMenuOpen(false); }}>
                Report an issue
              </button>
              <button type="button" className="py-3 px-2 text-sm text-destructive text-left" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          )}
          {user && !isProfileComplete && (
            <Link to="/auth/complete-profile" className="py-3 px-2 text-sm btn-accent-gradient rounded-lg text-center" onClick={() => setMenuOpen(false)}>
              Complete Profile
            </Link>
          )}
          {!user && (
            <Link to="/auth/signin" className="py-3 px-2 text-sm btn-accent-gradient rounded-lg text-center" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
