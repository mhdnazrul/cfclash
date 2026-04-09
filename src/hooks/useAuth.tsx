import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  isProfileComplete: boolean;
  refreshProfile: () => Promise<void>;
}

interface Profile {
  id: string;
  cf_handle: string | null;
  total_points: number;
  win_loss_ratio: number;
  rating_color: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  isProfileComplete: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async (userId: string) => {
    let { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!data) {
      await supabase.from("profiles").upsert({ id: userId } as never);
      const retry = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      data = retry.data;
    }
    setProfile((data as Profile | null) ?? null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const isProfileComplete = Boolean(profile?.cf_handle && profile.cf_handle.trim().length > 0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await fetchProfile(initialSession.user.id);
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        await fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, session, loading, profile, isProfileComplete, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
