/**
 * NUSWORD Book Engine Types (PRD §15 — Book & Kitab Architecture).
 *
 * A Book owns metadata, chapter references, trim size, binding intent,
 * page style, and print profile. Chapters form a nested tree with ordering.
 * Front matter (cover, title, copyright, dedication, preface, TOC) and
 * back matter (appendix, glossary, references, colophon) are configurable.
 *
 * Mirror margins alternate left/right on facing pages for book binding.
 * Running headers show the current chapter title at the top of each page.
 * Booklet imposition calculates sheet signatures and page ordering for
 * saddle-stitch binding.
 */
import type { JSONContent } from "@tiptap/react";
import type { PageSettings } from "./document";
import type { KitabSettings } from "./kitab";
import { DEFAULT_KITAB_SETTINGS } from "./kitab";

/** Book binding types. */
export type BindingType = "perfect" | "saddle" | "case" | "spiral";

/** Front matter entry types (PRD §15). */
export type FrontMatterType =
  | "cover"
  | "title-page"
  | "copyright"
  | "dedication"
  | "preface"
  | "toc";

/** Back matter entry types (PRD §15). */
export type BackMatterType =
  | "appendix"
  | "glossary"
  | "references"
  | "index"
  | "colophon";

/** A front/back matter entry. */
export interface BookMatterEntry {
  id: string;
  type: FrontMatterType | BackMatterType;
  title: string;
  /** Optional Tiptap JSON content for this matter page. */
  content?: JSONContent;
  /** Whether this entry is enabled/included in the book. */
  enabled: boolean;
}

/** Book-specific settings that extend the base PageSettings. */
export interface BookSettings {
  /** Base page settings (trim size, margins, typography). */
  pageSettings: PageSettings;
  /** Binding type (affects imposition). */
  binding: BindingType;
  /** Mirror margins for facing pages (left page vs right page). */
  mirrorMargins: boolean;
  /** Running header configuration. */
  runningHeader: {
    enabled: boolean;
    /** "chapter" shows current chapter title; "book" shows book title. */
    source: "chapter" | "book" | "custom";
    /** Custom text if source === "custom". */
    customText: string;
    /** Whether to show on left pages, right pages, or both. */
    position: "left" | "right" | "both";
  };
  /** Running footer configuration. */
  runningFooter: {
    enabled: boolean;
    /** Page number position for facing pages. */
    pageNumberPosition: "outer" | "inner" | "center";
  };
  /** Whether chapters start on odd (right-hand) pages. */
  chaptersStartOnOddPage: boolean;
  /** Booklet imposition settings (for saddle-stitch binding). */
  booklet: {
    /** Number of sheets per booklet signature. */
    sheetsPerSignature: number;
  };
  /** Kitab profile (Phase 6: RTL, Arabic typography, bilingual, footnotes, ornaments). */
  kitab: KitabSettings;
}

export const DEFAULT_BOOK_SETTINGS: BookSettings = {
  pageSettings: {
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
  },
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
  booklet: {
    sheetsPerSignature: 4,
  },
  kitab: { ...DEFAULT_KITAB_SETTINGS },
};

/** A chapter in the book's chapter tree. */
export interface ChapterNode {
  id: string;
  documentId: string | null;
  title: string;
  sortOrder: number;
  parentId: string | null;
  startNewPage: boolean;
  includeInToc: boolean;
  level: number;
  children: ChapterNode[];
}

/** The full book DTO returned by the API. */
export interface NuswordBook {
  id: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  settings: BookSettings;
  frontMatter: BookMatterEntry[];
  backMatter: BookMatterEntry[];
  chapters: ChapterNode[];
  createdAt: string;
  updatedAt: string;
}

/** Label metadata for front/back matter types. */
export const FRONT_MATTER_TYPES: Array<{
  type: FrontMatterType;
  label: string;
  icon: string;
}> = [
  { type: "cover", label: "Cover", icon: "photo_cover" },
  { type: "title-page", label: "Title Page", icon: "title" },
  { type: "copyright", label: "Copyright", icon: "copyright" },
  { type: "dedication", label: "Dedication", icon: "favorite" },
  { type: "preface", label: "Preface", icon: "menu_book" },
  { type: "toc", label: "Table of Contents", icon: "format_list_numbered" },
];

export const BACK_MATTER_TYPES: Array<{
  type: BackMatterType;
  label: string;
  icon: string;
}> = [
  { type: "appendix", label: "Appendix", icon: "attachment" },
  { type: "glossary", label: "Glossary", icon: "translate" },
  { type: "references", label: "References", icon: "link" },
  { type: "index", label: "Index", icon: "sort_by_alpha" },
  { type: "colophon", label: "Colophon", icon: "info" },
];

export const BINDING_TYPES: Array<{
  type: BindingType;
  label: string;
  description: string;
  icon: string;
}> = [
  { type: "perfect", label: "Perfect Bound", description: "Glued spine, paperback style.", icon: "book" },
  { type: "saddle", label: "Saddle Stitch", description: "Folded sheets stapled at spine. Enables booklet imposition.", icon: "menu_book" },
  { type: "case", label: "Case Bound", description: "Hardcover with signatures.", icon: "auto_stories" },
  { type: "spiral", label: "Spiral Bound", description: "Coil binding, lays flat.", icon: "all_inclusive" },
];
