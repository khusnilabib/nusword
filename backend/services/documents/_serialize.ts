/**
 * Serialization helpers between DB rows and the NUSWORD canonical document DTO.
 *
 * The DB stores `content` (Tiptap JSON) and `settings` (PageSettings) as TEXT
 * (JSON strings). These helpers parse/validate at the boundary, mirroring the
 * frontend's `src/lib/nusword/serialize.ts`.
 *
 * Keep these private to the documents service — the shared DTO types live in
 * `/backend/shared/types.ts` and use `unknown` for content (the frontend
 * owns the precise Tiptap JSONContent shape).
 */
import type { DocumentDTO, DocumentVersionDTO, PageSettings } from "../../shared/types";
import type { ShareDTO } from "../../shared/types";

/** Minimal Tiptap JSON shape — we only need to walk text nodes for word count. */
export interface TiptapNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  [key: string]: unknown;
}

/** Default PageSettings — mirrors DEFAULT_PAGE_SETTINGS from src/types/document.ts. */
export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  schemaVersion: 1,
  pageSize: "A4",
  orientation: "portrait",
  marginTopMm: 25.4,
  marginBottomMm: 25.4,
  marginLeftMm: 25.4,
  marginRightMm: 25.4,
  bleedMm: 0,
  gutterMm: 0,
  mirrorMargins: false,
  columns: 1,
  languageDirection: "ltr",
  fontFamily: "Source Serif 4",
  fontSizePt: 18,
  lineHeight: 1.6,
  header: { enabled: false, left: "", center: "", right: "" },
  footer: { enabled: true, left: "", center: "{{page}} / {{pages}}", right: "" },
  pageNumberFormat: "decimal",
  pageNumberStart: 1,
  differentFirstPage: false,
};

export const DOCUMENT_SCHEMA_VERSION = 1;

/** Empty Tiptap document — used when creating a new document. */
export const EMPTY_DOC: TiptapNode = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/** Parse a Tiptap JSON string into a node object (safe fallback). */
export function parseContent(raw: string | null | undefined): TiptapNode {
  if (!raw) return { type: "doc", content: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as TiptapNode;
  } catch {
    /* fall through */
  }
  return { type: "doc", content: [] };
}

/** Parse a PageSettings JSON string (merges defaults for forward-compat). */
export function parseSettings(raw: string | null | undefined): PageSettings {
  if (!raw) return { ...DEFAULT_PAGE_SETTINGS };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        ...DEFAULT_PAGE_SETTINGS,
        ...parsed,
        schemaVersion: DOCUMENT_SCHEMA_VERSION,
        header: { ...DEFAULT_PAGE_SETTINGS.header, ...(parsed.header || {}) },
        footer: { ...DEFAULT_PAGE_SETTINGS.footer, ...(parsed.footer || {}) },
      };
    }
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_PAGE_SETTINGS };
}

/** Stringify content for DB storage. */
export function stringifyContent(content: unknown): string {
  return JSON.stringify(content);
}

/** Stringify settings for DB storage. */
export function stringifySettings(settings: unknown): string {
  return JSON.stringify(settings);
}

/** Count words in a Tiptap document by extracting text nodes. */
export function countWords(content: TiptapNode): number {
  const texts: string[] = [];
  const walk = (node: TiptapNode): void => {
    if (node.text) texts.push(node.text);
    if (node.content) node.content.forEach(walk);
  };
  walk(content);
  const joined = texts.join(" ").trim();
  if (!joined) return 0;
  return joined.split(/\s+/).length;
}

/** Coerce arbitrary input (string or object) into a string for storage. */
export function stringifyJsonField(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/** Safe JSON parse with fallback. */
export function parseJsonField<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── DB Row Shapes ───────────────────────────────────────────────────────

export interface DocumentRow {
  id: string;
  owner_email: string;
  title: string;
  content: string;
  settings: string;
  organization_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface DocumentVersionRow {
  id: string;
  document_id: string;
  content: string;
  settings: string;
  version: number;
  message: string | null;
  created_at: Date;
}

export interface SharedDocumentRow {
  id: string;
  document_id: string;
  shared_with_email: string;
  role: string;
  share_token: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Converters ──────────────────────────────────────────────────────────

/** Coerce a raw DB row (Record<string, unknown>) into a typed DocumentRow. */
export function asDocumentRow(row: Record<string, unknown>): DocumentRow {
  return {
    id: row.id as string,
    owner_email: row.owner_email as string,
    title: row.title as string,
    content: (row.content as string) ?? "",
    settings: (row.settings as string) ?? "{}",
    organization_id: (row.organization_id as string | null) ?? null,
    created_at: row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at as string),
    updated_at: row.updated_at instanceof Date
      ? row.updated_at
      : new Date(row.updated_at as string),
    deleted_at: (row.deleted_at as Date | null) ?? null,
  };
}

/** Coerce a raw DB row into a typed DocumentVersionRow. */
export function asVersionRow(row: Record<string, unknown>): DocumentVersionRow {
  return {
    id: row.id as string,
    document_id: row.document_id as string,
    content: (row.content as string) ?? "",
    settings: (row.settings as string) ?? "{}",
    version: row.version as number,
    message: (row.message as string | null) ?? null,
    created_at: row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at as string),
  };
}

/** Coerce a raw DB row into a typed SharedDocumentRow. */
export function asShareRow(row: Record<string, unknown>): SharedDocumentRow {
  return {
    id: row.id as string,
    document_id: row.document_id as string,
    shared_with_email: row.shared_with_email as string,
    role: row.role as string,
    share_token: (row.share_token as string | null) ?? null,
    created_at: row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at as string),
    updated_at: row.updated_at instanceof Date
      ? row.updated_at
      : new Date(row.updated_at as string),
  };
}

/** Convert a documents DB row to the API DTO. */
export function toDocumentDTO(row: DocumentRow): DocumentDTO {
  const content = parseContent(row.content);
  return {
    id: row.id,
    title: row.title,
    content,
    settings: parseSettings(row.settings),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    wordCount: countWords(content),
    organizationId: row.organization_id,
  };
}

/** Convert a document_versions DB row to the API DTO. */
export function toVersionDTO(row: DocumentVersionRow): DocumentVersionDTO {
  return {
    id: row.id,
    documentId: row.document_id,
    version: row.version,
    message: row.message,
    createdAt: row.created_at.toISOString(),
    wordCount: countWords(parseContent(row.content)),
  };
}

/** Convert a shared_documents DB row to the API DTO. */
export function toShareDTO(
  row: SharedDocumentRow,
  documentTitle?: string,
): ShareDTO {
  return {
    id: row.id,
    documentId: row.document_id,
    documentTitle: documentTitle ?? "",
    sharedWithEmail: row.shared_with_email,
    role: row.role as ShareDTO["role"],
    shareToken: row.share_token,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Extract plain text from a Tiptap node (used by TOC + outline). */
export function extractText(node: TiptapNode | null | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join("");
  return "";
}
