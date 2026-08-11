/**
 * auth.ts — NUSWORD auth service definition + helpers + Encore auth handler.
 *
 * Responsibilities:
 *   - Owns the `auth` SQLDatabase (PostgreSQL, Encore-provisioned).
 *   - Issues and verifies HS256 JWTs (7-day expiry) for session tokens.
 *   - Hashes and verifies passwords with bcrypt (10 rounds).
 *   - Maintains a revoked-token blocklist for logout.
 *   - Exposes the Encore `authHandler` so every authenticated request across
 *     every NUSWORD service resolves to a typed `AuthData` object.
 *
 * Replaces: Supabase Auth (Phase 9). All other Encore services depend on this
 * handler — they `import { auth } from "~encore/auth"` and read `auth.data`.
 */

import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { APIError } from "encore.dev/api";
import bcrypt from "bcrypt";
import crypto from "crypto";

// ─── Database ──────────────────────────────────────────────────────────────
// Encore auto-provisions a PostgreSQL database named "auth" and runs the
// migrations in ./migrations (1_create_users.sql, 2_create_revoked_tokens.sql).
export const db = new SQLDatabase("auth", {
  migrations: "./migrations",
});

// ─── Secrets ───────────────────────────────────────────────────────────────
// Set via: `encore secret set JWT_SECRET` (production) or
// `encore secret set --local JWT_SECRET` (local dev).
// Used as the HMAC-SHA256 key for signing + verifying JWTs.
const jwtSecret = secret("JWT_SECRET");

/**
 * Returns the JWT secret, throwing if it is unset or empty.
 *
 * Encore returns `""` for unset secrets in local dev — that would silently
 * produce JWTs signed with an empty key (trivially forgeable). Fail loud
 * instead so the operator knows to run `encore secret set JWT_SECRET`.
 */
function getJwtSecret(): string {
  const s = jwtSecret();
  if (!s) {
    throw APIError.internal(
      "JWT_SECRET is not set. Run: encore secret set JWT_SECRET",
    );
  }
  return s;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const BCRYPT_ROUNDS = 10;

// ─── JWT types ─────────────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  name: string | null;
  createdAt: string; // ISO 8601
  iat: number; // issued-at (unix seconds)
  exp: number; // expiry (unix seconds)
}

// ─── AuthData (what every authenticated Encore request sees as auth.data) ──
//
// This is the typed payload that other NUSWORD services access via
// `import { auth } from "~encore/auth"; auth.data` — it mirrors the
// `AuthUser` interface in /backend/shared/types.ts (minus `createdAt` which
// we include here too so `/auth/me` and `/auth/validate` don't need an
// extra DB round-trip on every call).
export interface AuthData {
  userID: string;
  email: string;
  name: string | null;
  createdAt: string; // ISO 8601
}

// ─── Auth handler params ───────────────────────────────────────────────────
// Encore calls the auth handler with the bearer token extracted from the
// `Authorization: Bearer <token>` header. The `authToken` field is the raw
// token string (without the "Bearer " prefix).
export interface AuthParams {
  authToken: string;
}

// ─── User row helpers ──────────────────────────────────────────────────────
export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

/** DTO matching the frontend's `AuthUser` interface (src/types/saas.ts). */
export interface AuthUserDTO {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export function toAuthUser(user: UserRow): AuthUserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : new Date(user.createdAt).toISOString(),
  };
}

// `Row` from Encore's sqldb is `Record<string, any>` — a bag of column
// values keyed by the column name as it appears in the result set. We keep
// the parameter type loose here and cast each field explicitly below.
type DbRow = Record<string, unknown>;

function toUserRow(row: DbRow): UserRow {
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string | null | undefined) ?? null,
    createdAt: row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at as string),
  };
}

// ─── User DB operations ────────────────────────────────────────────────────

export async function findUserById(id: string): Promise<UserRow | null> {
  const row = await db.queryRow`
    SELECT id, email, name, created_at
    FROM users
    WHERE id = ${id}
  `;
  return row ? toUserRow(row) : null;
}

export async function findUserByEmail(
  email: string,
): Promise<(UserRow & { passwordHash: string }) | null> {
  const row = await db.queryRow`
    SELECT id, email, name, created_at, password_hash
    FROM users
    WHERE email = ${email}
  `;
  if (!row) return null;
  return {
    ...toUserRow(row),
    passwordHash: row.password_hash as string,
  };
}

export async function createUser(
  email: string,
  passwordHash: string,
  name: string | null,
): Promise<UserRow> {
  const id = crypto.randomUUID();
  const row = await db.queryRow`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${id}, ${email}, ${passwordHash}, ${name})
    RETURNING id, email, name, created_at
  `;
  if (!row) {
    throw APIError.internal("failed to create user");
  }
  return toUserRow(row);
}

// ─── Password hashing ──────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT helpers ───────────────────────────────────────────────────────────
// Hand-rolled HS256 JWT implementation (no external dep) so the auth service
// has zero runtime dependencies beyond bcrypt + the Encore SDK.

function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(
    str.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  );
}

/** Thrown when a JWT fails structural or cryptographic verification. */
export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTokenError";
  }
}

/** Sign a JWT containing the user's identity. Returns the raw token string. */
export function signJwt(
  payload: Pick<JwtPayload, "userId" | "email" | "name" | "createdAt">,
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(signingInput)
    .digest();
  const signatureB64 = base64UrlEncode(signature);
  return `${signingInput}.${signatureB64}`;
}

/** Verify a JWT's signature + expiry. Returns the decoded payload. */
export function verifyJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new InvalidTokenError("malformed token");
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  // Verify signature using timing-safe comparison.
  const expectedSig = crypto
    .createHmac("sha256", getJwtSecret())
    .update(signingInput)
    .digest();
  let actualSig: Buffer;
  try {
    actualSig = base64UrlDecode(signatureB64);
  } catch {
    throw new InvalidTokenError("malformed signature");
  }
  if (actualSig.length !== expectedSig.length) {
    throw new InvalidTokenError("invalid signature");
  }
  if (!crypto.timingSafeEqual(expectedSig, actualSig)) {
    throw new InvalidTokenError("invalid signature");
  }

  // Decode payload.
  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    throw new InvalidTokenError("malformed payload");
  }

  // Check expiry.
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw new InvalidTokenError("token expired");
  }
  if (typeof payload.userId !== "string" || !payload.userId) {
    throw new InvalidTokenError("missing userId");
  }

  return payload;
}

// ─── Revoked-token blocklist (logout) ──────────────────────────────────────

function tokenIdFromToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Add a token to the revocation blocklist. Idempotent (ON CONFLICT). */
export async function revokeToken(
  token: string,
  payload: Pick<JwtPayload, "userId" | "exp">,
): Promise<void> {
  const tokenId = tokenIdFromToken(token);
  const expiresAt = new Date(payload.exp * 1000).toISOString();
  await db.exec`
    INSERT INTO revoked_tokens (token_id, user_id, expires_at)
    VALUES (${tokenId}, ${payload.userId}, ${expiresAt})
    ON CONFLICT (token_id) DO NOTHING
  `;
}

/** Check whether a token has been revoked. */
export async function isTokenRevoked(token: string): Promise<boolean> {
  const tokenId = tokenIdFromToken(token);
  const row = await db.queryRow`
    SELECT 1 FROM revoked_tokens WHERE token_id = ${tokenId}
  `;
  return !!row;
}

// ─── Encore auth handler ───────────────────────────────────────────────────
//
// Encore calls this handler on every request to an endpoint with `auth: true`.
// It receives the bearer token (from the `Authorization: Bearer <token>`
// header) via `params.authToken`, validates it, and returns the user's data.
//
// The returned `AuthData` is then available to ALL services as `auth.data`:
//   import { auth } from "~encore/auth";
//   const { userID, email } = auth.data!;
//
// Validation steps:
//   1. Verify JWT signature (HMAC-SHA256) + expiry.
//   2. Check the revoked-token blocklist (handles logout).
//   3. Return typed AuthData from the JWT payload.
//
// Note: we intentionally do NOT re-fetch the user from the DB on every
// request — the JWT is the source of truth for the session. If a user's
// email/name changes, they should re-login to refresh the token. This keeps
// the auth handler O(1) on the hot path (just one indexed revoked-token
// lookup, which itself can be skipped if the token is past `exp`).
export const auth = authHandler(
  async (params: AuthParams): Promise<AuthData | null> => {
    const token = params.authToken;
    if (!token) {
      throw APIError.unauthenticated("missing auth token");
    }

    let payload: JwtPayload;
    try {
      payload = verifyJwt(token);
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        throw APIError.unauthenticated(err.message);
      }
      throw err;
    }

    if (await isTokenRevoked(token)) {
      throw APIError.unauthenticated("token has been revoked");
    }

    return {
      userID: payload.userId,
      email: payload.email,
      name: payload.name,
      createdAt: payload.createdAt,
    };
  },
);
