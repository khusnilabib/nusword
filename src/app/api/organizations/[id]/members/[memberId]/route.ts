/**
 * PATCH  /api/organizations/[id]/members/[memberId]  — update member role
 * DELETE /api/organizations/[id]/members/[memberId]  — remove member
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasPermission, type OrgRole } from "@/types/saas";
import { z } from "zod";

const CURRENT_USER_EMAIL = "user@nusword.local";

const PatchSchema = z.object({
  role: z.enum(["owner", "admin", "editor", "commenter", "viewer"]),
});

type Ctx = { params: Promise<{ id: string; memberId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, memberId } = await params;
  const myMembership = await db.organizationMember.findUnique({
    where: { organizationId_email: { organizationId: id, email: CURRENT_USER_EMAIL } },
  });
  if (!myMembership || !hasPermission(myMembership.role as OrgRole, "org.members.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const targetMember = await db.organizationMember.findUnique({ where: { id: memberId } });
  if (!targetMember || targetMember.organizationId !== id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (targetMember.email === CURRENT_USER_EMAIL && targetMember.role === "owner" && parsed.data.role !== "owner") {
    return NextResponse.json({ error: "Cannot demote yourself from owner" }, { status: 400 });
  }

  const updated = await db.organizationMember.update({
    where: { id: memberId },
    data: { role: parsed.data.role },
  });
  return NextResponse.json({ member: { id: updated.id, role: updated.role } });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, memberId } = await params;
  const myMembership = await db.organizationMember.findUnique({
    where: { organizationId_email: { organizationId: id, email: CURRENT_USER_EMAIL } },
  });
  if (!myMembership || !hasPermission(myMembership.role as OrgRole, "org.members.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetMember = await db.organizationMember.findUnique({ where: { id: memberId } });
  if (!targetMember || targetMember.organizationId !== id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (targetMember.role === "owner") {
    return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });
  }

  await db.organizationMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
