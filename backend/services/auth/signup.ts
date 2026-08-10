/**
 * signup.ts — POST /auth/signup
 *
 * Registers a new user with email + password, creates a session JWT, and
 * returns the token + user DTO (matches the frontend's AuthSession type).
 *
 * Contract:
 *   Request:  { email: string; password: string; name?: string | null }
 *   Response: { token: string; user: { id, email, name, createdAt } }
 *
 * Errors:
 *   400 invalidArgument — missing/invalid email, password too short, name too long
 *   409 alreadyExists    — email already registered
 */

import { api, APIError } from "encore.dev/api";

import {
  AuthUserDTO,
  createUser,
  findUserByEmail,
  hashPassword,
  signJwt,
  toAuthUser,
  UserRow,
} from "./auth";

// ─── Request / Response types ──────────────────────────────────────────────

export interface SignupRequest {
  email: string;
  password: string;
  name?: string | null;
}

export interface SignupResponse {
  token: string;
  user: AuthUserDTO;
}

// ─── Validation ────────────────────────────────────────────────────────────

// RFC 5322 simplified — good enough for application-level validation.
// The DB UNIQUE constraint is the real guard against duplicates.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_NAME_LENGTH = 200;

function validateSignupInput(req: SignupRequest): {
  email: string;
  password: string;
  name: string | null;
} {
  const email = (req.email ?? "").trim().toLowerCase();
  if (!email) {
    throw APIError.invalidArgument("email is required");
  }
  if (!EMAIL_RE.test(email)) {
    throw APIError.invalidArgument("email is invalid");
  }

  const password = req.password ?? "";
  if (!password) {
    throw APIError.invalidArgument("password is required");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw APIError.invalidArgument(
      `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw APIError.invalidArgument(
      `password must be at most ${MAX_PASSWORD_LENGTH} characters`,
    );
  }

  const name = req.name != null ? req.name.trim() : "";
  if (name.length > MAX_NAME_LENGTH) {
    throw APIError.invalidArgument(
      `name must be at most ${MAX_NAME_LENGTH} characters`,
    );
  }

  return { email, password, name: name || null };
}

// ─── Endpoint ──────────────────────────────────────────────────────────────

export const signup = api(
  {
    method: "POST",
    path: "/auth/signup",
    auth: false, // public endpoint — no token required
  },
  async (req: SignupRequest): Promise<SignupResponse> => {
    const { email, password, name } = validateSignupInput(req);

    // Pre-check for duplicate email (race-free uniqueness is enforced by the
    // DB UNIQUE constraint, but this gives a clean 409 without bubbling up
    // a raw Postgres error).
    const existing = await findUserByEmail(email);
    if (existing) {
      throw APIError.alreadyExists("email already registered");
    }

    const passwordHash = await hashPassword(password);
    let user: UserRow;
    try {
      user = await createUser(email, passwordHash, name);
    } catch (err) {
      // Handle the race-condition where two signups with the same email
      // passed the pre-check but the second INSERT hits the UNIQUE constraint.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate") || msg.includes("unique")) {
        throw APIError.alreadyExists("email already registered");
      }
      throw err;
    }

    const token = signJwt({
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    });

    return {
      token,
      user: toAuthUser(user),
    };
  },
);
