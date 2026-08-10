/**
 * Supabase server client — for server components, API routes, and middleware.
 *
 * Uses @supabase/ssr for Next.js App Router compatibility.
 * Reads cookies from the request to maintain session.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}

/**
 * Async version of createClient — required for Next.js 15+ where cookies()
 * returns a Promise. Use this in API routes and server components.
 */
export async function createClientAsync() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}

/**
 * Get the current authenticated user's email from the Supabase session.
 * Returns null if not authenticated or Supabase not configured.
 *
 * Used by API routes to replace the placeholder CURRENT_USER_EMAIL.
 */
export async function getAuthEmail(): Promise<string | null> {
  const client = await createClientAsync();
  if (!client) return null;

  const {
    data: { user },
  } = await client.auth.getUser();

  return user?.email ?? null;
}

/**
 * Get the current authenticated user's ID from the Supabase session.
 * Returns null if not authenticated or Supabase not configured.
 */
export async function getAuthUserId(): Promise<string | null> {
  const client = await createClientAsync();
  if (!client) return null;

  const {
    data: { user },
  } = await client.auth.getUser();

  return user?.id ?? null;
}

/** Check if Supabase is configured (env vars present). */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Development fallback email — used when Supabase is not configured.
 * This allows local development without a Supabase project.
 */
export const DEV_FALLBACK_EMAIL = "user@nusword.local";

/**
 * Get the current user's email, with a dev fallback.
 * If Supabase is configured and user is authenticated, returns their email.
 * If Supabase is not configured, returns the dev fallback.
 * If Supabase is configured but user is not authenticated, returns null.
 */
export async function getAuthEmailOrFallback(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return DEV_FALLBACK_EMAIL;
  }
  return getAuthEmail();
}
