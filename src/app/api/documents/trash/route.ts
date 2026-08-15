/**
 * GET   /api/documents/trash          — list soft-deleted documents for the current user
 * PATCH /api/documents/trash          — { id, action: "restore" | "permanent-delete" }
 *
 * PRD §25: documents go to trash before permanent deletion. This route is the
 * trashcan UI's data source — listing, restoring, and permanently deleting.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { toDocumentDto } from "@/lib/nusword/serialize";
import { getAuthEmailOrFallback } from "@/lib/supabase/server";

export async function GET() {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await db.document.findMany({
    where: { deletedAt: { not: null }, ownerEmail: userEmail },
    orderBy: { deletedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    documents: docs.map((d) => ({
      ...toDocumentDto(d),
      deletedAt: d.deletedAt?.toISOString() ?? null,
    })),
  });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["restore", "permanent-delete"]),
});

export async function PATCH(req: NextRequest) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id, action } = parsed.data;

  // Ensure the document exists and belongs to the current user.
  const existing = await db.document.findUnique({ where: { id } });
  if (!existing || existing.ownerEmail !== userEmail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "restore") {
    if (!existing.deletedAt) {
      return NextResponse.json({ ok: true, id, restored: false });
    }
    const restored = await db.document.update({
      where: { id },
      data: { deletedAt: null },
    });
    return NextResponse.json({ ok: true, id, document: toDocumentDto(restored) });
  }

  // permanent-delete — actually remove the row (and its cascade: versions,
  // export jobs, shares). Prisma onDelete: Cascade handles related rows.
  await db.document.delete({ where: { id } });
  return NextResponse.json({ ok: true, id, deleted: true });
}
