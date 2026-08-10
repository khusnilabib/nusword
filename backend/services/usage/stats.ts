/**
 * Usage stats — GET /usage endpoint + logEvent RPC helper.
 *
 * Mirrors the Next.js route at `src/app/api/usage/route.ts`:
 *   GET /usage — return usage stats for the current user:
 *     - documentsCreated: count of non-deleted documents owned by the user
 *     - booksCreated:     count of non-deleted books owned by the user
 *     - exportsRun:       count of export jobs for documents owned by the user
 *     - templatesUsed:    count of "template.use" usage events for the user
 *     - recentEvents:     last 7 days of events, grouped by day + type
 *     - days:             the 7-day window (for client-side charting)
 *
 * `logEvent` is an internal RPC that other services call to record usage
 * events. Per the task spec it has the signature `logEvent(email, type,
 * resourceId?)` — Encore RPC functions take a single argument, so the
 * positional args are wrapped in an object: `logEvent({ email, type,
 * resourceId?, metadata? })`.
 *
 * Cross-service dependencies for GET /usage (counts):
 *   - documents.countByOwner({ email })       → { count }
 *   - documents.countExportsByOwner({ email }) → { count }
 *   - books.countByOwner({ email })           → { count }
 *
 *   Until those RPCs exist, the documents/books/exports counts are returned
 *   as 0 — see `countDocumentsForUser`, `countBooksForUser`,
 *   `countExportsForUser` below.
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";

import {
  collect,
  firstRow,
  toDayKey,
  usageDB,
} from "./usage";
import { documents } from "~encore/services/documents";
import { books } from "~encore/services/books";

// ─── Auth helper ─────────────────────────────────────────────────────────

function getEmail(): string {
  if (!auth.data?.email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return auth.data.email;
}

// ─── Internal RPC: logEvent ──────────────────────────────────────────────
//
// Other Encore services log usage events by calling this function via RPC:
//
//   import { usage } from "~encore/services/usage";
//   await usage.logEvent({ email, type: "document.create", resourceId: doc.id });
//
// The task spec asks for `logEvent(email, type, resourceId?)` — Encore RPC
// functions take a single argument, so the positional args are wrapped in an
// object. This matches the spirit of the spec while following Encore's
// calling convention.

export interface LogEventParams {
  /** User email the event belongs to. */
  email: string;
  /** Event type, e.g. "document.create", "template.use". */
  type: string;
  /** Optional id of the referenced resource (document, book, template, ...). */
  resourceId?: string;
  /** Optional JSON-stringified metadata. */
  metadata?: string;
}

/**
 * Log a usage event. Callable from any Encore service via RPC.
 *
 * This is fire-and-forget from the caller's perspective — failures are
 * swallowed (logged to stderr but not thrown) so a usage-logging hiccup
 * never breaks the user-facing operation that triggered the event.
 */
export async function logEvent(params: LogEventParams): Promise<void> {
  const id = randomUUID();
  const resourceId = params.resourceId ?? null;
  const metadata = params.metadata ?? null;
  try {
    await usageDB.exec`
      INSERT INTO usage_events (id, email, type, resource_id, metadata)
      VALUES (${id}, ${params.email}, ${params.type}, ${resourceId}, ${metadata})
    `;
  } catch (err) {
    // Best-effort: log to stderr but don't propagate.
    console.error("[usage.logEvent] failed to log event:", err);
  }
}

// ─── Cross-service count helpers ─────────────────────────────────────────
//
// These wrap RPC calls to the documents and books services. Until those
// services expose the count RPCs, they return 0 — keeping the GET /usage
// response shape stable so the frontend continues to work.

async function countDocumentsForUser(email: string): Promise<number> {
  try {
    const result = await documents.countByOwner({ email });
    return result?.count ?? 0;
  } catch (err) {
    // documents service not yet available — return 0 with a stderr log.
    console.error("[usage] documents.countByOwner RPC failed:", err);
    return 0;
  }
}

async function countExportsForUser(email: string): Promise<number> {
  try {
    const result = await documents.countExportsByOwner({ email });
    return result?.count ?? 0;
  } catch (err) {
    console.error("[usage] documents.countExportsByOwner RPC failed:", err);
    return 0;
  }
}

async function countBooksForUser(email: string): Promise<number> {
  try {
    const result = await books.countByOwner({ email });
    return result?.count ?? 0;
  } catch (err) {
    console.error("[usage] books.countByOwner RPC failed:", err);
    return 0;
  }
}

// ─── Endpoint: GET /usage ────────────────────────────────────────────────

/**
 * GET /usage — return usage stats for the current user.
 *
 * Response shape (matches the Next.js route exactly):
 *   {
 *     documentsCreated: number,
 *     booksCreated: number,
 *     exportsRun: number,
 *     templatesUsed: number,
 *     recentEvents: Array<{ type, count, date }>,
 *     days: string[]  // 7-day window of YYYY-MM-DD keys
 *   }
 *
 * The `recentEvents` array is grouped by (date, type) and sorted by date asc
 * then type asc. The `days` array always contains all 7 days (even days
 * with zero events) for client-side charting.
 */
export const getUsage = api(
  { method: "GET", path: "/usage", auth: true },
  async (): Promise<{
    documentsCreated: number;
    booksCreated: number;
    exportsRun: number;
    templatesUsed: number;
    recentEvents: Array<{ type: string; count: number; date: string }>;
    days: string[];
  }> => {
    const email = getEmail();

    // templatesUsed = count of "template.use" usage events for this user.
    // The other three counts come from the documents/books services.
    const [documentsCreated, booksCreated, exportsRun, templatesUsed] =
      await Promise.all([
        countDocumentsForUser(email),
        countBooksForUser(email),
        countExportsForUser(email),
        (async () => {
          const row = await firstRow(
            usageDB.query`
              SELECT COUNT(*)::int AS count FROM usage_events
              WHERE email = ${email} AND type = 'template.use'
            `,
          );
          return (row?.count as number) ?? 0;
        })(),
      ]);

    // Recent events: last 7 days (today + 6 prior days, inclusive).
    // Use UTC midnight as the boundary for stable grouping.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

    const recentRows = await collect(
      usageDB.query`
        SELECT type, created_at FROM usage_events
        WHERE email = ${email} AND created_at >= ${sevenDaysAgo}
        ORDER BY created_at ASC
        LIMIT 1000
      `,
    );

    // Build the 7-day window of day keys (always all 7, even empty days).
    const dayKeys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);
      dayKeys.push(toDayKey(d));
    }

    // Group by (day, type).
    const grouped = new Map<
      string,
      { type: string; count: number; date: string }
    >();
    for (const ev of recentRows) {
      const createdAt = ev.created_at as Date;
      const day = toDayKey(createdAt);
      const key = `${day}::${ev.type as string}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(key, {
          type: ev.type as string,
          count: 1,
          date: day,
        });
      }
    }

    const recentEvents = Array.from(grouped.values()).sort(
      (a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type),
    );

    return {
      documentsCreated,
      booksCreated,
      exportsRun,
      templatesUsed,
      recentEvents,
      days: dayKeys,
    };
  },
);
