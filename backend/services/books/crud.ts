/**
 * Books CRUD APIs.
 *
 *   GET    /books        — list the caller's books (excl. trashed, summary)
 *   POST   /books        — create a new book
 *   GET    /books/:id    — get a single book with chapter tree
 *   PATCH  /books/:id    — update title/subtitle/author/settings/matter
 *   DELETE /books/:id    — soft-delete a book
 *
 * RPC helpers (callable cross-service via ~encore/services/books):
 *   countByOwner({ email })  — count of live books owned by email
 *   countByOrg({ orgId })    — count of live books owned by org
 *
 * Mirrors `src/app/api/books/route.ts` and `src/app/api/books/[id]/route.ts`.
 * List view returns a summary (no chapter tree); single-book view returns
 * the full DTO with chapters.
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { BookDTO } from "../../shared/types";
import { collect, db, firstRow } from "./books";
import {
  asBookRow,
  asChapterRow,
  DEFAULT_BOOK_SETTINGS,
  parseBookSettings,
  parseMatterEntries,
  stringifyBookSettings,
  stringifyMatterEntries,
  toBookDTO,
  type BookChapterRow,
  type BookRow,
} from "./_serialize";

// ─── Schemas ─────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
  organizationId: z.string().optional(),
});

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(200).nullable().optional(),
  author: z.string().max(200).nullable().optional(),
  settings: z.any().optional(),
  frontMatter: z.array(z.any()).optional(),
  backMatter: z.array(z.any()).optional(),
  organizationId: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function getEmail(): string {
  const email = auth.data?.email;
  if (!email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return email;
}

/** Fetch a book row by id (no ownership check). */
async function fetchBookRow(id: string): Promise<BookRow | null> {
  const row = await firstRow(
    db.query`
      SELECT id, owner_email, title, subtitle, author, settings,
             front_matter, back_matter, organization_id,
             created_at, updated_at, deleted_at
      FROM books WHERE id = ${id}
    `,
  );
  if (!row) return null;
  return asBookRow(row as Record<string, unknown>);
}

/** Fetch a live book owned by the caller (must not be trashed). */
async function fetchOwnedBook(id: string, email: string): Promise<BookRow> {
  const row = await fetchBookRow(id);
  if (!row || row.deleted_at) {
    throw APIError.notFound("Book not found");
  }
  if (row.owner_email !== email) {
    throw APIError.permissionDenied("You do not have access to this book");
  }
  return row;
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

// ─── HTTP APIs ───────────────────────────────────────────────────────────

/**
 * GET /books — list the caller's books (excl. trashed).
 *
 * Returns a summary list (no chapter tree) — the frontend only needs the
 * chapter count for the list view. Chapter counts are computed via a
 * correlated subquery to avoid N+1.
 */
export const listBooks = api(
  { method: "GET", path: "/books", auth: true },
  async (): Promise<{
    books: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      author: string | null;
      chapterCount: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }> => {
    const email = getEmail();
    const rows = await collect(
      db.query`
        SELECT
          b.id, b.owner_email, b.title, b.subtitle, b.author, b.settings,
          b.front_matter, b.back_matter, b.organization_id,
          b.created_at, b.updated_at, b.deleted_at,
          (SELECT COUNT(*)::int FROM book_chapters c WHERE c.book_id = b.id) AS chapter_count
        FROM books b
        WHERE b.owner_email = ${email} AND b.deleted_at IS NULL
        ORDER BY b.updated_at DESC
        LIMIT 100
      `,
    );
    return {
      books: rows.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id as string,
          title: row.title as string,
          subtitle: (row.subtitle as string | null) ?? null,
          author: (row.author as string | null) ?? null,
          chapterCount: (row.chapter_count as number) ?? 0,
          createdAt: (row.created_at instanceof Date
            ? row.created_at
            : new Date(row.created_at as string)
          ).toISOString(),
          updatedAt: (row.updated_at instanceof Date
            ? row.updated_at
            : new Date(row.updated_at as string)
          ).toISOString(),
        };
      }),
    };
  },
);

/**
 * POST /books — create a new book owned by the caller.
 */
export const createBook = api(
  { method: "POST", path: "/books", auth: true },
  async (body: {
    title?: string;
    subtitle?: string;
    author?: string;
    organizationId?: string;
  }): Promise<{ book: BookDTO }> => {
    const email = getEmail();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    const id = randomUUID();
    const title = parsed.data.title ?? "Untitled Book";
    const subtitle = parsed.data.subtitle ?? null;
    const author = parsed.data.author ?? null;
    const settings = stringifyBookSettings({ ...DEFAULT_BOOK_SETTINGS });
    const orgId = parsed.data.organizationId ?? null;

    await db.exec`
      INSERT INTO books
        (id, owner_email, title, subtitle, author, settings, organization_id)
      VALUES
        (${id}, ${email}, ${title}, ${subtitle}, ${author}, ${settings}, ${orgId})
    `;

    const row = await fetchBookRow(id);
    if (!row) {
      throw APIError.internal("Failed to load created book");
    }
    return { book: toBookDTO(row, []) };
  },
);

/**
 * GET /books/:id — get a single book with the full chapter tree.
 */
export const getBook = api(
  { method: "GET", path: "/books/:id", auth: true },
  async ({ id }: { id: string }): Promise<{ book: BookDTO }> => {
    const email = getEmail();
    const row = await fetchOwnedBook(id, email);
    const chapters = await fetchChapters(id);
    return { book: toBookDTO(row, chapters) };
  },
);

/**
 * PATCH /books/:id — update book fields.
 *
 * Updates title/subtitle/author/settings/frontMatter/backMatter. Each field
 * is optional; omitted fields keep their existing value. Settings and matter
 * are re-stringified through the parser to canonicalise (mirrors prototype).
 */
export const updateBook = api(
  { method: "PATCH", path: "/books/:id", auth: true },
  async (params: {
    id: string;
    title?: string;
    subtitle?: string | null;
    author?: string | null;
    settings?: unknown;
    frontMatter?: unknown[];
    backMatter?: unknown[];
    organizationId?: string;
  }): Promise<{ book: BookDTO }> => {
    const { id, ...rest } = params;
    const email = getEmail();
    const existing = await fetchOwnedBook(id, email);

    const parsed = PatchSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Compute next column values (avoids dynamic SQL — Encore's SQLDatabase
    // only accepts tagged-template queries).
    const nextTitle = parsed.data.title ?? existing.title;
    const nextSubtitle =
      parsed.data.subtitle !== undefined ? parsed.data.subtitle : existing.subtitle;
    const nextAuthor =
      parsed.data.author !== undefined ? parsed.data.author : existing.author;
    const nextSettings =
      parsed.data.settings !== undefined
        ? stringifyBookSettings(parseBookSettings(stringifyBookSettings(parsed.data.settings)))
        : existing.settings;
    const nextFrontMatter =
      parsed.data.frontMatter !== undefined
        ? stringifyMatterEntries(parseMatterEntries(stringifyMatterEntries(parsed.data.frontMatter)))
        : existing.front_matter;
    const nextBackMatter =
      parsed.data.backMatter !== undefined
        ? stringifyMatterEntries(parseMatterEntries(stringifyMatterEntries(parsed.data.backMatter)))
        : existing.back_matter;
    const nextOrgId =
      parsed.data.organizationId !== undefined
        ? parsed.data.organizationId
        : existing.organization_id;

    await db.exec`
      UPDATE books
      SET title        = ${nextTitle},
          subtitle     = ${nextSubtitle},
          author       = ${nextAuthor},
          settings     = ${nextSettings},
          front_matter = ${nextFrontMatter},
          back_matter  = ${nextBackMatter},
          organization_id = ${nextOrgId},
          updated_at   = NOW()
      WHERE id = ${id}
    `;

    const row = await fetchBookRow(id);
    if (!row) {
      throw APIError.internal("Failed to load updated book");
    }
    const chapters = await fetchChapters(id);
    return { book: toBookDTO(row, chapters) };
  },
);

/**
 * DELETE /books/:id — soft-delete a book (move to trash).
 *
 * The book row is retained for the retention window; chapter rows are kept
 * too (they cascade-delete only when the book row is hard-deleted).
 */
export const deleteBook = api(
  { method: "DELETE", path: "/books/:id", auth: true },
  async ({ id }: { id: string }): Promise<{ ok: true; id: string }> => {
    const email = getEmail();
    const row = await fetchBookRow(id);
    if (!row) {
      throw APIError.notFound("Book not found");
    }
    if (row.owner_email !== email) {
      throw APIError.permissionDenied("Only the owner can delete this book");
    }
    await db.exec`
      UPDATE books SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `;
    return { ok: true, id };
  },
);

// ─── Cross-service RPC helpers ───────────────────────────────────────────
//
// These are NOT HTTP endpoints (no `path`). They are exported functions that
// other Encore services call via `import { books } from "~encore/services/books"`.
// The shapes here must match the declarations in /backend/encore.d.ts.

/**
 * countByOwner — count live (non-deleted) books owned by the given email.
 * Used by the usage service for the dashboard stats card.
 */
export const countByOwner = api(
  { auth: true },
  async (params: { email: string }): Promise<{ count: number }> => {
    const row = await firstRow(
      db.query`
        SELECT COUNT(*)::int AS count FROM books
        WHERE owner_email = ${params.email} AND deleted_at IS NULL
      `,
    );
    return { count: (row?.count as number) ?? 0 };
  },
);

/**
 * countByOrg — count live books owned by the given organization.
 * Used by the organizations service to populate `bookCount` in the org DTO.
 */
export const countByOrg = api(
  { auth: true },
  async (params: { orgId: string }): Promise<{ count: number }> => {
    const row = await firstRow(
      db.query`
        SELECT COUNT(*)::int AS count FROM books
        WHERE organization_id = ${params.orgId} AND deleted_at IS NULL
      `,
    );
    return { count: (row?.count as number) ?? 0 };
  },
);
