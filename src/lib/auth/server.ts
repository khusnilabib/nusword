/**
 * NUSWORD JWT Auth — server-side helpers.
 *
 * Uses `jose` for JWT signing/verification (edge-compatible, works in
 * Next.js middleware + API routes + server components).
 *
 * Token is stored in an httpOnly cookie for security (XSS-proof).
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nusword-dev-secret-change-in-production",
);

const COOKIE_NAME = "nusword_session";
const TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface JwtPayload {
  sub: string; // user id
  email: string;
  name: string | null;
  createdAt: string;
}

/** Hash a password with bcrypt (10 rounds). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Verify a password against a bcrypt hash. */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Create a signed JWT token for a user. */
export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(JWT_SECRET);
}

/** Verify a JWT token and return the payload. Returns null if invalid. */
export async function verifyToken(
  token: string,
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
      createdAt: (payload.createdAt as string) || "",
    };
  } catch {
    return null;
  }
}

/** Get the current user from the session cookie (server-side). */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    createdAt: payload.createdAt,
  };
}

/**
 * Get the current user's email, with dev fallback.
 * Returns dev fallback "user@nusword.local" if JWT_SECRET is the dev default
 * and no auth cookie is present (allows local dev without auth).
 */
export async function getAuthEmailOrFallback(): Promise<string> {
  const user = await getAuthUser();
  if (user) return user.email;

  // Dev mode fallback: if JWT_SECRET is the dev default, allow placeholder.
  if (
    process.env.JWT_SECRET === "nusword-dev-secret-change-in-production" ||
    !process.env.JWT_SECRET
  ) {
    return "user@nusword.local";
  }

  return null as unknown as string; // will cause 401 in production
}

/** Set the session cookie in the response. */
export function setSessionCookie(token: string): void {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_TTL,
    path: "/",
  });
}

/** Clear the session cookie. */
export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

/** Get the cookie name (for middleware). */
export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

/** Check if running in dev mode (no real JWT_SECRET). */
export function isDevMode(): boolean {
  return (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === "nusword-dev-secret-change-in-production"
  );
}
