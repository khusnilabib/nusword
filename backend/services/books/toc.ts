/**
 * Book TOC (Table of Contents) API.
 *
 *   GET /books/:id/toc — generate the TOC for a book.
 *
 * Mirrors `src/app/api/books/[id]/toc/route.ts`.
 *
 * Walks the chapter tree, fetches each chapter's document content (via
 * Encore RPC into the documents service — `documents.getDocument`), extracts
 * headings, and estimates page numbers (precise page numbers require the book
 * pagination engine which runs client-side; Phase 9 uses ~2 pages/chapter
 * estimate, same as the prototype).
 *
 * Returns:
 *   - entries: flat array of { id, level, title, pageNumber, isChapter }
 *   - tocJson: Tiptap JSON document containing the rendered TOC
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import type { ChapterNode } from "../../shared/types";
import { collect, db, firstRow } from "./books";
import { asChapterRow, buildChapterTree, type BookChapterRow } from "./_serialize";
import { documents } from "~encore/services/documents";

// ─── Helpers ─────────────────────────────────────────────────────────────

function getEmail(): string {
  const email = auth.data?.email;
  if (!email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return email;
}

/** Minimal Tiptap node shape for TOC heading extraction. */
interface TiptapNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
}

/** TOC entry shape (returned by the API). */
export interface TocEntry {
  id: string;
  level: number;
  title: string;
  /** 1-based page number where this entry starts (null = unknown). */
  pageNumber: number | null;
  /** Chapter (true) or heading within a chapter (false). */
  isChapter: boolean;
}

/** Recursively extract plain text from a Tiptap node (for heading text). */
function extractText(node: TiptapNode | null | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join("");
  return "";
}

/** Walk the chapter tree + extract headings from each chapter's document. */
function generateToc(
  chapters: ChapterNode[],
  chapterContents: Map<string, TiptapNode>,
  chapterPageMap: Map<string, number>,
): TocEntry[] {
  const entries: TocEntry[] = [];

  const walkChapter = (chapter: ChapterNode): void => {
    if (chapter.includeInToc) {
      entries.push({
        id: chapter.id,
        level: chapter.level,
        title: chapter.title,
        pageNumber: chapterPageMap.get(chapter.id) ?? null,
        isChapter: true,
      });
    }

    const content = chapterContents.get(chapter.id);
    if (content?.content) {
      let headingOffset = 0;
      for (const block of content.content) {
        if (block.type === "heading" && block.attrs?.level) {
          const level = block.attrs.level as number;
          const text = extractText(block);
          if (text.trim()) {
            const pageNumber = chapterPageMap.get(chapter.id);
            entries.push({
              id: `${chapter.id}-h${headingOffset}`,
              level: chapter.level + level - 1,
              title: text.trim(),
              pageNumber: pageNumber ? pageNumber + headingOffset : null,
              isChapter: false,
            });
            headingOffset++;
          }
        }
      }
    }

    for (const child of chapter.children) {
      walkChapter(child);
    }
  };

  for (const chapter of chapters) {
    walkChapter(chapter);
  }
  return entries;
}

/** Render the TOC as a Tiptap JSON document (for insertion into a chapter). */
function tocToTiptapJson(entries: TocEntry[]): TiptapNode {
  const paragraphs: TiptapNode[] = entries.map((entry) => {
    const indent = "  ".repeat(Math.max(0, entry.level - 1));
    const pageStr = entry.pageNumber !== null ? String(entry.pageNumber) : "";
    const text = `${indent}${entry.title}`;
    const dots = " ".repeat(Math.max(3, 60 - text.length - pageStr.length));
    return {
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: [{ type: "text", text: `${text}${dots}${pageStr}` }],
    };
  });

  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Table of Contents" }],
      },
      ...paragraphs,
    ],
  };
}

// ─── API ─────────────────────────────────────────────────────────────────

/**
 * GET /books/:id/toc — generate the table of contents.
 *
 * Fetches each chapter's document via Encore RPC (documents service). If a
 * chapter's document can't be loaded (deleted, permission denied), that
 * chapter's headings are skipped silently — matches the prototype's
 * `if (doc)` guard.
 */
export const getToc = api(
  { method: "GET", path: "/books/:id/toc", auth: true },
  async ({ id }: { id: string }): Promise<{ entries: TocEntry[]; tocJson: TiptapNode }> => {
    const email = getEmail();

    // Verify book ownership.
    const book = await firstRow(
      db.query`SELECT owner_email, deleted_at FROM books WHERE id = ${id}`,
    );
    if (!book || book.deleted_at) {
      throw APIError.notFound("Book not found");
    }
    if ((book.owner_email as string) !== email) {
      throw APIError.permissionDenied("You do not have access to this book");
    }

    const rows = await collect(
      db.query`
        SELECT id, book_id, document_id, title, sort_order, parent_id,
               start_new_page, include_in_toc, created_at, updated_at
        FROM book_chapters
        WHERE book_id = ${id}
        ORDER BY sort_order ASC
      `,
    );
    const chapterRows: BookChapterRow[] = rows.map((r) =>
      asChapterRow(r as Record<string, unknown>),
    );
    const chapterTree = buildChapterTree(chapterRows);

    // Fetch each chapter's document content via cross-service RPC.
    // Errors (deleted doc, permission denied) → skip silently.
    const chapterContents = new Map<string, TiptapNode>();
    const chapterPageMap = new Map<string, number>();
    let currentPage = 1;

    for (const chapter of chapterRows) {
      if (chapter.document_id) {
        try {
          const result = await documents.getDocument({ id: chapter.document_id });
          chapterContents.set(chapter.id, result.document.content as TiptapNode);
        } catch {
          // Document not accessible — skip its headings.
        }
      }
      // Estimate page: ~2 pages per chapter for TOC purposes.
      chapterPageMap.set(chapter.id, currentPage);
      currentPage += 2;
    }

    const entries = generateToc(chapterTree, chapterContents, chapterPageMap);
    const tocJson = tocToTiptapJson(entries);

    return { entries, tocJson };
  },
);
