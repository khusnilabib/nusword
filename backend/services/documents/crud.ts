/**
 * Documents CRUD APIs.
 *
 *   GET    /documents        — list the authenticated user's documents (excl. trashed)
 *   POST   /documents        — create a new document
 *   GET    /documents/:id    — get a single document
 *   PATCH  /documents/:id    — update title/content/settings (used by editor autosave)
 *   DELETE /documents/:id    — soft-delete (move to trash)
 *
 * RPC helpers (callable cross-service via ~encore/services/documents):
 *   createFromTemplate({ title, content, settings, ownerEmail, organizationId? })
 *   countByOwner({ email })         — count of live docs owned by email
 *   countExportsByOwner({ email })  — count of export jobs for those docs
 *   countByOrg({ orgId })           — count of live docs owned by org
 *
 * Mirrors `src/app/api/documents/route.ts` and `src/app/api/documents/[id]/route.ts`
 * but with per-user ownership (owner_email from auth) instead of the single-user prototype.
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DocumentDTO } from "../../shared/types";
import { collect, db, firstRow } from "./documents";
import {
  asDocumentRow,
  DEFAULT_PAGE_SETTINGS,
  EMPTY_DOC,
  parseContent,
  parseSettings,
  stringifyContent,
  stringifySettings,
  toDocumentDTO,
  type DocumentRow,
} from "./_serialize";

// ─── Schemas ─────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  organizationId: z.string().optional(),
});

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
  settings: z.any().optional(),
  organizationId: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Read the authenticated user's email from the Encore auth context. */
function getEmail(): string {
  const email = auth.data?.email;
  if (!email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return email;
}

/** Fetch a live document row by id (no ownership check). */
async function fetchDocRow(id: string): Promise<DocumentRow | null> {
  const row = await firstRow(
    db.query`
      SELECT id, owner_email, title, content, settings, organization_id,
             created_at, updated_at, deleted_at
      FROM documents WHERE id = ${id}
    `,
  );
  if (!row) return null;
  return asDocumentRow(row as Record<string, unknown>);
}

/** Fetch a live document accessible to the caller (owner or sharee). */
async function fetchAccessibleDoc(
  id: string,
  email: string,
  requireEditor = false,
): Promise<DocumentRow> {
  const row = await fetchDocRow(id);
  if (!row || row.deleted_at) {
    throw APIError.notFound("Document not found");
  }
  if (row.owner_email !== email) {
    // Check share.
    const share = await firstRow(
      db.query`
        SELECT role FROM shared_documents
        WHERE document_id = ${id} AND shared_with_email = ${email}
        LIMIT 1
      `,
    );
    if (!share) {
      throw APIError.permissionDenied("You do not have access to this document");
    }
    const role = share.role as string;
    if (requireEditor && role !== "editor") {
      throw APIError.permissionDenied("Editor access required");
    }
  }
  return row;
}

// ─── HTTP APIs ───────────────────────────────────────────────────────────

/**
 * GET /documents — list the authenticated user's documents (excl. trashed).
 *
 * Returns the 100 most-recently-updated documents owned by the caller.
 * Mirrors the prototype's `db.document.findMany({ where: { deletedAt: null } })`
 * but filtered by owner_email.
 */
export const listDocuments = api(
  { method: "GET", path: "/documents", auth: true },
  async (): Promise<{ documents: DocumentDTO[] }> => {
    const email = getEmail();
    const rows = await collect(
      db.query`
        SELECT id, owner_email, title, content, settings, organization_id,
               created_at, updated_at, deleted_at
        FROM documents
        WHERE owner_email = ${email} AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 100
      `,
    );
    return {
      documents: rows.map((r) =>
        toDocumentDTO(asDocumentRow(r as Record<string, unknown>)),
      ),
    };
  },
);

/**
 * POST /documents — create a new document owned by the caller.
 *
 * Body: `{ title?, organizationId? }` — both optional.
 * Returns the created document.
 */
export const createDocument = api(
  { method: "POST", path: "/documents", auth: true },
  async (body: {
    title?: string;
    organizationId?: string;
  }): Promise<{ document: DocumentDTO }> => {
    const email = getEmail();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    const id = randomUUID();
    const title = parsed.data.title ?? "Untitled";
    const content = stringifyContent(EMPTY_DOC);
    const settings = stringifySettings({ ...DEFAULT_PAGE_SETTINGS });
    const orgId = parsed.data.organizationId ?? null;

    await db.exec`
      INSERT INTO documents (id, owner_email, title, content, settings, organization_id)
      VALUES (${id}, ${email}, ${title}, ${content}, ${settings}, ${orgId})
    `;

    const row = await fetchDocRow(id);
    if (!row) {
      throw APIError.internal("Failed to load created document");
    }
    return { document: toDocumentDTO(row) };
  },
);

/**
 * GET /documents/:id — get a single document.
 *
 * Access: owner OR any user with an active share (editor/commenter/viewer).
 */
export const getDocument = api(
  { method: "GET", path: "/documents/:id", auth: true },
  async ({ id }: { id: string }): Promise<{ document: DocumentDTO }> => {
    const email = getEmail();
    const row = await fetchAccessibleDoc(id, email);
    return { document: toDocumentDTO(row) };
  },
);

/**
 * PATCH /documents/:id — update title/content/settings.
 *
 * Used by the editor's autosave loop. Only the owner or a sharee with editor
 * role can update. Content/settings are re-stringified through the parser to
 * canonicalise (mirrors the prototype behaviour).
 */
export const updateDocument = api(
  { method: "PATCH", path: "/documents/:id", auth: true },
  async (params: {
    id: string;
    title?: string;
    content?: unknown;
    settings?: unknown;
    organizationId?: string;
  }): Promise<{ document: DocumentDTO }> => {
    const { id, ...rest } = params;
    const email = getEmail();
    const existing = await fetchAccessibleDoc(id, email, /* requireEditor */ true);

    const parsed = PatchSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Compute next column values. Where the caller didn't supply a field,
    // keep the existing value (avoids needing dynamic SQL — Encore's
    // SQLDatabase is built around tagged-template queries).
    const nextTitle = parsed.data.title ?? existing.title;
    const nextContent =
      parsed.data.content !== undefined
        ? stringifyContent(parseContent(stringifyContent(parsed.data.content)))
        : existing.content;
    const nextSettings =
      parsed.data.settings !== undefined
        ? stringifySettings(parseSettings(stringifySettings(parsed.data.settings)))
        : existing.settings;
    const nextOrgId =
      parsed.data.organizationId !== undefined
        ? parsed.data.organizationId
        : existing.organization_id;

    await db.exec`
      UPDATE documents
      SET title           = ${nextTitle},
          content         = ${nextContent},
          settings        = ${nextSettings},
          organization_id = ${nextOrgId},
          updated_at      = NOW()
      WHERE id = ${id}
    `;

    const row = await fetchDocRow(id);
    if (!row) {
      throw APIError.internal("Failed to load updated document");
    }
    return { document: toDocumentDTO(row) };
  },
);

/**
 * DELETE /documents/:id — soft-delete (move to trash).
 *
 * Sets deleted_at; the row is retained for the retention window (PRD §25)
 * before being permanently purged by a separate cleanup job.
 */
export const deleteDocument = api(
  { method: "DELETE", path: "/documents/:id", auth: true },
  async ({ id }: { id: string }): Promise<{ ok: true; id: string }> => {
    const email = getEmail();
    // Only the owner can delete (shares cannot delete).
    const row = await fetchDocRow(id);
    if (!row) {
      throw APIError.notFound("Document not found");
    }
    if (row.owner_email !== email) {
      throw APIError.permissionDenied("Only the owner can delete this document");
    }
    await db.exec`
      UPDATE documents SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `;
    return { ok: true, id };
  },
);

// ─── Cross-service RPC helpers ───────────────────────────────────────────
//
// These are NOT HTTP endpoints (no `path`). They are exported functions that
// other Encore services call via `import { documents } from "~encore/services/documents"`.
// Encore generates the RPC client at build time.
//
// The shapes here must match the declarations in /backend/encore.d.ts.

/**
 * createFromTemplate — create a new document from a template's pre-stringified
 * content + settings. Used by the templates service's POST /templates/:id/use
 * endpoint to instantiate a template into a new document.
 *
 * Note: takes ownerEmail as an explicit param (rather than reading auth.data)
 * because the templates service has already authenticated the caller — passing
 * the email through keeps this RPC callable from any authenticated context.
 */
export const createFromTemplate = api(
  { auth: true },
  async (params: {
    title: string;
    /** Pre-stringified Tiptap JSON document content. */
    content: string;
    /** Pre-stringified PageSettings JSON. */
    settings: string;
    ownerEmail: string;
    organizationId?: string;
  }): Promise<{ document: DocumentDTO }> => {
    const id = randomUUID();
    const orgId = params.organizationId ?? null;

    await db.exec`
      INSERT INTO documents (id, owner_email, title, content, settings, organization_id)
      VALUES (${id}, ${params.ownerEmail}, ${params.title},
              ${params.content}, ${params.settings}, ${orgId})
    `;

    const row = await fetchDocRow(id);
    if (!row) {
      throw APIError.internal("Failed to load created document");
    }
    return { document: toDocumentDTO(row) };
  },
);

/**
 * countByOwner — count live (non-deleted) documents owned by the given email.
 * Used by the usage service for the dashboard stats card.
 */
export const countByOwner = api(
  { auth: true },
  async (params: { email: string }): Promise<{ count: number }> => {
    const row = await firstRow(
      db.query`
        SELECT COUNT(*)::int AS count FROM documents
        WHERE owner_email = ${params.email} AND deleted_at IS NULL
      `,
    );
    return { count: (row?.count as number) ?? 0 };
  },
);

/**
 * countExportsByOwner — count export jobs for documents owned by the given email.
 * Used by the usage service for the dashboard stats card.
 */
export const countExportsByOwner = api(
  { auth: true },
  async (params: { email: string }): Promise<{ count: number }> => {
    const row = await firstRow(
      db.query`
        SELECT COUNT(*)::int AS count
        FROM export_jobs j
        JOIN documents d ON d.id = j.document_id
        WHERE d.owner_email = ${params.email}
      `,
    );
    return { count: (row?.count as number) ?? 0 };
  },
);

/**
 * countByOrg — count live documents owned by the given organization.
 * Used by the organizations service to populate `documentCount` in the org DTO.
 */
export const countByOrg = api(
  { auth: true },
  async (params: { orgId: string }): Promise<{ count: number }> => {
    const row = await firstRow(
      db.query`
        SELECT COUNT(*)::int AS count FROM documents
        WHERE organization_id = ${params.orgId} AND deleted_at IS NULL
      `,
    );
    return { count: (row?.count as number) ?? 0 };
  },
);
