/**
 * NUSWORD Canonical Document Model (PRD §13).
 *
 * The database stores a structured JSON document model with schema versioning.
 * HTML/Markdown/DOCX/PDF are import/export representations — the source of
 * truth is the Tiptap/ProseMirror JSON + PageSettings below.
 *
 * Every schema change must be versioned and migratable. Document versions are
 * immutable so users can restore previous states.
 */
import type { JSONContent } from "@tiptap/react";

/** Schema version for the document model. Bump on breaking changes. */
export const DOCUMENT_SCHEMA_VERSION = 1 as const;

/** Paper sizes supported by the page engine (PRD §14). */
export type PaperSizeKey =
  | "A4"
  | "A5"
  | "B5"
  | "Letter"
  | "Legal"
  | "F4"
  | "Custom";

export type Orientation = "portrait" | "landscape";
export type LanguageDirection = "ltr" | "rtl";

/** Dimensions in millimetres for each known paper size (portrait). */
export const PAPER_SIZES: Record<
  Exclude<PaperSizeKey, "Custom">,
  { widthMm: number; heightMm: number; label: string }
> = {
  A4: { widthMm: 210, heightMm: 297, label: "A4 (210 × 297 mm)" },
  A5: { widthMm: 148, heightMm: 210, label: "A5 (148 × 210 mm)" },
  B5: { widthMm: 176, heightMm: 250, label: "B5 (176 × 250 mm)" },
  Letter: { widthMm: 216, heightMm: 279, label: "Letter (8.5 × 11 in)" },
  Legal: { widthMm: 216, heightMm: 356, label: "Legal (8.5 × 14 in)" },
  F4: { widthMm: 210, heightMm: 330, label: "F4 (210 × 330 mm)" },
};

/** Page settings — the "settings" block of the canonical document model. */
export interface PageSettings {
  schemaVersion: number;
  pageSize: PaperSizeKey;
  /** Used only when pageSize === "Custom". */
  customWidthMm?: number;
  customHeightMm?: number;
  orientation: Orientation;
  /** Margins in millimetres (PRD §14: mirror margins supported later). */
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  /** Print bleed in millimetres (PRD §14). */
  bleedMm: number;
  /** Binding gutter in millimetres (added to inner margin). */
  gutterMm: number;
  /** Mirror margins for facing pages (book binding). */
  mirrorMargins: boolean;
  /** Number of columns (PRD §14). */
  columns: number;
  languageDirection: LanguageDirection;
  /** Body typography defaults applied to the paper. */
  fontFamily: string;
  fontSizePt: number;
  lineHeight: number;

  /* --- Header / Footer (PRD §14: header/footer, page styles) --- */

  /** Header configuration for each page. */
  header: HeaderFooterConfig;
  /** Footer configuration for each page. */
  footer: HeaderFooterConfig;
  /** Page number format (PRD §14: page numbering). */
  pageNumberFormat: PageNumberFormat;
  /** Starting page number (default 1). */
  pageNumberStart: number;
  /** Whether to suppress the header/footer on the first page (e.g. title page). */
  differentFirstPage: boolean;
}

/** Header or footer slot configuration. Each slot can contain text with
 *  template variables: {{page}}, {{pages}}, {{title}}. */
export interface HeaderFooterConfig {
  /** Whether the header/footer is visible. */
  enabled: boolean;
  /** Left-aligned text (supports {{page}}, {{pages}}, {{title}}). */
  left: string;
  /** Center-aligned text. */
  center: string;
  /** Right-aligned text. */
  right: string;
}

export type PageNumberFormat = "decimal" | "roman" | "none";

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  schemaVersion: DOCUMENT_SCHEMA_VERSION,
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
  header: {
    enabled: false,
    left: "",
    center: "",
    right: "",
  },
  footer: {
    enabled: true,
    left: "",
    center: "{{page}} / {{pages}}",
    right: "",
  },
  pageNumberFormat: "decimal",
  pageNumberStart: 1,
  differentFirstPage: false,
};

/**
 * Resolve the effective paper dimensions (in mm) for a settings object,
 * applying orientation.
 */
export function resolvePaperDimensions(
  settings: PageSettings,
): { widthMm: number; heightMm: number } {
  let widthMm: number;
  let heightMm: number;
  if (settings.pageSize === "Custom") {
    widthMm = settings.customWidthMm ?? 210;
    heightMm = settings.customHeightMm ?? 297;
  } else {
    const def = PAPER_SIZES[settings.pageSize];
    widthMm = def.widthMm;
    heightMm = def.heightMm;
  }
  if (settings.orientation === "landscape") {
    return { widthMm: heightMm, heightMm: widthMm };
  }
  return { widthMm, heightMm };
}

/** Convert millimetres to CSS length string. */
export function mm(n: number): string {
  return `${n}mm`;
}

/** The canonical document — what the API returns and the editor consumes. */
export interface NuswordDocument {
  id: string;
  title: string;
  /** Tiptap/ProseMirror JSON content. */
  content: JSONContent;
  settings: PageSettings;
  createdAt: string;
  updatedAt: string;
  /** Word count derived from content (computed server-side for list views). */
  wordCount: number;
}

/** A version snapshot returned by the versions API. */
export interface NuswordDocumentVersion {
  id: string;
  documentId: string;
  version: number;
  message: string | null;
  createdAt: string;
  wordCount: number;
}

/** Save state shown in the editor top nav (PRD §10: autosave states). */
export type SaveState = "idle" | "saving" | "saved" | "error";
