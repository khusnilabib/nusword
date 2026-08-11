/**
 * Document Version APIs.
 *
 *   GET  /documents/:id/versions  — list version snapshots (newest first)
 *   POST /documents/:id/versions  — create an immutable version snapshot
 *   PUT  /documents/:id/versions  — restore the document to a specific version
 *
 * Mirrors `src/app/api/documents/[id]/versions/route.ts`.
 *
 * Versions are immutable snapshots of the document's content + settings at
 * the moment of creation (PRD §13: "Keep document versions immutable so
 * users can restore previous states").
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DocumentDTO, DocumentVersionDTO } from "../../shared/types";
import { collect, db, firstRow } from "./documents";
import {
  asDocumentRow,
  asVersionRow,
  toDocumentDTO,
  toVersionDTO,
  type DocumentRow,
  type DocumentVersionRow,
} from "./_serialize";

// ─── Schemas ─────────────────────────────────────────────────────────────

const CreateVersionSchema = z.object({
  message: z.string().max(200).optional(),
});

const RestoreSchema = z.object({
  versionId: z.string().min(1),
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function getEmail(): string {
  const email = auth.data?.email;
  if (!email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return email;
}

/** Fetch a live document row by id. */
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

// ─── APIs ────────────────────────────────────────────────────────────────

/**
 * GET /documents/:id/versions — list version snapshots (newest first).
 *
 * Returns up to 50 most-recent versions.
 */
export const listVersions = api(
  { method: "GET", path: "/documents/:id/versions", auth: true },
  async ({ id }: { id: string }): Promise<{ versions: DocumentVersionDTO[] }> => {
    const email = getEmail();
    await fetchAccessibleDoc(id, email);
    const rows = await collect(
      db.query`
        SELECT id, document_id, content, settings, version, message, created_at
        FROM document_versions
        WHERE document_id = ${id}
        ORDER BY version DESC
        LIMIT 50
      `,
    );
    return {
      versions: rows.map((r) =>
        toVersionDTO(asVersionRow(r as Record<string, unknown>)),
      ),
    };
  },
);

/**
 * POST /documents/:id/versions — create an immutable version snapshot.
 *
 * Captures the current content + settings of the document as a new version
 * row. The version number is the next sequential integer for this document.
 */
export const createVersion = api(
  { method: "POST", path: "/documents/:id/versions", auth: true },
  async (params: {
    id: string;
    message?: string;
  }): Promise<{ version: DocumentVersionDTO }> => {
    const { id, ...rest } = params;
    const email = getEmail();
    const doc = await fetchAccessibleDoc(id, email, /* requireEditor */ true);

    const parsed = CreateVersionSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Compute next version number (max + 1).
    const latest = await firstRow(
      db.query`
        SELECT version FROM document_versions
        WHERE document_id = ${id}
        ORDER BY version DESC
        LIMIT 1
      `,
    );
    const nextVersion = ((latest?.version as number) ?? 0) + 1;
    const versionId = randomUUID();
    const message = parsed.data.message ?? null;

    await db.exec`
      INSERT INTO document_versions (id, document_id, content, settings, version, message)
      VALUES (${versionId}, ${id}, ${doc.content}, ${doc.settings}, ${nextVersion},
              ${message})
    `;

    const row = await firstRow(
      db.query`
        SELECT id, document_id, content, settings, version, message, created_at
        FROM document_versions WHERE id = ${versionId}
      `,
    );
    if (!row) {
      throw APIError.internal("Failed to load created version");
    }
    return { version: toVersionDTO(asVersionRow(row as Record<string, unknown>)) };
  },
);

/**
 * PUT /documents/:id/versions — restore the document to a specific version.
 *
 * Body: `{ versionId }`. Copies the version's content + settings back into
 * the live document row (does NOT delete other versions — restoring is
 * non-destructive so users can re-roll forward).
 */
export const restoreVersion = api(
  { method: "PUT", path: "/documents/:id/versions", auth: true },
  async (params: {
    id: string;
    versionId: string;
  }): Promise<{ document: DocumentDTO }> => {
    const { id, versionId } = params;
    const email = getEmail();
    await fetchAccessibleDoc(id, email, /* requireEditor */ true);

    const parsed = RestoreSchema.safeParse({ versionId });
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    const vRow = await firstRow(
      db.query`
        SELECT id, document_id, content, settings, version, message, created_at
        FROM document_versions WHERE id = ${versionId}
      `,
    );
    if (!vRow) {
      throw APIError.notFound("Version not found");
    }
    const version = asVersionRow(vRow as Record<string, unknown>);
    if (version.document_id !== id) {
      throw APIError.notFound("Version not found");
    }

    // Restore: copy version content + settings back into the live document.
    await db.exec`
      UPDATE documents
      SET content = ${version.content},
          settings = ${version.settings},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    const row = await fetchDocRow(id);
    if (!row) {
      throw APIError.internal("Failed to load restored document");
    }
    return { document: toDocumentDTO(row) };
  },
);
