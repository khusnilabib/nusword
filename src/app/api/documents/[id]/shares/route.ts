/**
 * GET  /api/documents/[id]/shares  — list all shares for a document
 * POST /api/documents/[id]/shares  — share document with an email
 *
 * Phase 7: sharing without billing. See PRD §19 — RBAC.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmailOrFallback } from "@/lib/supabase/server";
import { z } from "zod";

const ShareSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "commenter", "viewer"]).default("viewer"),
});

type Ctx = { params: Promise<{ id: string }> };

/** Convert a Prisma SharedDocument row to the API DTO shape. */
function toShareDto(row: {
  id: string;
  documentId: string;
  sharedWithEmail: string;
  role: string;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    documentId: row.documentId,
    sharedWithEmail: row.sharedWithEmail,
    role: row.role,
    shareToken: row.shareToken,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shares = await db.sharedDocument.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ shares: shares.map(toShareDto) });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Don't allow sharing with yourself (would be confusing in the UI).
  if (parsed.data.email.toLowerCase() === userEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "Cannot share with yourself" },
      { status: 400 },
    );
  }

  // Check for an existing share to avoid duplicates.
  const existing = await db.sharedDocument.findFirst({
    where: { documentId: id, sharedWithEmail: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Already shared with this email" },
      { status: 409 },
    );
  }

  const shareToken = crypto.randomUUID();

  const share = await db.sharedDocument.create({
    data: {
      documentId: id,
      sharedWithEmail: parsed.data.email,
      role: parsed.data.role,
      shareToken,
    },
  });

  await db.usageEvent.create({
    data: {
      email: userEmail,
      type: "document.share",
      resourceId: share.id,
      metadata: JSON.stringify({
        documentId: id,
        sharedWith: parsed.data.email,
        role: parsed.data.role,
      }),
    },
  });

  return NextResponse.json({ share: toShareDto(share) }, { status: 201 });
}
