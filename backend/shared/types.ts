/**
 * NUSWORD Shared Types — used across all Encore services.
 *
 * These mirror the frontend types in src/types/ so the API contracts match.
 */

// ─── Auth ──────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

// ─── Documents ─────────────────────────────────────────────────────────

export interface DocumentDTO {
  id: string;
  title: string;
  content: unknown; // Tiptap JSON
  settings: PageSettings;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  organizationId: string | null;
}

export interface PageSettings {
  schemaVersion: number;
  pageSize: string;
  customWidthMm?: number;
  customHeightMm?: number;
  orientation: "portrait" | "landscape";
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  bleedMm: number;
  gutterMm: number;
  mirrorMargins: boolean;
  columns: number;
  languageDirection: "ltr" | "rtl";
  fontFamily: string;
  fontSizePt: number;
  lineHeight: number;
  header: { enabled: boolean; left: string; center: string; right: string };
  footer: { enabled: boolean; left: string; center: string; right: string };
  pageNumberFormat: "decimal" | "roman" | "arabic-indic" | "none";
  pageNumberStart: number;
  differentFirstPage: boolean;
}

export interface DocumentVersionDTO {
  id: string;
  documentId: string;
  version: number;
  message: string | null;
  createdAt: string;
  wordCount: number;
}

// ─── Books ─────────────────────────────────────────────────────────────

export interface BookDTO {
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

export interface BookSettings {
  pageSettings: PageSettings;
  binding: "perfect" | "saddle" | "case" | "spiral";
  mirrorMargins: boolean;
  runningHeader: {
    enabled: boolean;
    source: "chapter" | "book" | "custom";
    customText: string;
    position: "left" | "right" | "both";
  };
  runningFooter: {
    enabled: boolean;
    pageNumberPosition: "outer" | "inner" | "center";
  };
  chaptersStartOnOddPage: boolean;
  booklet: { sheetsPerSignature: number };
  kitab: KitabSettings;
}

export interface KitabSettings {
  enabled: boolean;
  arabicFont: string;
  arabicFontSizePt: number;
  arabicLineHeight: number;
  translationFont: string;
  translationFontSizePt: number;
  bilingualLayout: "side-by-side" | "stacked" | "interlinear" | "arabic-only";
  ornamentStyle: "none" | "diamond" | "star" | "arabesque" | "line-double" | "line-ornate";
  footnotes: {
    enabled: boolean;
    numbering: "decimal" | "arabic-indic" | "per-page";
    position: "bottom" | "margin";
    separator: boolean;
  };
  traditionalHeader: {
    enabled: boolean;
    customText: string;
    border: boolean;
  };
  arabicPageNumbers: boolean;
  basmalaPerChapter: boolean;
}

export interface BookMatterEntry {
  id: string;
  type: string;
  title: string;
  content?: unknown;
  enabled: boolean;
}

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

// ─── Organizations ─────────────────────────────────────────────────────

export type OrgRole = "owner" | "admin" | "editor" | "commenter" | "viewer";
export type ShareRole = "editor" | "commenter" | "viewer";

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  documentCount: number;
  bookCount: number;
  myRole: OrgRole;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMemberDTO {
  id: string;
  email: string;
  name: string | null;
  role: OrgRole;
  createdAt: string;
}

export interface ShareDTO {
  id: string;
  documentId: string;
  documentTitle: string;
  sharedWithEmail: string;
  role: ShareRole;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Templates ─────────────────────────────────────────────────────────

export interface TemplateDTO {
  id: string;
  title: string;
  description: string | null;
  type: "document" | "book";
  category: "academic" | "business" | "creative" | "religious" | "personal";
  published: boolean;
  useCount: number;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Usage ─────────────────────────────────────────────────────────────

export interface UsageStats {
  documentsCreated: number;
  booksCreated: number;
  exportsRun: number;
  templatesUsed: number;
  recentEvents: Array<{ type: string; count: number; date: string }>;
}
