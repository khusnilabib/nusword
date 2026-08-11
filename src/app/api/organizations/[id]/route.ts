/**
 * GET    /api/organizations/[id]           — get org details
 * PATCH  /api/organizations/[id]           — update org name/description
 * DELETE /api/organizations/[id]           — delete org (owner only)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmailOrFallback } from "@/lib/supabase/server";
import { hasPermission } from "@/types/saas";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function getMemberRole(orgId: string, userEmail: string) {
  const member = await db.organizationMember.findUnique({
    where: { organizationId_email: { organizationId: orgId, email: userEmail } },
  });
  return member?.role as any || null;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const org = await db.organization.findUnique({
    where: { id },
    include: { _count: { select: { members: true, documents: true, books: true } } },
  });
  if (!org || org.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const myRole = await getMemberRole(id, userEmail);
  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      memberCount: org._count.members,
      documentCount: org._count.documents,
      bookCount: org._count.books,
      myRole,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getMemberRole(id, userEmail);
  if (!role || !hasPermission(role, "org.settings.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const org = await db.organization.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ organization: { id: org.id, name: org.name, slug: org.slug, description: org.description } });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getMemberRole(id, userEmail);
  if (!role || !hasPermission(role, "org.delete")) {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }

  await db.organization.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
