/**
 * Document Sharing APIs (PRD §19 — RBAC / Sharing).
 *
 *   GET    /documents/:id/shares                — list shares for a document
 *   POST   /documents/:id/shares                — share with an email + role
 *   PATCH  /documents/:id/shares/:shareId       — update share role
 *   DELETE /documents/:id/shares/:shareId       — revoke a share
 *
 * Mirrors `src/app/api/documents/[id]/shares/route.ts` and `.../[shareId]/route.ts`.
 *
 * Sharing is separate from ownership: a document is owned by one user (via
 * owner_email) and can be shared with any number of other users by email,
 * each with their own role (editor / commenter / viewer).
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ShareDTO, ShareRole } from "../../shared/types";
import { collect, db, firstRow } from "./documents";
import {
  asShareRow,
  toShareDTO,
  type SharedDocumentRow,
} from "./_serialize";

// ─── Schemas ─────────────────────────────────────────────────────────────

const ShareSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "commenter", "viewer"]).default("viewer"),
});

const PatchShareSchema = z.object({
  role: z.enum(["editor", "commenter", "viewer"]),
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function getEmail(): string {
  const email = auth.data?.email;
  if (!email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return email;
}

/** Fetch a live document owned by the caller. Sharing ops are owner-only. */
async function fetchOwnedDocTitle(
  id: string,
  email: string,
): Promise<{ id: string; title: string }> {
  const row = await firstRow(
    db.query`SELECT id, title, deleted_at, owner_email FROM documents WHERE id = ${id}`,
  );
  if (!row || row.deleted_at) {
    throw APIError.notFound("Document not found");
  }
  if ((row.owner_email as string) !== email) {
    throw APIError.permissionDenied("Only the owner can manage shares for this document");
  }
  return { id: row.id as string, title: row.title as string };
}

// ─── APIs ────────────────────────────────────────────────────────────────

/**
 * GET /documents/:id/shares — list all shares for a document (owner only).
 */
export const listShares = api(
  { method: "GET", path: "/documents/:id/shares", auth: true },
  async ({ id }: { id: string }): Promise<{ shares: ShareDTO[] }> => {
    const email = getEmail();
    const { title } = await fetchOwnedDocTitle(id, email);
    const rows = await collect(
      db.query`
        SELECT id, document_id, shared_with_email, role, share_token,
               created_at, updated_at
        FROM shared_documents
        WHERE document_id = ${id}
        ORDER BY created_at ASC
      `,
    );
    return {
      shares: rows.map((r) =>
        toShareDTO(asShareRow(r as Record<string, unknown>), title),
      ),
    };
  },
);

/**
 * POST /documents/:id/shares — share the document with an email + role.
 *
 * Rejects sharing with yourself (confusing in the UI) and duplicate shares
 * (existing share for the same email + document). Generates a UUID share
 * token for optional public-link access.
 */
export const createShare = api(
  { method: "POST", path: "/documents/:id/shares", auth: true },
  async (params: {
    id: string;
    email: string;
    role?: "editor" | "commenter" | "viewer";
  }): Promise<{ share: ShareDTO }> => {
    const { id, ...rest } = params;
    const email = getEmail();
    const { title } = await fetchOwnedDocTitle(id, email);

    const parsed = ShareSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Don't allow sharing with yourself.
    if (parsed.data.email.toLowerCase() === email.toLowerCase()) {
      throw APIError.invalidArgument("Cannot share with yourself");
    }

    // Check for an existing share.
    const existing = await firstRow(
      db.query`
        SELECT id FROM shared_documents
        WHERE document_id = ${id} AND shared_with_email = ${parsed.data.email}
        LIMIT 1
      `,
    );
    if (existing) {
      throw APIError.alreadyExists("Already shared with this email");
    }

    const shareId = randomUUID();
    const shareToken = randomUUID();
    const role = parsed.data.role as ShareRole;

    await db.exec`
      INSERT INTO shared_documents
        (id, document_id, shared_with_email, role, share_token)
      VALUES
        (${shareId}, ${id}, ${parsed.data.email},
         ${role}, ${shareToken})
    `;

    const row = await firstRow(
      db.query`
        SELECT id, document_id, shared_with_email, role, share_token,
               created_at, updated_at
        FROM shared_documents WHERE id = ${shareId}
      `,
    );
    if (!row) {
      throw APIError.internal("Failed to load created share");
    }
    return { share: toShareDTO(asShareRow(row as Record<string, unknown>), title) };
  },
);

/**
 * PATCH /documents/:id/shares/:shareId — update a share's role.
 */
export const updateShare = api(
  {
    method: "PATCH",
    path: "/documents/:id/shares/:shareId",
    auth: true,
  },
  async (params: {
    id: string;
    shareId: string;
    role: "editor" | "commenter" | "viewer";
  }): Promise<{ share: ShareDTO }> => {
    const { id, shareId, ...rest } = params;
    const email = getEmail();
    const { title } = await fetchOwnedDocTitle(id, email);

    const parsed = PatchShareSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    const existing = await firstRow(
      db.query`
        SELECT id, document_id, shared_with_email, role, share_token,
               created_at, updated_at
        FROM shared_documents WHERE id = ${shareId}
      `,
    );
    if (!existing || (existing.document_id as string) !== id) {
      throw APIError.notFound("Share not found");
    }

    const role = parsed.data.role as ShareRole;
    await db.exec`
      UPDATE shared_documents
      SET role = ${role},
          updated_at = NOW()
      WHERE id = ${shareId}
    `;

    const row = await firstRow(
      db.query`
        SELECT id, document_id, shared_with_email, role, share_token,
               created_at, updated_at
        FROM shared_documents WHERE id = ${shareId}
      `,
    );
    if (!row) {
      throw APIError.internal("Failed to load updated share");
    }
    return { share: toShareDTO(asShareRow(row as Record<string, unknown>), title) };
  },
);

/**
 * DELETE /documents/:id/shares/:shareId — revoke a share.
 */
export const revokeShare = api(
  {
    method: "DELETE",
    path: "/documents/:id/shares/:shareId",
    auth: true,
  },
  async (params: { id: string; shareId: string }): Promise<{ ok: true; id: string }> => {
    const { id, shareId } = params;
    const email = getEmail();
    await fetchOwnedDocTitle(id, email);

    const existing = await firstRow(
      db.query`SELECT id, document_id FROM shared_documents WHERE id = ${shareId}`,
    );
    if (!existing || (existing.document_id as string) !== id) {
      throw APIError.notFound("Share not found");
    }

    await db.exec`
      DELETE FROM shared_documents WHERE id = ${shareId}
    `;
    return { ok: true, id: shareId };
  },
);
