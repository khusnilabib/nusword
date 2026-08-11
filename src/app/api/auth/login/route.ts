/**
 * POST /api/auth/login — authenticate a user.
 *
 * Body: { email, password }
 * Returns: { user: { id, email, name, createdAt } }
 * Sets: httpOnly session cookie with JWT
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth/server";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  // Find user.
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  // Verify password.
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  // Create JWT token and set cookie.
  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
  const token = await createToken(authUser);
  setSessionCookie(token);

  return NextResponse.json({ user: authUser });
}
