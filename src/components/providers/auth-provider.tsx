"use client";

/**
 * AuthProvider — wraps the app with Supabase auth state.
 *
 * Provides the current user (or null) via the useAuth hook.
 * If Supabase is not configured, falls back to a dev user.
 */
import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Dev mode: true when Supabase is not configured. */
  isDevMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/** Dev fallback user when Supabase is not configured. */
const DEV_USER = {
  id: "dev-user",
  aud: "authenticated",
  role: "authenticated",
  email: "user@nusword.local",
  app_metadata: {},
  user_metadata: { name: "Developer" },
  identities: [],
  created_at: new Date().toISOString(),
} as unknown as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const configured = isSupabaseConfigured();

  React.useEffect(() => {
    if (!configured) {
      // Dev mode — use fallback user.
      setUser(DEV_USER);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setUser(DEV_USER);
      setLoading(false);
      return;
    }

    // Get initial session.
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  const signIn = async (email: string, password: string) => {
    if (!configured) {
      // Dev mode — simulate success.
      setUser(DEV_USER);
      return { error: null };
    }
    const supabase = createClient();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    if (!configured) {
      // Dev mode — simulate success.
      setUser(DEV_USER);
      return { error: null };
    }
    const supabase = createClient();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (!configured) {
      setUser(null);
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    loading,
    isDevMode: !configured,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** useAuth — access the current auth state. */
export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
