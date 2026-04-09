import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
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

const SESSION_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const initRef = useRef(false);

  const fetchProfile = async (userId: string, timeoutMs = 8000) => {
    try {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        timeoutMs,
        "Profile fetch timeout"
      );
      
      if (error) {
        console.error("fetchProfile select error:", error);
        setProfile(null);
        return;
      }

      if (!data) {
        const { error: upsertErr } = await withTimeout(
          supabase.from("profiles").upsert({ id: userId }),
          timeoutMs,
          "Profile upsert timeout"
        );
        if (upsertErr) {
          console.error("fetchProfile upsert error:", upsertErr);
          setProfile(null);
          return;
        }
        
        const retry = await withTimeout(
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          timeoutMs,
          "Profile retry fetch timeout"
        );
        setProfile((retry.data as Profile | null) ?? null);
        return;
      }
      
      console.log("Profile fetched:", data);
      setProfile((data as Profile | null) ?? null);
    } catch (err) {
      console.error("fetchProfile unexpected error:", err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const isProfileComplete = Boolean(profile?.cf_handle && profile.cf_handle.trim().length > 0);

  const initializeAuth = async (isInitial: boolean) => {
    if (initRef.current && !isInitial) return;
    initRef.current = true;

    try {
      const {
        data: { session: initialSession },
        error: sessionError
      } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_TIMEOUT_MS,
        "Session fetch timeout - continuing without session"
      );
      
      if (sessionError) {
        console.error("Session error:", sessionError);
      }
      console.log("Initial session:", initialSession);

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        await fetchProfile(initialSession.user.id);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Auth init exception:", err);
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (isMounted) {
        console.warn("Auth initialization timeout - forcing loading to false");
        setLoading(false);
      }
    }, SESSION_TIMEOUT_MS + 2000);

    initializeAuth(true).then(() => {
      if (!isMounted) return;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      console.log("Auth state changed:", _event, nextSession);
      
      if (!isMounted) return;
      
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      
      if (nextSession?.user) {
        await fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, session, loading, profile, isProfileComplete, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
