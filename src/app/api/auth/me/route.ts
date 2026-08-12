/**
 * GET /api/auth/me — get the current authenticated user.
 *
 * Returns: { user: { id, email, name, createdAt } } or 401.
 */
import { NextResponse } from "next/server";
import { getAuthUser, isDevMode } from "@/lib/auth/server";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    // Dev mode fallback.
    if (isDevMode()) {
      return NextResponse.json({
        user: {
          id: "dev-user",
          email: "user@nusword.local",
          name: "Developer",
          createdAt: new Date().toISOString(),
        },
      });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
