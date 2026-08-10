/**
 * NUSWORD Frontend API Client Adapter
 *
 * This adapter allows the frontend to switch between:
 * 1. Next.js API routes (current, /api/*) — for local dev without Encore
 * 2. Encore.dev backend — for production with Encore
 *
 * Set NEXT_PUBLIC_API_BASE_URL to point to the Encore backend.
 * If not set, falls back to relative /api (Next.js routes).
 *
 * Usage in hooks:
 *   const API_BASE = getApiBaseUrl();
 *   fetch(`${API_BASE}/documents`)
 */

/** Get the API base URL. Falls back to "" (relative /api) if Encore not configured. */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "";
}

/** Build a full API URL from a path. */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/** Get the auth token from localStorage (set by login/signup). */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nusword_auth_token");
}

/** Set the auth token in localStorage. */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("nusword_auth_token", token);
}

/** Remove the auth token from localStorage. */
export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("nusword_auth_token");
}

/** Check if Encore backend is configured. */
export function isEncoreConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_API_BASE_URL;
}

/**
 * Authenticated fetch — automatically adds Authorization header if a token exists.
 * Use this instead of raw fetch() for all API calls when Encore is configured.
 */
export async function authFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(apiUrl(url), { ...init, headers });
}
