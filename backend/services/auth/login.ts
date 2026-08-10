/**
 * login.ts — POST /auth/login
 *
 * Verifies email + password credentials and returns a fresh session JWT.
 *
 * Contract:
 *   Request:  { email: string; password: string }
 *   Response: { token: string; user: { id, email, name, createdAt } }
 *
 * Errors:
 *   400 invalidArgument — missing email or password
 *   401 unauthenticated  — invalid credentials (user not found OR bad password;
 *                          intentionally the same message to avoid user
 *                          enumeration)
 */

import { api, APIError } from "encore.dev/api";

import {
  AuthUserDTO,
  findUserByEmail,
  signJwt,
  toAuthUser,
  verifyPassword,
} from "./auth";

// ─── Request / Response types ──────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUserDTO;
}

// ─── Endpoint ──────────────────────────────────────────────────────────────

export const login = api(
  {
    method: "POST",
    path: "/auth/login",
    auth: false, // public endpoint — no token required
  },
  async (req: LoginRequest): Promise<LoginResponse> => {
    const email = (req.email ?? "").trim().toLowerCase();
    const password = req.password ?? "";

    if (!email) {
      throw APIError.invalidArgument("email is required");
    }
    if (!password) {
      throw APIError.invalidArgument("password is required");
    }

    const user = await findUserByEmail(email);
    // Always run bcrypt.compare even if the user doesn't exist, to keep the
    // response time constant and avoid user-enumeration via timing.
    // (A dummy hash that never matches.)
    const dummyHash =
      "$2b$10$CwTycUXWue0Thq9StjUM0uJ8eVjP3wW6DfYjVjL2g3X6l1u9uVjKu";
    const passwordHash = user?.passwordHash ?? dummyHash;
    const ok = await verifyPassword(password, passwordHash);

    if (!user || !ok) {
      throw APIError.unauthenticated("invalid email or password");
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
