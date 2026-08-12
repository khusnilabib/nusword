/**
 * POST /api/auth/signup — register a new user.
 *
 * Body: { email, password, name? }
 * Returns: { user: { id, email, name, createdAt } }
 * Sets: httpOnly session cookie with JWT
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth/server";
import { z } from "zod";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  name: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { email, password, name } = parsed.data;

  // Check if user already exists.
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 },
    );
  }

  // Create user with hashed password.
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { email, name: name ?? null, passwordHash },
  });

  // Create JWT token and set cookie.
  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
  const token = await createToken(authUser);
  setSessionCookie(token);

  return NextResponse.json({ user: authUser }, { status: 201 });
}
