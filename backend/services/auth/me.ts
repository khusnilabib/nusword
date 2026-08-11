/**
 * me.ts — GET /auth/me
 *
 * Frontend-facing "current user" endpoint. Returns the authenticated user's
 * profile (id, email, name, createdAt) based on the bearer token.
 *
 * Contract:
 *   Header: Authorization: Bearer <token>
 *   Response: { user: { id, email, name, createdAt } }
 *
 * Errors:
 *   401 unauthenticated — missing/invalid/expired/revoked token
 *
 * Notes:
 *   - Uses `auth: true`, so Encore runs the auth handler first.
 *   - `auth.data` carries the full identity from the JWT, so this endpoint
 *     does NOT need an extra DB round-trip on every call.
 *   - For the internal service-to-service validation endpoint (with a
 *     `valid: true` envelope), see ./validate.ts.
 */

import { api } from "encore.dev/api";
import { auth } from "~encore/auth";

import { AuthData, AuthUserDTO } from "./auth";

// ─── Response type ─────────────────────────────────────────────────────────

export interface MeResponse {
  user: AuthUserDTO;
}

// ─── Endpoint ──────────────────────────────────────────────────────────────

export const me = api(
  {
    method: "GET",
    path: "/auth/me",
    auth: true, // requires a valid bearer token
  },
  async (): Promise<MeResponse> => {
    const data = auth.data as AuthData | undefined;
    if (!data) {
      // Defensive: should never happen with `auth: true`.
      throw new Error("auth.data unexpectedly undefined on authenticated endpoint");
    }

    return {
      user: {
        id: data.userID,
        email: data.email,
        name: data.name,
        createdAt: data.createdAt,
      },
    };
  },
);
