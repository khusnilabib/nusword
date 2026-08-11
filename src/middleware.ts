import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Middleware — protects /app routes using JWT cookie auth.
 *
 * In dev mode (JWT_SECRET is the default), auth is auto-passed.
 * In production, unauthenticated users are redirected to /login.
 */
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nusword-dev-secret-change-in-production",
);

const COOKIE_NAME = "nusword_session";

function isDevMode(): boolean {
  return (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === "nusword-dev-secret-change-in-production"
  );
}

export async function middleware(request: NextRequest) {
  const isAppRoute = request.nextUrl.pathname.startsWith("/app");
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  // In dev mode, skip all auth checks.
  if (isDevMode()) {
    return NextResponse.next();
  }

  // Read JWT from cookie.
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Protect /app routes — redirect to /login if not authenticated.
  if (isAppRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages.
  if (isAuthPage && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
