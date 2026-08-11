"use client";

/**
 * AuthProvider — wraps the app with auth state.
 *
 * Supports three auth modes (checked in order):
 * 1. Encore mode (NEXT_PUBLIC_API_BASE_URL set) — JWT auth via Encore backend
 * 2. Supabase mode (NEXT_PUBLIC_SUPABASE_URL set) — Supabase auth
 * 3. Dev mode (neither set) — auto-login with placeholder user
 *
 * The provider exposes a unified useAuth() hook regardless of mode.
 */
import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient as createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  isEncoreConfigured,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  apiUrl,
} from "@/lib/api-client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Dev mode: true when neither Encore nor Supabase is configured. */
  isDevMode: boolean;
  /** Which auth backend is active. */
  authMode: "dev" | "supabase" | "encore";
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/** Dev fallback user when no auth backend is configured. */
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

  const encoreConfigured = isEncoreConfigured();
  const supabaseConfigured = isSupabaseConfigured();

  const authMode: "dev" | "supabase" | "encore" = encoreConfigured
    ? "encore"
    : supabaseConfigured
      ? "supabase"
      : "dev";

  const isDevMode = authMode === "dev";

  React.useEffect(() => {
    if (authMode === "dev") {
      setUser(DEV_USER);
      setLoading(false);
      return;
    }

    if (authMode === "encore") {
      // Encore mode — check for stored JWT token.
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Validate token by calling /auth/me.
      fetch(apiUrl("/auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) {
            removeAuthToken();
            setUser(null);
            return;
          }
          const data = await res.json();
          setUser(data.user as User);
        })
        .catch(() => {
          setUser(null);
        })
        .finally(() => setLoading(false));
      return;
    }

    if (authMode === "supabase") {
      const supabase = createSupabaseClient();
      if (!supabase) {
        setUser(DEV_USER);
        setLoading(false);
        return;
      }

      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user);
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }
  }, [authMode]);

  // ─── Encore signIn ──────────────────────────────────────────────────
  const encoreSignIn = async (email: string, password: string) => {
    const res = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.message || data.error || "Login failed" };
    }

    const data = await res.json();
    setAuthToken(data.token);
    setUser(data.user as User);
    return { error: null };
  };

  // ─── Encore signUp ──────────────────────────────────────────────────
  const encoreSignUp = async (email: string, password: string, name?: string) => {
    const res = await fetch(apiUrl("/auth/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.message || data.error || "Signup failed" };
    }

    const data = await res.json();
    setAuthToken(data.token);
    setUser(data.user as User);
    return { error: null };
  };

  // ─── Encore signOut ─────────────────────────────────────────────────
  const encoreSignOut = async () => {
    const token = getAuthToken();
    if (token) {
      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    removeAuthToken();
    setUser(null);
  };

  // ─── Supabase signIn/signUp/signOut ─────────────────────────────────
  const supabaseSignIn = async (email: string, password: string) => {
    const supabase = createSupabaseClient();
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const supabaseSignUp = async (email: string, password: string, name?: string) => {
    const supabase = createSupabaseClient();
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message ?? null };
  };

  const supabaseSignOut = async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  // ─── Unified handlers ───────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    if (authMode === "encore") return encoreSignIn(email, password);
    if (authMode === "supabase") return supabaseSignIn(email, password);
    // Dev mode
    setUser(DEV_USER);
    return { error: null };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    if (authMode === "encore") return encoreSignUp(email, password, name);
    if (authMode === "supabase") return supabaseSignUp(email, password, name);
    // Dev mode
    setUser(DEV_USER);
    return { error: null };
  };

  const signOut = async () => {
    if (authMode === "encore") return encoreSignOut();
    if (authMode === "supabase") return supabaseSignOut();
    // Dev mode
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    loading,
    isDevMode,
    authMode,
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
