/**
 * GET /api/shared — list documents shared WITH the current user (by email).
 *
 * Returns shares for the placeholder user, joined with their Document to
 * surface the document title for UI display.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CURRENT_USER_EMAIL = "user@nusword.local";

export async function GET(_req: NextRequest) {
  const shares = await db.sharedDocument.findMany({
    where: { sharedWithEmail: CURRENT_USER_EMAIL },
    include: {
      document: {
        select: { id: true, title: true, deletedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter out shares whose underlying document has been soft-deleted.
  const visible = shares.filter((s) => s.document && !s.document.deletedAt);

  return NextResponse.json({
    shares: visible.map((s) => ({
      id: s.id,
      documentId: s.documentId,
      documentTitle: s.document.title,
      sharedWithEmail: s.sharedWithEmail,
      role: s.role,
      shareToken: s.shareToken,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
}
