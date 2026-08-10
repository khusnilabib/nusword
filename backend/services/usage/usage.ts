/**
 * NUSWORD Usage Service — service definition + DB.
 *
 * Tracks user activity for metering/analytics (PRD §32: success metrics).
 * Phase 7: tracking only, no billing. Other services log events via the
 * `logEvent` RPC exported from `./stats.ts`.
 *
 * This file owns:
 *   - The `usageDB` SQLDatabase instance (Encore provisions it).
 *   - Row types matching the migration in `./migrations/`.
 *   - Shared helpers used by `./stats.ts`.
 */
import { SQLDatabase } from "encore.dev/storage/sqldb";

// ─── Database ────────────────────────────────────────────────────────────
// Encore provisions a Postgres database named "usage" and runs the
// migrations in ./migrations/ on `encore run` / `encore deploy`.
export const usageDB = new SQLDatabase("usage", {
  migrations: "./migrations",
});

// ─── Row types (matching the SQL schema) ─────────────────────────────────

export interface UsageEventRow {
  id: string;
  email: string;
  type: string;
  resource_id: string | null;
  metadata: string | null;
  created_at: Date;
}

// ─── Event type constants ────────────────────────────────────────────────
//
// Centralising event type strings prevents typos and makes it easy to grep
// for all the places a given event is logged.

export const USAGE_EVENT_TYPES = {
  // Document lifecycle
  DOCUMENT_CREATE: "document.create",
  DOCUMENT_EXPORT: "document.export",
  DOCUMENT_SHARE: "document.share",
  // Book lifecycle
  BOOK_CREATE: "book.create",
  // Template lifecycle
  TEMPLATE_CREATE: "template.create",
  TEMPLATE_USE: "template.use",
  // Organization lifecycle
  ORG_CREATE: "organization.create",
  ORG_MEMBER_INVITE: "organization.member.invite",
} as const;

export type UsageEventType =
  (typeof USAGE_EVENT_TYPES)[keyof typeof USAGE_EVENT_TYPES];

// ─── Shared helpers ──────────────────────────────────────────────────────

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

/**
 * Format a Date as a YYYY-MM-DD string (UTC). Used as a stable grouping key
 * for the recent-events aggregation in GET /usage.
 */
export function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
