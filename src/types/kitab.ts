/**
 * NUSWORD Kitab Engine Types (PRD §15 — Kitab Engine, §6 Phase 6).
 *
 * Kitab profile supports RTL, Arabic typography, bilingual blocks,
 * footnotes, ornaments, traditional headers, and Arabic-Indic page numbering.
 *
 * A Kitab is a specialized Book with Islamic/Arabic publishing features:
 *  - RTL direction throughout
 *  - Amiri (or custom Arabic) font for Arabic text
 *  - Bilingual blocks (Arabic + translation side-by-side)
 *  - Footnotes for tafsir/commentary
 *  - Ornamental dividers (traditional Islamic geometric patterns)
 *  - Arabic-Indic page numbers (٠١٢٣...)
 */

/** Ornament style for decorative dividers. */
export type OrnamentStyle =
  | "none"
  | "diamond"
  | "star"
  | "arabesque"
  | "line-double"
  | "line-ornate";

/** Bilingual layout mode — how Arabic and translation are arranged. */
export type BilingualLayout =
  | "side-by-side"   // Arabic right, translation left (facing pages)
  | "stacked"        // Arabic on top, translation below
  | "interlinear"    // Line-by-line alternation
  | "arabic-only";   // No translation column

/** Footnote numbering style. */
export type FootnoteNumbering = "decimal" | "arabic-indic" | "per-page";

/** Kitab-specific settings that extend BookSettings. */
export interface KitabSettings {
  /** Whether this book is a kitab (activates RTL, Arabic typography, etc.). */
  enabled: boolean;
  /** Primary Arabic font (default: Amiri). */
  arabicFont: string;
  /** Arabic font size in pt. */
  arabicFontSizePt: number;
  /** Arabic line height (usually larger for Arabic). */
  arabicLineHeight: number;
  /** Translation font (for the non-Arabic column). */
  translationFont: string;
  /** Translation font size in pt. */
  translationFontSizePt: number;
  /** Bilingual layout mode. */
  bilingualLayout: BilingualLayout;
  /** Ornament style for decorative dividers. */
  ornamentStyle: OrnamentStyle;
  /** Footnote configuration. */
  footnotes: {
    enabled: boolean;
    numbering: FootnoteNumbering;
    /** Position of footnote text on the page. */
    position: "bottom" | "margin";
    /** Separator line between footnotes and body. */
    separator: boolean;
  };
  /** Traditional kitab header (e.g. surah name, chapter title in Arabic). */
  traditionalHeader: {
    enabled: boolean;
    /** Custom Arabic text for the header. */
    customText: string;
    /** Whether to show a decorative border around the header. */
    border: boolean;
  };
  /** Use Arabic-Indic numerals (٠١٢٣) for page numbers. */
  arabicPageNumbers: boolean;
  /** Whether to add basmala at the start of each chapter. */
  basmalaPerChapter: boolean;
}

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

/** Ornament style metadata for UI. */
export const ORNAMENT_STYLES: Array<{
  type: OrnamentStyle;
  label: string;
  icon: string;
  preview: string;
}> = [
  { type: "none", label: "None", icon: "block", preview: "" },
  { type: "diamond", label: "Diamond", icon: "diamond", preview: "◆" },
  { type: "star", label: "Star", icon: "star", preview: "✦" },
  { type: "arabesque", label: "Arabesque", icon: "spa", preview: "﷽" },
  { type: "line-double", label: "Double Line", icon: "horizontal_rule", preview: "═══════" },
  { type: "line-ornate", label: "Ornate Line", icon: "auto_awesome", preview: "──✦──" },
];

/** Bilingual layout metadata for UI. */
export const BILINGUAL_LAYOUTS: Array<{
  type: BilingualLayout;
  label: string;
  description: string;
  icon: string;
}> = [
  { type: "side-by-side", label: "Side by Side", description: "Arabic on right, translation on left.", icon: "view_column" },
  { type: "stacked", label: "Stacked", description: "Arabic on top, translation below.", icon: "view_stream" },
  { type: "interlinear", label: "Interlinear", description: "Line-by-line alternation.", icon: "format_align_right" },
  { type: "arabic-only", label: "Arabic Only", description: "No translation column.", icon: "format_align_right" },
];

/** Arabic font options. */
export const ARABIC_FONTS: Array<{ value: string; label: string }> = [
  { value: "Amiri", label: "Amiri (Traditional)" },
  { value: "Scheherazade New", label: "Scheherazade New" },
  { value: "Noto Naskh Arabic", label: "Noto Naskh Arabic" },
  { value: "Noto Kufi Arabic", label: "Noto Kufi Arabic (Kufic)" },
];

/** Common Arabic phrases used in kitab. */
export const ARABIC_PHRASES = {
  basmala: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  takbir: "اللَّهُ أَكْبَرُ",
  shahada: "لَا إِلَٰهَ إِلَّا اللَّهُ مُحَمَّدٌ رَسُولُ اللَّهِ",
  jallajalalahu: "جَلَّ جَلَالُهُ",
  sallallahu: "صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ",
};
