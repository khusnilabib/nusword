/**
 * NUSWORD Books Service — Encore.dev service definition.
 *
 * Owns the book model (PRD §15 — Book & Kitab Architecture): book metadata,
 * chapter tree, front/back matter, book settings (binding, kitab profile).
 *
 * Chapter content lives in the documents service — `book_chapters.document_id`
 * is a cross-service FK to `documents.id`. The books service calls into the
 * documents service via Encore RPC to fetch chapter content (for TOC
 * generation) and to create new chapter documents.
 *
 * API surface (split across files in this service):
 *   crud.ts     — GET/POST /books, GET/PATCH/DELETE /books/:id
 *                 + RPC helpers (countByOwner, countByOrg)
 *   chapters.ts — GET/POST/PUT /books/:id/chapters,
 *                 PATCH/DELETE /books/:id/chapters/:chapterId
 *   toc.ts      — GET /books/:id/toc
 *
 * Database: SQLDatabase "books" (PostgreSQL). Migrations live in ./migrations.
 */
import { SQLDatabase } from "encore.dev/storage/sqldb";

export const db = new SQLDatabase("books", {
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
