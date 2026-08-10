/**
 * Book Chapter APIs.
 *
 *   GET    /books/:id/chapters                    — list chapters as a tree
 *   POST   /books/:id/chapters                    — create a new chapter
 *   PUT    /books/:id/chapters                    — bulk reorder (sort + parent)
 *   PATCH   /books/:id/chapters/:chapterId        — update chapter fields
 *   DELETE  /books/:id/chapters/:chapterId        — delete a chapter
 *
 * Mirrors `src/app/api/books/[id]/chapters/route.ts` and
 * `src/app/api/books/[id]/chapters/[chapterId]/route.ts`.
 *
 * Chapter content lives in the documents service — POST /chapters creates a
 * new document in the documents DB if `documentId` is not supplied. The
 * chapter row references that document via `document_id` (cross-service FK).
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ChapterNode } from "../../shared/types";
import { collect, db, firstRow } from "./books";
import {
  asChapterRow,
  buildChapterTree,
  toChapterNode,
  type BookChapterRow,
} from "./_serialize";
import { documents } from "~encore/services/documents";

// ─── Schemas ─────────────────────────────────────────────────────────────

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

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  documentId: z.string().nullable().optional(),
  startNewPage: z.boolean().optional(),
  includeInToc: z.boolean().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function getEmail(): string {
  const email = auth.data?.email;
  if (!email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return email;
}

/** Ensure the caller owns the book (returns nothing — used as a guard). */
async function requireOwnedBook(id: string, email: string): Promise<void> {
  const row = await firstRow(
    db.query`SELECT owner_email, deleted_at FROM books WHERE id = ${id}`,
  );
  if (!row || row.deleted_at) {
    throw APIError.notFound("Book not found");
  }
  if ((row.owner_email as string) !== email) {
    throw APIError.permissionDenied("You do not have access to this book");
  }
}

/** Fetch all chapter rows for a book (sorted by sort_order). */
async function fetchChapters(bookId: string): Promise<BookChapterRow[]> {
  const rows = await collect(
    db.query`
      SELECT id, book_id, document_id, title, sort_order, parent_id,
             start_new_page, include_in_toc, created_at, updated_at
      FROM book_chapters
      WHERE book_id = ${bookId}
      ORDER BY sort_order ASC
    `,
  );
  return rows.map((r) => asChapterRow(r as Record<string, unknown>));
}

/** Compute a chapter's depth (1-based) by walking up its parent chain. */
async function computeChapterLevel(parentId: string | null): Promise<number> {
  let level = 1;
  let currentParent = parentId;
  // Cap at 20 levels to prevent infinite loops from data corruption.
  for (let i = 0; i < 20 && currentParent; i++) {
    const parent = await firstRow(
      db.query`SELECT parent_id FROM book_chapters WHERE id = ${currentParent}`,
    );
    if (!parent) break;
    level++;
    currentParent = (parent.parent_id as string | null) ?? null;
  }
  return level;
}

// ─── APIs ────────────────────────────────────────────────────────────────

/**
 * GET /books/:id/chapters — list chapters as a tree.
 *
 * Returns the chapter tree (nested via parent_id, sorted by sort_order).
 */
export const listChapters = api(
  { method: "GET", path: "/books/:id/chapters", auth: true },
  async ({ id }: { id: string }): Promise<{ chapters: ChapterNode[] }> => {
    const email = getEmail();
    await requireOwnedBook(id, email);
    const chapters = await fetchChapters(id);
    return { chapters: buildChapterTree(chapters) };
  },
);

/**
 * POST /books/:id/chapters — create a new chapter.
 *
 * If `documentId` is not supplied, a new empty document is created in the
 * documents service (via Encore RPC: `documents.createDocument`). The
 * chapter then references that document via `document_id`.
 *
 * Sort order: if not provided, computed as (max existing sort_order in the
 * same parent) + 1.
 */
export const createChapter = api(
  { method: "POST", path: "/books/:id/chapters", auth: true },
  async (params: {
    id: string;
    title?: string;
    parentId?: string | null;
    documentId?: string | null;
    sortOrder?: number;
  }): Promise<{ chapter: ChapterNode }> => {
    const { id, ...rest } = params;
    const email = getEmail();
    await requireOwnedBook(id, email);

    const parsed = CreateSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Compute next sort order if not provided.
    let sortOrder = parsed.data.sortOrder;
    if (sortOrder === undefined) {
      const last = await firstRow(
        db.query`
          SELECT sort_order FROM book_chapters
          WHERE book_id = ${id} AND parent_id IS NOT DISTINCT FROM ${parsed.data.parentId ?? null}
          ORDER BY sort_order DESC
          LIMIT 1
        `,
      );
      sortOrder = ((last?.sort_order as number) ?? -1) + 1;
    }

    // Create a document for this chapter if none provided (Encore RPC into
    // the documents service — auth context propagates automatically).
    let documentId = parsed.data.documentId ?? null;
    if (!documentId) {
      const result = await documents.createDocument({
        title: parsed.data.title,
      });
      documentId = result.document.id;
    }

    const chapterId = randomUUID();
    const parentId = parsed.data.parentId ?? null;
    await db.exec`
      INSERT INTO book_chapters
        (id, book_id, document_id, title, sort_order, parent_id)
      VALUES
        (${chapterId}, ${id}, ${documentId}, ${parsed.data.title},
         ${sortOrder}, ${parentId})
    `;

    const row = await firstRow(
      db.query`
        SELECT id, book_id, document_id, title, sort_order, parent_id,
               start_new_page, include_in_toc, created_at, updated_at
        FROM book_chapters WHERE id = ${chapterId}
      `,
    );
    if (!row) {
      throw APIError.internal("Failed to load created chapter");
    }
    const chapter = asChapterRow(row as Record<string, unknown>);
    const level = await computeChapterLevel(chapter.parent_id);
    return { chapter: toChapterNode(chapter, level, []) };
  },
);

/**
 * PUT /books/:id/chapters — bulk reorder all chapters.
 *
 * Body: array of `{ id, sortOrder, parentId }`. Updates sort_order + parent_id
 * for each chapter via a series of `db.exec` calls (Encore's SQLDatabase
 * does not currently expose a `db.$transaction` primitive on the public API;
 * for atomic reorder, wrap in `await using tx = await db.begin()`).
 *
 * Returns the rebuilt chapter tree.
 */
export const reorderChapters = api(
  { method: "PUT", path: "/books/:id/chapters", auth: true },
  async (params: {
    id: string;
    body: Array<{ id: string; sortOrder: number; parentId: string | null }>;
  }): Promise<{ chapters: ChapterNode[] }> => {
    const { id, body } = params;
    const email = getEmail();
    await requireOwnedBook(id, email);

    const parsed = ReorderSchema.safeParse(body);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Bulk update sort_order + parent_id for each chapter.
    // Wrap in a transaction so partial failures roll back.
    await using tx = await db.begin();
    for (const c of parsed.data) {
      await tx.exec`
        UPDATE book_chapters
        SET sort_order = ${c.sortOrder},
            parent_id  = ${c.parentId},
            updated_at = NOW()
        WHERE id = ${c.id} AND book_id = ${id}
      `;
    }
    await tx.commit();

    const chapters = await fetchChapters(id);
    return { chapters: buildChapterTree(chapters) };
  },
);

/**
 * PATCH /books/:id/chapters/:chapterId — update chapter fields.
 *
 * Updates title / documentId / startNewPage / includeInToc.
 */
export const updateChapter = api(
  {
    method: "PATCH",
    path: "/books/:id/chapters/:chapterId",
    auth: true,
  },
  async (params: {
    id: string;
    chapterId: string;
    title?: string;
    documentId?: string | null;
    startNewPage?: boolean;
    includeInToc?: boolean;
  }): Promise<{ chapter: ChapterNode }> => {
    const { id, chapterId, ...rest } = params;
    const email = getEmail();
    await requireOwnedBook(id, email);

    const parsed = PatchSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    const existing = await firstRow(
      db.query`
        SELECT id, book_id, document_id, title, sort_order, parent_id,
               start_new_page, include_in_toc, created_at, updated_at
        FROM book_chapters WHERE id = ${chapterId} AND book_id = ${id}
      `,
    );
    if (!existing) {
      throw APIError.notFound("Chapter not found");
    }
    const existingRow = asChapterRow(existing as Record<string, unknown>);

    // Compute next column values (avoids dynamic SQL).
    const nextTitle = parsed.data.title ?? existingRow.title;
    const nextDocumentId =
      parsed.data.documentId !== undefined ? parsed.data.documentId : existingRow.document_id;
    const nextStartNewPage =
      parsed.data.startNewPage !== undefined ? parsed.data.startNewPage : existingRow.start_new_page;
    const nextIncludeInToc =
      parsed.data.includeInToc !== undefined ? parsed.data.includeInToc : existingRow.include_in_toc;

    await db.exec`
      UPDATE book_chapters
      SET title           = ${nextTitle},
          document_id     = ${nextDocumentId},
          start_new_page  = ${nextStartNewPage},
          include_in_toc  = ${nextIncludeInToc},
          updated_at      = NOW()
      WHERE id = ${chapterId}
    `;

    const row = await firstRow(
      db.query`
        SELECT id, book_id, document_id, title, sort_order, parent_id,
               start_new_page, include_in_toc, created_at, updated_at
        FROM book_chapters WHERE id = ${chapterId}
      `,
    );
    if (!row) {
      throw APIError.internal("Failed to load updated chapter");
    }
    const chapter = asChapterRow(row as Record<string, unknown>);
    const level = await computeChapterLevel(chapter.parent_id);
    return { chapter: toChapterNode(chapter, level, []) };
  },
);

/**
 * DELETE /books/:id/chapters/:chapterId — delete a chapter.
 *
 * Deletes only the chapter row (the linked document is left intact in the
 * documents service — orphan documents can be cleaned up separately, or the
 * user can re-attach the document to another chapter). Child chapters are
 * re-parented to the deleted chapter's parent before deletion so the tree
 * doesn't lose them.
 */
export const deleteChapter = api(
  {
    method: "DELETE",
    path: "/books/:id/chapters/:chapterId",
    auth: true,
  },
  async (params: { id: string; chapterId: string }): Promise<{ ok: true; id: string }> => {
    const { id, chapterId } = params;
    const email = getEmail();
    await requireOwnedBook(id, email);

    const existing = await firstRow(
      db.query`SELECT id FROM book_chapters WHERE id = ${chapterId} AND book_id = ${id}`,
    );
    if (!existing) {
      throw APIError.notFound("Chapter not found");
    }

    // Re-parent any children of this chapter to its parent (so the tree
    // doesn't lose them) before deleting. Mirrors typical chapter-tree
    // delete semantics.
    await db.exec`
      UPDATE book_chapters
      SET parent_id = (SELECT parent_id FROM book_chapters WHERE id = ${chapterId})
      WHERE parent_id = ${chapterId}
    `;
    await db.exec`
      DELETE FROM book_chapters WHERE id = ${chapterId}
    `;
    return { ok: true, id: chapterId };
  },
);
