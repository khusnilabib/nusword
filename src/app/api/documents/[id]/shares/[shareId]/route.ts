/**
 * PATCH  /api/documents/[id]/shares/[shareId]  — update share role
 * DELETE /api/documents/[id]/shares/[shareId]  — revoke share
 *
 * Phase 7: sharing without billing. See PRD §19 — RBAC.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const PatchSchema = z.object({
  role: z.enum(["editor", "commenter", "viewer"]),
});

type Ctx = { params: Promise<{ id: string; shareId: string }> };

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

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, shareId } = await params;

  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const share = await db.sharedDocument.findUnique({ where: { id: shareId } });
  if (!share || share.documentId !== id) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updated = await db.sharedDocument.update({
    where: { id: shareId },
    data: { role: parsed.data.role },
  });

  return NextResponse.json({ share: toShareDto(updated) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, shareId } = await params;

  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const share = await db.sharedDocument.findUnique({ where: { id: shareId } });
  if (!share || share.documentId !== id) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  await db.sharedDocument.delete({ where: { id: shareId } });

  return NextResponse.json({ ok: true, id: shareId });
}
