/**
 * GET /api/usage — return usage stats for the current user.
 *
 * Returns:
 *   - documentsCreated: count of Document rows (non-deleted) for the user.
 *   - booksCreated:     count of Book rows (non-deleted) for the user.
 *   - exportsRun:       count of ExportJob rows (current user's exports).
 *   - templatesUsed:    count of "template.use" UsageEvent rows for the user.
 *   - recentEvents:     UsageEvent rows for the last 7 days, grouped by day + type.
 *
 * Phase 7: tracking only, no billing (PRD §32 — success metrics).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CURRENT_USER_EMAIL = "user@nusword.local";

/** Format a Date as a YYYY-MM-DD string (UTC, for stable grouping across DB rows). */
function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(_req: NextRequest) {
  // Counts of canonical resources owned by the current user. Phase 7 is
  // single-user (no ownerEmail column on Document/Book), so all non-deleted
  // rows belong to the placeholder user.
  const [documentsCreated, booksCreated, exportsRun, templatesUsed] = await Promise.all([
    db.document.count({ where: { deletedAt: null } }),
    db.book.count({ where: { deletedAt: null } }),
    db.exportJob.count(),
    db.usageEvent.count({
      where: { email: CURRENT_USER_EMAIL, type: "template.use" },
    }),
  ]);

  // Recent events: last 7 days, grouped by day + type.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6); // inclusive of today + 6 prior days

  const recent = await db.usageEvent.findMany({
    where: { email: CURRENT_USER_EMAIL, createdAt: { gte: sevenDaysAgo } },
    select: { type: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 1000,
  });

  // Build the 7-day window of day keys so we always return all 7 days
  // (even days with zero events), per the spec's "last 7 days" requirement.
  const dayKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    dayKeys.push(toDayKey(d));
  }

  // Group by day + type.
  const grouped = new Map<string, { type: string; count: number; date: string }>();
  for (const ev of recent) {
    const key = `${toDayKey(ev.createdAt)}::${ev.type}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      grouped.set(key, { type: ev.type, count: 1, date: toDayKey(ev.createdAt) });
    }
  }

  // Emit per-day events (sorted by date asc, then type).
  const recentEvents = Array.from(grouped.values()).sort(
    (a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type),
  );

  return NextResponse.json({
    documentsCreated,
    booksCreated,
    exportsRun,
    templatesUsed,
    recentEvents,
    /** The full 7-day window for client-side charting. */
    days: dayKeys,
  });
}
