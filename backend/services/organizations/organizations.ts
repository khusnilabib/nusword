/**
 * NUSWORD Organizations Service — service definition + DB.
 *
 * Organizations are team workspaces that own documents, books, and templates
 * (PRD §19: RBAC). Each org has members with roles
 * (owner/admin/editor/commenter/viewer) enforced via `hasPermission()` from
 * `../../shared/permissions.ts`.
 *
 * This file owns:
 *   - The `orgDB` SQLDatabase instance (Encore provisions it automatically).
 *   - Row types matching the migrations in `./migrations/`.
 *   - Shared helpers used by `crud.ts` and `members.ts`.
 *
 * Cross-service dependencies (mirrors the Next.js Prisma `_count` behavior):
 *   - documents service: `documents.countByOrg({ orgId })` → `{ count }`
 *   - books service:     `books.countByOrg({ orgId })`     → `{ count }`
 *   - usage service:     `usage.logEvent({ email, type, resourceId? })`
 *
 * Until the documents/books services expose those RPCs, documentCount and
 * bookCount in the org DTO are returned as 0 — see `countDocumentsByOrg` and
 * `countBooksByOrg` below.
 */
import { SQLDatabase } from "encore.dev/storage/sqldb";

// ─── Database ────────────────────────────────────────────────────────────
// Encore provisions a Postgres database named "org" and runs the migrations
// in ./migrations/ on `encore run` / `encore deploy`.
export const orgDB = new SQLDatabase("org", {
  migrations: "./migrations",
});

// ─── Row types (matching the SQL schema) ─────────────────────────────────

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface OrgMemberRow {
  id: string;
  organization_id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
}

// ─── Shared helpers ──────────────────────────────────────────────────────

/** Convert a name to a URL-friendly slug (lowercase, hyphen-separated). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

/**
 * Look up the requesting user's role in an org.
 * Returns null if the user is not a member (or the org doesn't exist).
 */
export async function getMemberRole(
  orgId: string,
  email: string,
): Promise<string | null> {
  const result = await orgDB.query`
    SELECT role FROM organization_members
    WHERE organization_id = ${orgId} AND email = ${email}
  `;
  for await (const row of result) {
    return row.role as string;
  }
  return null;
}

/** Count the members of an org (single SQL query, no N+1). */
export async function countMembers(orgId: string): Promise<number> {
  const result = await orgDB.query`
    SELECT COUNT(*)::int AS count FROM organization_members
    WHERE organization_id = ${orgId}
  `;
  for await (const row of result) {
    return (row.count as number) ?? 0;
  }
  return 0;
}

/**
 * Count the documents owned by an org.
 *
 * TODO(integration): wire this up to the documents service via RPC:
 *   const { count } = await documents.countByOrg({ orgId });
 *   return count;
 *
 * The documents service lives in a separate Encore DB so we cannot query it
 * directly. Returning 0 keeps the org DTO shape stable; the integration
 * agent should swap in the RPC call once documents.countByOrg exists.
 */
export async function countDocumentsByOrg(_orgId: string): Promise<number> {
  return 0;
}

/**
 * Count the books owned by an org.
 *
 * TODO(integration): wire this up to the books service via RPC:
 *   const { count } = await books.countByOrg({ orgId });
 *   return count;
 */
export async function countBooksByOrg(_orgId: string): Promise<number> {
  return 0;
}

/** Collect rows from an async iterable into an array. */
export async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

/** Return the first row from an async iterable, or null if empty. */
export async function firstRow<T>(
  iter: AsyncIterable<T>,
): Promise<T | null> {
  for await (const row of iter) {
    return row;
  }
  return null;
}
