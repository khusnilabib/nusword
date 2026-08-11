/**
 * NUSWORD Templates Service — service definition + DB.
 *
 * Templates are reusable document/book starting points that can be published
 * to a marketplace (PRD §7: Template Engine). Published templates are visible
 * to all users; unpublished ones are private to their owning org.
 *
 * This file owns:
 *   - The `templateDB` SQLDatabase instance (Encore provisions it).
 *   - Row types matching the migration in `./migrations/`.
 *   - Shared helpers used by `crud.ts` and `use.ts`.
 *
 * Cross-service dependencies:
 *   - documents service: `documents.createFromTemplate(...)` — used by the
 *     POST /templates/:id/use endpoint to create a new document from a
 *     template's content + settings.
 *   - usage service: `usage.logEvent(...)` — logs template.create and
 *     template.use events.
 */
import { SQLDatabase } from "encore.dev/storage/sqldb";

// ─── Database ────────────────────────────────────────────────────────────
// Encore provisions a Postgres database named "templates" and runs the
// migrations in ./migrations/ on `encore run` / `encore deploy`.
export const templateDB = new SQLDatabase("templates", {
  migrations: "./migrations",
});

// ─── Row types (matching the SQL schema) ─────────────────────────────────

export interface TemplateRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  content: string;
  settings: string;
  published: boolean;
  organization_id: string | null;
  use_count: number;
  created_at: Date;
  updated_at: Date;
}

// ─── Constants ───────────────────────────────────────────────────────────

export const VALID_CATEGORIES = [
  "academic",
  "business",
  "creative",
  "religious",
  "personal",
] as const;

export type TemplateCategory = (typeof VALID_CATEGORIES)[number];

export const VALID_TYPES = ["document", "book"] as const;
export type TemplateType = (typeof VALID_TYPES)[number];

// ─── Shared helpers ──────────────────────────────────────────────────────

/**
 * Convert a Prisma-style Template row to the API DTO shape (without
 * content/settings — those are only returned on GET /:id).
 */
export function toTemplateDTO(row: TemplateRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as "document" | "book",
    category: row.category as TemplateCategory,
    published: row.published,
    useCount: row.use_count,
    organizationId: row.organization_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Coerce arbitrary input (string or object) into a string for storage in
 * the `content` or `settings` JSON column. Objects are JSON-stringified;
 * strings are passed through; nullish falls back to a sensible default.
 */
export function stringifyJsonField(
  value: unknown,
  fallback: string,
): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/** Safe JSON parse with fallback (used when reading content/settings back). */
export function parseJsonField<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
