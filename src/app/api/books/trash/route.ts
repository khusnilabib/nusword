/**
 * GET   /api/books/trash          — list soft-deleted books for the current user
 * PATCH /api/books/trash          — { id, action: "restore" | "permanent-delete" }
 *
 * Books use the same soft-delete pattern as documents (PRD §25): deletedAt is
 * set instead of removing the row. Permanent deletion removes the book and
 * cascades to its chapters (onDelete: Cascade in the Prisma schema).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { toBookDto } from "@/lib/nusword/book-serialize";
import { getAuthEmailOrFallback } from "@/lib/supabase/server";

export async function GET() {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const books = await db.book.findMany({
    where: { deletedAt: { not: null }, ownerEmail: userEmail },
    orderBy: { deletedAt: "desc" },
    take: 200,
    include: { chapters: true },
  });

  return NextResponse.json({
    books: books.map((b) => {
      const dto = toBookDto(b, b.chapters);
      return {
        id: dto.id,
        title: dto.title,
        subtitle: dto.subtitle,
        author: dto.author,
        chapterCount: dto.chapters.length,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
        deletedAt: b.deletedAt?.toISOString() ?? null,
      };
    }),
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

  const existing = await db.book.findUnique({ where: { id } });
  if (!existing || existing.ownerEmail !== userEmail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "restore") {
    if (!existing.deletedAt) {
      return NextResponse.json({ ok: true, id, restored: false });
    }
    await db.book.update({
      where: { id },
      data: { deletedAt: null },
    });
    return NextResponse.json({ ok: true, id, restored: true });
  }

  // permanent-delete — actually remove the row. Chapters cascade.
  await db.book.delete({ where: { id } });
  return NextResponse.json({ ok: true, id, deleted: true });
}
