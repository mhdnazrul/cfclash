import { useEffect, useState } from "react";
import { User, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CfUser {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  avatar: string;
}

function getRatingColor(rating: number): string {
  if (rating >= 3000) return "text-destructive";
  if (rating >= 2600) return "text-destructive/90";
  if (rating >= 2400) return "text-destructive/80";
  if (rating >= 2100) return "text-chart-5";
  if (rating >= 1900) return "text-accent";
  if (rating >= 1600) return "text-primary";
  if (rating >= 1400) return "text-[hsl(187,92%,69%)]";
  if (rating >= 1200) return "text-[hsl(120,50%,50%)]";
  return "text-muted-foreground";
}

export function ProfileCard() {
  const { profile } = useAuth();
  const [cfUser, setCfUser] = useState<CfUser | null>(null);

  useEffect(() => {
    if (!profile?.cf_handle) return;
    let cancelled = false;
    fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(profile.cf_handle)}`)
      .then(r => {
        if (!r.ok) throw new Error(`CF API ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data.status === "OK" && data.result?.[0]) {
          const u = data.result[0];
          setCfUser({ handle: u.handle, rating: u.rating || 0, maxRating: u.maxRating || 0, rank: u.rank || "Unrated", avatar: u.titlePhoto });
        }
      }).catch((err) => {
        if (!cancelled) console.warn("ProfileCard: CF API error (non-critical):", err.message);
      });
    return () => { cancelled = true; };
  }, [profile?.cf_handle]);

  const displayUser = cfUser || { handle: profile?.cf_handle || "User", rating: 0, maxRating: 0, rank: "Unrated", avatar: "" };

  return (
    <div className="glass-card-hover p-6">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-24 h-24 rounded-full btn-primary-gradient flex items-center justify-center overflow-hidden">
          {displayUser.avatar && !displayUser.avatar.includes("no-title") ? (
            <img src={displayUser.avatar} alt={displayUser.handle} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-primary-foreground" />
          )}
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${getRatingColor(displayUser.rating)}`}>{displayUser.handle}</h2>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium">
            {displayUser.rank}
          </span>
        </div>
        <div className="w-full pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm">Current Rating</p>
              <p className={`text-2xl font-bold ${getRatingColor(displayUser.rating)}`}>{displayUser.rating}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Max Rating</p>
              <p className="text-2xl font-bold text-foreground">{displayUser.maxRating}</p>
            </div>
          </div>
        </div>
        <a href={`https://codeforces.com/profile/${displayUser.handle}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ExternalLink className="w-4 h-4" /> View Codeforces Profile
        </a>
      </div>
    </div>
  );
}
