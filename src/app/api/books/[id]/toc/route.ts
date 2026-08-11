/**
 * GET /api/books/[id]/toc — generate the table of contents for a book.
 *
 * Walks the chapter tree, fetches each chapter's document content, extracts
 * headings, and resolves page numbers (estimated for Phase 5; precise page
 * numbers require the book pagination engine which runs client-side).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateToc, tocToTiptapJson } from "@/lib/nusword/toc";
import { buildChapterTree } from "@/lib/nusword/book-serialize";
import { parseContent } from "@/lib/nusword/serialize";
import type { JSONContent } from "@tiptap/react";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const book = await db.book.findUnique({
    where: { id },
    include: { chapters: { orderBy: { sortOrder: "asc" } } },
  });
  if (!book || book.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const chapterTree = buildChapterTree(book.chapters);

  // Fetch all chapter documents.
  const chapterContents = new Map<string, JSONContent>();
  const chapterPageMap = new Map<string, number>();
  let currentPage = 1;

  for (const chapter of book.chapters.sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (chapter.documentId) {
      const doc = await db.document.findUnique({ where: { id: chapter.documentId } });
      if (doc) {
        chapterContents.set(chapter.id, parseContent(doc.content));
      }
    }
    // Estimate page: ~2 pages per chapter for TOC purposes.
    chapterPageMap.set(chapter.id, currentPage);
    currentPage += 2;
  }

  const tocEntries = generateToc(chapterTree, chapterContents, chapterPageMap);
  const tocJson = tocToTiptapJson(tocEntries);

  return NextResponse.json({
    entries: tocEntries,
    tocJson,
  });
}
