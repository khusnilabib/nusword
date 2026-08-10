/**
 * GET  /api/organizations/[id]/members  — list members
 * POST /api/organizations/[id]/members  — invite a member (add by email)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasPermission, type OrgRole } from "@/types/saas";
import { z } from "zod";

const CURRENT_USER_EMAIL = "user@nusword.local";

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
  role: z.enum(["admin", "editor", "commenter", "viewer"]).default("viewer"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const role = await db.organizationMember.findUnique({
    where: { organizationId_email: { organizationId: id, email: CURRENT_USER_EMAIL } },
  });
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await db.organizationMember.findMany({
    where: { organizationId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      email: m.email,
      name: m.name,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const myMembership = await db.organizationMember.findUnique({
    where: { organizationId_email: { organizationId: id, email: CURRENT_USER_EMAIL } },
  });
  if (!myMembership || !hasPermission(myMembership.role as OrgRole, "org.members.manage")) {
    return NextResponse.json({ error: "Forbidden — admin or owner only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  // Check if already a member.
  const existing = await db.organizationMember.findUnique({
    where: { organizationId_email: { organizationId: id, email: parsed.data.email } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  const member = await db.organizationMember.create({
    data: {
      organizationId: id,
      email: parsed.data.email,
      name: parsed.data.name ?? null,
      role: parsed.data.role,
    },
  });

  await db.usageEvent.create({
    data: { email: CURRENT_USER_EMAIL, type: "organization.member.invite", resourceId: member.id },
  });

  return NextResponse.json({
    member: {
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
    },
  }, { status: 201 });
}
