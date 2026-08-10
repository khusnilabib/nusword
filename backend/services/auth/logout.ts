/**
 * logout.ts — POST /auth/logout
 *
 * Revokes the caller's session JWT by adding it to the `revoked_tokens`
 * blocklist. Subsequent requests carrying the same token will be rejected
 * by the auth handler (see ./auth.ts) with 401 unauthenticated.
 *
 * Contract:
 *   Header:  Authorization: Bearer <token>
 *   Response: { ok: true }
 *
 * Notes:
 *   - Uses `auth: false` so we can read the raw `Authorization` header
 *     directly — the auth handler consumes it when `auth: true`, which would
 *     prevent us from extracting the raw token to revoke.
 *   - We manually verify the JWT signature + expiry before revoking, so only
 *     well-formed tokens land in the blocklist.
 *   - If the token is already expired or malformed, we still return
 *     `{ ok: true }` — the client's intent is "discard my session", and an
 *     already-invalid token needs no server-side revocation. This keeps the
 *     logout UX idempotent and never errors out on the client.
 *   - Revocation is idempotent (INSERT ... ON CONFLICT DO NOTHING), so calling
 *     logout twice with the same token is a no-op.
 */

import { api, APIError, Header } from "encore.dev/api";

import { InvalidTokenError, revokeToken, verifyJwt } from "./auth";

// ─── Response type ─────────────────────────────────────────────────────────

export interface LogoutResponse {
  ok: boolean;
}

// ─── Endpoint ──────────────────────────────────────────────────────────────

export const logout = api(
  {
    method: "POST",
    path: "/auth/logout",
    auth: false, // we manually read the Authorization header
  },
  async (req: {
    authorization: Header<string>;
  }): Promise<LogoutResponse> => {
    const header = req.authorization;
    if (!header) {
      throw APIError.invalidArgument("missing Authorization header");
    }

    // Extract the bearer token.
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      throw APIError.invalidArgument(
        "invalid Authorization header format; expected 'Bearer <token>'",
      );
    }
    const token = match[1]!;

    // Verify + revoke. An already-invalid token is a no-op for revocation
    // but we still tell the client "ok" so they discard it locally.
    try {
      const payload = verifyJwt(token);
      await revokeToken(token, {
        userId: payload.userId,
        exp: payload.exp,
      });
    } catch (err) {
      if (!(err instanceof InvalidTokenError)) {
        // Unexpected error (DB failure, etc.) — surface it.
        throw err;
      }
      // Token was already invalid/expired — nothing to revoke. Return ok.
    }

    return { ok: true };
  },
);
