/**
 * GET   /api/auth/me — get the current authenticated user.
 *
 * Returns: { user: { id, email, name, createdAt } } or 401.
 *
 * PATCH /api/auth/me — update the current user's profile (currently only name).
 *
 * Body: { name?: string }
 * Returns: { user: { id, email, name, createdAt } } with a refreshed session
 * cookie so the new name is reflected in the JWT payload.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getAuthUser,
  isDevMode,
  createToken,
  SESSION_COOKIE_OPTIONS,
  getSessionCookieName,
} from "@/lib/auth/server";

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

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();

  if (!user) {
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

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Update the user's name in the DB. The email is immutable from this route.
  if (parsed.data.name !== undefined) {
    await db.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    });
  }

  // Issue a new JWT so the updated name is reflected without a re-login.
  const updatedUser = {
    id: user.id,
    email: user.email,
    name: parsed.data.name ?? user.name,
    createdAt: user.createdAt,
  };
  const token = await createToken(updatedUser);

  const res = NextResponse.json({ user: updatedUser });
  res.cookies.set(getSessionCookieName(), token, SESSION_COOKIE_OPTIONS);
  return res;
}
