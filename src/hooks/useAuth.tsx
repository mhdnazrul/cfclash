import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react";
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

// Generous timeout: if a Supabase query hasn't resolved in 20s, abort.
// The old 8s timeout was too aggressive; no timeout caused indefinite hanging.
const QUERY_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Once profile is successfully loaded, don't clear it on transient errors
  const profileLoadedRef = useRef(false);
  // Track the current user ID to avoid stale closure issues
  const currentUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        QUERY_TIMEOUT_MS
      );

      if (error) {
        console.error("[Auth] fetchProfile error:", error);
        if (!profileLoadedRef.current) setProfile(null);
        return;
      }

      if (!data) {
        // Profile row missing — auto-create (first login)
        console.log("[Auth] No profile row, creating...");
        await withTimeout(
          supabase.from("profiles").upsert({ id: userId } as never),
          QUERY_TIMEOUT_MS
        );

        const { data: retryData } = await withTimeout(
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          QUERY_TIMEOUT_MS
        );

        const p = (retryData as Profile | null) ?? null;
        setProfile(p);
        if (p) profileLoadedRef.current = true;
        console.log("[Auth] Profile created:", p?.cf_handle ?? "no handle");
        return;
      }

      setProfile((data as Profile | null) ?? null);
      profileLoadedRef.current = true;
      console.log("[Auth] Profile loaded:", data.cf_handle ?? "no handle");
    } catch (err) {
      console.error("[Auth] fetchProfile error:", err);
      if (!profileLoadedRef.current) setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = currentUserIdRef.current;
    if (uid) await fetchProfile(uid);
  }, [fetchProfile]);

  const isProfileComplete = Boolean(profile?.cf_handle && profile.cf_handle.trim().length > 0);

  useEffect(() => {
    let isMounted = true;
    // Whether initAuth has completed — onAuthStateChange should NOT
    // fetch profile before this is done (to avoid double-fetch race).
    let initDone = false;

    const initAuth = async () => {
      try {
        const { data: { session: s }, error } = await withTimeout(
          supabase.auth.getSession(),
          QUERY_TIMEOUT_MS
        );
        if (!isMounted) return;
        if (error) console.error("[Auth] getSession error:", error);

        console.log("[Auth] Session:", s ? "exists" : "none");
        setSession(s);
        setUser(s?.user ?? null);
        currentUserIdRef.current = s?.user?.id ?? null;

        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("[Auth] Init error:", err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        initDone = true;
        if (isMounted) setLoading(false);
      }
    };

    // Subscribe to auth events FIRST (Supabase requirement),
    // but DON'T fetch profile from the handler until initAuth completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!isMounted) return;
        console.log("[Auth] Event:", _event);

        if (_event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setProfile(null);
          profileLoadedRef.current = false;
          currentUserIdRef.current = null;
          setLoading(false);
          return;
        }

        // Always update session/user state immediately
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (!initDone) {
          // initAuth hasn't finished yet — it will handle profile fetch.
          // Don't race with it.
          console.log("[Auth] Event before init complete, skipping profile fetch");
          return;
        }

        // After init: only fetch if user changed
        if (nextSession?.user) {
          const prevUid = currentUserIdRef.current;
          currentUserIdRef.current = nextSession.user.id;

          if (!profileLoadedRef.current || prevUid !== nextSession.user.id) {
            await fetchProfile(nextSession.user.id);
          }
        } else {
          setProfile(null);
          profileLoadedRef.current = false;
          currentUserIdRef.current = null;
        }

        setLoading(false);
      }
    );

    // Start init AFTER subscribing (so we don't miss events)
    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isProfileComplete, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
