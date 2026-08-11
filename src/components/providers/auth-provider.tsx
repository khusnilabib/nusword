"use client";

/**
 * AuthProvider — wraps the app with auth state.
 *
 * Supports three auth modes (checked in order):
 * 1. Encore mode (NEXT_PUBLIC_API_BASE_URL set) — JWT via Encore backend
 * 2. Supabase mode (NEXT_PUBLIC_SUPABASE_URL set) — Supabase auth
 * 3. Next.js mode (default) — cookie-based JWT auth via /api/auth/* routes
 *
 * Next.js mode is the default and works on Vercel without external services.
 * It uses httpOnly cookies for security (XSS-proof, works with SSR/middleware).
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
  isDevMode: boolean;
  authMode: "nextjs" | "encore" | "supabase";
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/** Dev fallback user. */
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

  const authMode: "nextjs" | "encore" | "supabase" = encoreConfigured
    ? "encore"
    : supabaseConfigured
      ? "supabase"
      : "nextjs";

  // ─── Initial session check ──────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        if (authMode === "nextjs") {
          // Next.js cookie-based auth — call /api/auth/me
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setUser(data.user as User);
          } else {
            if (!cancelled) setUser(null);
          }
        } else if (authMode === "encore") {
          // Encore JWT auth — token in localStorage
          const token = getAuthToken();
          if (!token) {
            if (!cancelled) setUser(null);
            return;
          }
          const res = await fetch(apiUrl("/auth/me"), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setUser(data.user as User);
          } else {
            removeAuthToken();
            if (!cancelled) setUser(null);
          }
        } else if (authMode === "supabase") {
          const supabase = createSupabaseClient();
          if (!supabase) {
            if (!cancelled) setUser(DEV_USER);
            return;
          }
          const { data: { user } } = await supabase.auth.getUser();
          if (!cancelled) setUser(user);

          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
              if (!cancelled) setUser(session?.user ?? null);
            },
          );
          return () => subscription.unsubscribe();
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkSession();
    return () => { cancelled = true; };
  }, [authMode]);

  // ─── Dev mode check ─────────────────────────────────────────────────
  const isDevMode = authMode === "nextjs" && user?.email === "user@nusword.local";

  // ─── signIn ─────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    if (authMode === "encore") {
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
    }

    if (authMode === "supabase") {
      const supabase = createSupabaseClient();
      if (!supabase) return { error: "Supabase not configured" };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    }

    // Next.js mode — cookie-based, no token management needed
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error || "Login failed" };
    }
    const data = await res.json();
    setUser(data.user as User);
    return { error: null };
  };

  // ─── signUp ─────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string, name?: string) => {
    if (authMode === "encore") {
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
    }

    if (authMode === "supabase") {
      const supabase = createSupabaseClient();
      if (!supabase) return { error: "Supabase not configured" };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      return { error: error?.message ?? null };
    }

    // Next.js mode
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error || "Signup failed" };
    }
    const data = await res.json();
    setUser(data.user as User);
    return { error: null };
  };

  // ─── signOut ────────────────────────────────────────────────────────
  const signOut = async () => {
    if (authMode === "encore") {
      const token = getAuthToken();
      if (token) {
        await fetch(apiUrl("/auth/logout"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      removeAuthToken();
    } else if (authMode === "supabase") {
      const supabase = createSupabaseClient();
      if (supabase) await supabase.auth.signOut();
    } else {
      // Next.js mode — clear cookie via API
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    }
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
