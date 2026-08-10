/**
 * NUSWORD Documents Service — Encore.dev service definition.
 *
 * Owns the canonical document model (Tiptap JSON + PageSettings), immutable
 * version snapshots, per-document share grants, and export job tracking.
 *
 * See PRD §13 (Canonical Document Model), §16 (Preflight + Export),
 * §19 (RBAC / Sharing), §25 (Soft-delete + Retention).
 *
 * API surface (split across files in this service):
 *   crud.ts     — GET/POST /documents, GET/PATCH/DELETE /documents/:id
 *                 + RPC helpers (createFromTemplate, countByOwner, etc.)
 *   versions.ts — GET/POST/PUT /documents/:id/versions
 *   shares.ts   — GET/POST /documents/:id/shares, PATCH/DELETE .../:shareId
 *   export.ts   — POST/GET /documents/:id/export, GET /export-jobs/:id/download
 *
 * Database: SQLDatabase "documents" (PostgreSQL). Migrations live in ./migrations.
 */
import { SQLDatabase } from "encore.dev/storage/sqldb";

export const db = new SQLDatabase("documents", {
  migrations: "./migrations",
});

/** Collect rows from an async iterable into an array. */
export async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

/** Return the first row from an async iterable, or null if empty. */
export async function firstRow<T>(iter: AsyncIterable<T>): Promise<T | null> {
  for await (const row of iter) {
    return row;
  }
  return null;
}
