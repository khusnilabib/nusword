/**
 * GET  /api/organizations  — list organizations for current user (by email)
 * POST /api/organizations  — create a new organization
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmailOrFallback } from "@/lib/supabase/server";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
});

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

export async function GET() {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db.organizationMember.findMany({
    where: { email: userEmail },
    include: {
      organization: {
        include: {
          _count: { select: { members: true, documents: true, books: true } },
        },
      },
    },
  });

  return NextResponse.json({
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      description: m.organization.description,
      memberCount: m.organization._count.members,
      documentCount: m.organization._count.documents,
      bookCount: m.organization._count.books,
      myRole: m.role,
      createdAt: m.organization.createdAt.toISOString(),
      updatedAt: m.organization.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const slug = parsed.data.slug || slugify(parsed.data.name);

  // Check slug uniqueness.
  const existing = await db.organization.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  // Create org + make the creator the owner.
  const org = await db.organization.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description ?? null,
      members: {
        create: {
          email: userEmail,
          name: "You",
          role: "owner",
        },
      },
    },
    include: { _count: { select: { members: true, documents: true, books: true } } },
  });

  // Log usage event.
  await db.usageEvent.create({
    data: { email: userEmail, type: "organization.create", resourceId: org.id },
  });

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      memberCount: org._count.members,
      documentCount: org._count.documents,
      bookCount: org._count.books,
      myRole: "owner" as const,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    },
  }, { status: 201 });
}
