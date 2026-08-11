/**
 * PATCH   /api/books/[id]/chapters/[chapterId]  — update chapter title/settings
 * DELETE  /api/books/[id]/chapters/[chapterId]  — delete a chapter
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  documentId: z.string().nullable().optional(),
  startNewPage: z.boolean().optional(),
  includeInToc: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string; chapterId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, chapterId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const chapter = await db.bookChapter.findFirst({
    where: { id: chapterId, bookId: id },
  });
  if (!chapter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.bookChapter.update({
    where: { id: chapterId },
    data: parsed.data,
  });

  return NextResponse.json({ chapter: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, chapterId } = await params;
  const chapter = await db.bookChapter.findFirst({
    where: { id: chapterId, bookId: id },
  });
  if (!chapter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.bookChapter.delete({ where: { id: chapterId } });
  return NextResponse.json({ ok: true, id: chapterId });
}
