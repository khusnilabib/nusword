/**
 * validate.ts — GET /auth/validate
 *
 * Internal session-validation endpoint. Called by other NUSWORD services
 * (or the frontend) to verify a bearer token is still valid and resolve
 * the user it belongs to.
 *
 * Contract:
 *   Header: Authorization: Bearer <token>
 *   Response: { valid: true, user: { id, email, name, createdAt } }
 *
 * Errors:
 *   401 unauthenticated — missing/invalid/expired/revoked token
 *     (Encore's auth handler returns this before the endpoint body runs;
 *      see ./auth.ts for the full validation pipeline.)
 *
 * Notes:
 *   - Uses `auth: true`, so Encore runs the auth handler first. By the time
 *     the endpoint body executes, the token has already been signature-checked,
 *     expiry-checked, and blocklist-checked.
 *   - `auth.data` is therefore guaranteed populated; the body just shapes it.
 *   - For the frontend-facing "current user" endpoint, see ./me.ts
 *     (same data, different response envelope).
 */

import { api } from "encore.dev/api";
import { auth } from "~encore/auth";

import { AuthData, AuthUserDTO } from "./auth";

// ─── Response type ─────────────────────────────────────────────────────────

export interface ValidateResponse {
  valid: true;
  user: AuthUserDTO;
}

// ─── Endpoint ──────────────────────────────────────────────────────────────

export const validate = api(
  {
    method: "GET",
    path: "/auth/validate",
    auth: true, // requires a valid bearer token
  },
  async (): Promise<ValidateResponse> => {
    // `auth: true` guarantees auth.data is populated — the auth handler
    // in ./auth.ts already threw 401 if the token was bad.
    const data = auth.data as AuthData | undefined;
    if (!data) {
      // Defensive: should never happen with `auth: true`.
      throw new Error("auth.data unexpectedly undefined on authenticated endpoint");
    }

    return {
      valid: true,
      user: {
        id: data.userID,
        email: data.email,
        name: data.name,
        createdAt: data.createdAt,
      },
    };
  },
);
