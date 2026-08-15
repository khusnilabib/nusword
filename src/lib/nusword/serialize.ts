/**
 * Serialization helpers between Prisma rows and the NUSWORD canonical document
 * model. The DB stores content + settings as JSON strings (SQLite limitation);
 * these helpers parse/validate at the boundary.
 */
import type { Document, DocumentVersion } from "@prisma/client";
import type {
  JSONContent,
  NuswordDocument,
  NuswordDocumentVersion,
  PageSettings,
} from "@/types/document";
import {
  DEFAULT_PAGE_SETTINGS,
  DOCUMENT_SCHEMA_VERSION,
} from "@/types/document";

/** Parse a Tiptap JSON string into a JSONContent object (safe fallback). */
export function parseContent(raw: string | null | undefined): JSONContent {
  if (!raw) return { type: "doc", content: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as JSONContent;
    }
  } catch {
    /* fall through to default */
  }
  return { type: "doc", content: [] };
}

/** Parse a PageSettings JSON string (merges defaults for forward-compat). */
export function parseSettings(raw: string | null | undefined): PageSettings {
  if (!raw) return { ...DEFAULT_PAGE_SETTINGS };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return { ...DEFAULT_PAGE_SETTINGS, ...parsed, schemaVersion: DOCUMENT_SCHEMA_VERSION };
    }
  } catch {
    /* fall through to default */
  }
  return { ...DEFAULT_PAGE_SETTINGS };
}

/** Stringify content for DB storage. */
export function stringifyContent(content: JSONContent): string {
  return JSON.stringify(content);
}

/** Stringify settings for DB storage. */
export function stringifySettings(settings: PageSettings): string {
  return JSON.stringify(settings);
}

/** Count words in a Tiptap document by extracting text nodes. */
export function countWords(content: JSONContent): number {
  const texts: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.text) texts.push(node.text);
    if (node.content) node.content.forEach(walk);
  };
  walk(content);
  const joined = texts.join(" ").trim();
  if (!joined) return 0;
  return joined.split(/\s+/).length;
}

/** Subset of a Prisma `Document` row containing only the fields used by
 *  `toDocumentDto`. Accepting this narrower type lets callers use Prisma
 *  `select` to skip unused columns (deletedAt / ownerEmail / organizationId)
 *  while still passing full rows to the same function. */
export type DocumentDtoInput = Pick<
  Document,
  "id" | "title" | "content" | "settings" | "createdAt" | "updatedAt"
>;

/** Convert a Prisma Document row to the canonical API shape. */
export function toDocumentDto(row: DocumentDtoInput): NuswordDocument {
  const content = parseContent(row.content);
  return {
    id: row.id,
    title: row.title,
    content,
    settings: parseSettings(row.settings),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    wordCount: countWords(content),
  };
}

/** Convert a Prisma DocumentVersion row to the API shape. */
export function toVersionDto(row: DocumentVersion): NuswordDocumentVersion {
  return {
    id: row.id,
    documentId: row.documentId,
    version: row.version,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    wordCount: countWords(parseContent(row.content)),
  };
}
