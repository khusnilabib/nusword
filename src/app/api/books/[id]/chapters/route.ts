/**
 * GET  /api/books/[id]/chapters   — list chapters (as a tree)
 * POST /api/books/[id]/chapters   — create a new chapter
 * PUT  /api/books/[id]/chapters   — reorder all chapters (bulk update sortOrder + parentId)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildChapterTree } from "@/lib/nusword/book-serialize";
import { z } from "zod";

const CreateSchema = z.object({
  title: z.string().min(1).max(200).default("Untitled Chapter"),
  parentId: z.string().nullable().optional(),
  documentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const ReorderSchema = z.array(
  z.object({
    id: z.string(),
    sortOrder: z.number().int(),
    parentId: z.string().nullable(),
  }),
);

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const book = await db.book.findUnique({ where: { id } });
  if (!book || book.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const chapters = await db.bookChapter.findMany({
    where: { bookId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ chapters: buildChapterTree(chapters) });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const book = await db.book.findUnique({ where: { id } });
  if (!book || book.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Compute next sort order if not provided.
  let sortOrder = parsed.data.sortOrder;
  if (sortOrder === undefined) {
    const last = await db.bookChapter.findFirst({
      where: { bookId: id, parentId: parsed.data.parentId ?? null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    sortOrder = (last?.sortOrder ?? -1) + 1;
  }

  // Create a document for this chapter if none provided.
  let documentId = parsed.data.documentId ?? null;
  if (!documentId) {
    const doc = await db.document.create({
      data: {
        title: parsed.data.title,
        content: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
        settings: JSON.stringify({ schemaVersion: 1 }),
      },
    });
    documentId = doc.id;
  }

  const chapter = await db.bookChapter.create({
    data: {
      bookId: id,
      documentId,
      title: parsed.data.title,
      sortOrder,
      parentId: parsed.data.parentId ?? null,
    },
  });

  return NextResponse.json({ chapter }, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const book = await db.book.findUnique({ where: { id } });
  if (!book || book.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => []);
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Bulk update sortOrder + parentId for each chapter.
  await db.$transaction(
    parsed.data.map((c) =>
      db.bookChapter.update({
        where: { id: c.id },
        data: { sortOrder: c.sortOrder, parentId: c.parentId },
      }),
    ),
  );

  const chapters = await db.bookChapter.findMany({
    where: { bookId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ chapters: buildChapterTree(chapters) });
}
