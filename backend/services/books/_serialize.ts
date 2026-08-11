/**
 * Serialization helpers between DB rows and the NUSWORD book DTO.
 *
 * Mirrors the frontend's `src/lib/nusword/book-serialize.ts`. Settings +
 * front/back matter are stored as TEXT (JSON strings) and parsed at the
 * boundary. The chapter tree is built from flat rows (nested via parent_id).
 */
import type {
  BookDTO,
  BookMatterEntry,
  BookSettings,
  ChapterNode,
  KitabSettings,
  PageSettings,
} from "../../shared/types";

// ─── Defaults ────────────────────────────────────────────────────────────

/** Default kitab settings (mirrors DEFAULT_KITAB_SETTINGS from src/types/kitab.ts). */
export const DEFAULT_KITAB_SETTINGS: KitabSettings = {
  enabled: false,
  arabicFont: "Amiri",
  arabicFontSizePt: 16,
  arabicLineHeight: 2.0,
  translationFont: "Source Serif 4",
  translationFontSizePt: 12,
  bilingualLayout: "side-by-side",
  ornamentStyle: "diamond",
  footnotes: {
    enabled: true,
    numbering: "arabic-indic",
    position: "bottom",
    separator: true,
  },
  traditionalHeader: {
    enabled: true,
    customText: "",
    border: true,
  },
  arabicPageNumbers: true,
  basmalaPerChapter: true,
};

/** Default page settings for books (mirrors DEFAULT_BOOK_SETTINGS.pageSettings). */
export const DEFAULT_BOOK_PAGE_SETTINGS: PageSettings = {
  schemaVersion: 1,
  pageSize: "A5",
  orientation: "portrait",
  marginTopMm: 20,
  marginBottomMm: 20,
  marginLeftMm: 20,
  marginRightMm: 20,
  bleedMm: 3,
  gutterMm: 5,
  mirrorMargins: true,
  columns: 1,
  languageDirection: "ltr",
  fontFamily: "Source Serif 4",
  fontSizePt: 12,
  lineHeight: 1.5,
  header: { enabled: false, left: "", center: "", right: "" },
  footer: { enabled: true, left: "", center: "{{page}}", right: "" },
  pageNumberFormat: "decimal",
  pageNumberStart: 1,
  differentFirstPage: false,
};

/** Default book settings (mirrors DEFAULT_BOOK_SETTINGS from src/types/book.ts). */
export const DEFAULT_BOOK_SETTINGS: BookSettings = {
  pageSettings: { ...DEFAULT_BOOK_PAGE_SETTINGS },
  binding: "perfect",
  mirrorMargins: true,
  runningHeader: {
    enabled: true,
    source: "chapter",
    customText: "",
    position: "both",
  },
  runningFooter: {
    enabled: true,
    pageNumberPosition: "outer",
  },
  chaptersStartOnOddPage: true,
  booklet: { sheetsPerSignature: 4 },
  kitab: { ...DEFAULT_KITAB_SETTINGS },
};

// ─── Parsers ─────────────────────────────────────────────────────────────

/** Parse BookSettings JSON (merges defaults for forward-compat). */
export function parseBookSettings(raw: string | null | undefined): BookSettings {
  if (!raw) return { ...DEFAULT_BOOK_SETTINGS };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const k = parsed.kitab || {};
      return {
        ...DEFAULT_BOOK_SETTINGS,
        ...parsed,
        pageSettings: { ...DEFAULT_BOOK_PAGE_SETTINGS, ...(parsed.pageSettings || {}) },
        runningHeader: { ...DEFAULT_BOOK_SETTINGS.runningHeader, ...(parsed.runningHeader || {}) },
        runningFooter: { ...DEFAULT_BOOK_SETTINGS.runningFooter, ...(parsed.runningFooter || {}) },
        booklet: { ...DEFAULT_BOOK_SETTINGS.booklet, ...(parsed.booklet || {}) },
        kitab: {
          ...DEFAULT_KITAB_SETTINGS,
          ...k,
          footnotes: { ...DEFAULT_KITAB_SETTINGS.footnotes, ...(k.footnotes || {}) },
          traditionalHeader: {
            ...DEFAULT_KITAB_SETTINGS.traditionalHeader,
            ...(k.traditionalHeader || {}),
          },
        },
      };
    }
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_BOOK_SETTINGS };
}

/** Parse front/back matter JSON arrays. */
export function parseMatterEntries(raw: string | null | undefined): BookMatterEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as BookMatterEntry[];
  } catch {
    /* fall through */
  }
  return [];
}

/** Stringify book settings for DB storage. */
export function stringifyBookSettings(settings: unknown): string {
  return JSON.stringify(settings);
}

/** Stringify matter entries for DB storage. */
export function stringifyMatterEntries(entries: unknown): string {
  return JSON.stringify(entries);
}

// ─── DB Row Shapes ───────────────────────────────────────────────────────

export interface BookRow {
  id: string;
  owner_email: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  settings: string;
  front_matter: string;
  back_matter: string;
  organization_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface BookChapterRow {
  id: string;
  book_id: string;
  document_id: string | null;
  title: string;
  sort_order: number;
  parent_id: string | null;
  start_new_page: boolean;
  include_in_toc: boolean;
  created_at: Date;
  updated_at: Date;
}

// ─── Coercion helpers ────────────────────────────────────────────────────

/** Coerce a raw DB row into a typed BookRow. */
export function asBookRow(row: Record<string, unknown>): BookRow {
  return {
    id: row.id as string,
    owner_email: row.owner_email as string,
    title: row.title as string,
    subtitle: (row.subtitle as string | null) ?? null,
    author: (row.author as string | null) ?? null,
    settings: (row.settings as string) ?? "{}",
    front_matter: (row.front_matter as string) ?? "[]",
    back_matter: (row.back_matter as string) ?? "[]",
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

/** Coerce a raw DB row into a typed BookChapterRow. */
export function asChapterRow(row: Record<string, unknown>): BookChapterRow {
  return {
    id: row.id as string,
    book_id: row.book_id as string,
    document_id: (row.document_id as string | null) ?? null,
    title: row.title as string,
    sort_order: row.sort_order as number,
    parent_id: (row.parent_id as string | null) ?? null,
    start_new_page: (row.start_new_page as boolean | null) ?? true,
    include_in_toc: (row.include_in_toc as boolean | null) ?? true,
    created_at: row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at as string),
    updated_at: row.updated_at instanceof Date
      ? row.updated_at
      : new Date(row.updated_at as string),
  };
}

// ─── Converters ──────────────────────────────────────────────────────────

/** Build a chapter tree from flat rows (nested via parent_id). */
export function buildChapterTree(
  chapters: BookChapterRow[],
  parentId: string | null = null,
  level = 1,
): ChapterNode[] {
  return chapters
    .filter((c) => c.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      id: c.id,
      documentId: c.document_id,
      title: c.title,
      sortOrder: c.sort_order,
      parentId: c.parent_id,
      startNewPage: c.start_new_page,
      includeInToc: c.include_in_toc,
      level,
      children: buildChapterTree(chapters, c.id, level + 1),
    }));
}

/** Convert a book + chapters rows to the API DTO. */
export function toBookDTO(book: BookRow, chapters: BookChapterRow[]): BookDTO {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    settings: parseBookSettings(book.settings),
    frontMatter: parseMatterEntries(book.front_matter),
    backMatter: parseMatterEntries(book.back_matter),
    chapters: buildChapterTree(chapters),
    createdAt: book.created_at.toISOString(),
    updatedAt: book.updated_at.toISOString(),
  };
}

/** Convert a single chapter row to a ChapterNode (without children — used in
 *  POST /chapters responses where only the new chapter is returned). */
export function toChapterNode(
  row: BookChapterRow,
  level = 1,
  children: ChapterNode[] = [],
): ChapterNode {
  return {
    id: row.id,
    documentId: row.document_id,
    title: row.title,
    sortOrder: row.sort_order,
    parentId: row.parent_id,
    startNewPage: row.start_new_page,
    includeInToc: row.include_in_toc,
    level,
    children,
  };
}
