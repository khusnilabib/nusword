/**
 * POST /api/documents/[id]/duplicate
 *
 * Duplicates a document — copies title (with " (copy)" suffix), content,
 * settings, wordGoal, and ownerEmail. The new document is owned by the
 * authenticated user (who must also own the source).
 *
 * Returns the new document DTO (same shape as POST /api/documents).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toDocumentDto } from "@/lib/nusword/serialize";
import { getAuthEmailOrFallback } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the source document and verify ownership + visibility.
  const source = await db.document.findUnique({ where: { id } });
  if (!source || source.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (source.ownerEmail !== userEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create the copy — propagate content, settings, wordGoal, and ownership.
  // Truncate to 200 chars to match the Document.title constraint enforced
  // elsewhere by the create/update Zod schemas.
  const newTitle = `${source.title} (copy)`.slice(0, 200);

  const copy = await db.document.create({
    data: {
      title: newTitle,
      content: source.content,
      settings: source.settings,
      wordGoal: source.wordGoal,
      ownerEmail: source.ownerEmail,
      organizationId: source.organizationId,
    },
  });

  return NextResponse.json({ document: toDocumentDto(copy) }, { status: 201 });
}
