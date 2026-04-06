import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";

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

  return (
    <header className="w-full px-6 py-4 relative z-50">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-foreground font-semibold text-sm tracking-tight">cfclash</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => <Link key={link.href} to={link.href} className="text-muted-foreground hover:text-foreground text-sm">{link.label}</Link>)}
        </div>
        <div className="flex items-center gap-4">
          {user && <NotificationBell />}
          {user && isProfileComplete ? (
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-border">
                <span className="text-sm font-medium">{profile?.cf_handle}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 glass-card bg-background/95 border border-border rounded-xl">
                  <div className="py-1">
                    <Link to="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm"><User className="w-4 h-4" /> Profile</Link>
                    <Link to="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm"><Settings className="w-4 h-4" /> Settings</Link>
                  </div>
                  <div className="border-t border-border py-1">
                    <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive"><LogOut className="w-4 h-4" /> Logout</button>
                  </div>
                </div>
              )}
            </div>
          ) : user ? (
            <Link to="/auth/complete-profile" className="hidden md:block px-6 py-2 rounded-full btn-accent-gradient text-primary-foreground text-sm font-medium">Complete Profile</Link>
          ) : (
            <Link to="/auth/signin" className="hidden md:block px-6 py-2 rounded-full btn-accent-gradient text-primary-foreground text-sm font-medium">Sign in</Link>
          )}
          <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>
    </header>
  );
}
