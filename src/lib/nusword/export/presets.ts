/**
 * NUSWORD Export Presets (PRD §16: presets).
 *
 * Screen PDF, Standard Print, High Quality Print, Booklet, Custom.
 * Each preset configures quality/compatibility settings for the export.
 */
export type ExportFormat = "pdf" | "docx" | "html" | "svg" | "png";
export type ExportPresetKey =
  | "screen"
  | "standard"
  | "highquality"
  | "booklet"
  | "custom";

export interface ExportPreset {
  key: ExportPresetKey;
  label: string;
  description: string;
  /** Image quality (0-100) for raster content. */
  imageQuality: number;
  /** Whether to embed all fonts. */
  embedFonts: boolean;
  /** Whether to include bleed marks. */
  includeBleed: boolean;
  /** DPI for rasterized content. */
  dpi: number;
}

export const EXPORT_PRESETS: Record<ExportPresetKey, ExportPreset> = {
  screen: {
    key: "screen",
    label: "Screen PDF",
    description: "Optimized for on-screen viewing. Smaller file size, 72 DPI.",
    imageQuality: 70,
    embedFonts: true,
    includeBleed: false,
    dpi: 72,
  },
  standard: {
    key: "standard",
    label: "Standard Print",
    description: "Balanced for desktop printing. 150 DPI, embedded fonts.",
    imageQuality: 85,
    embedFonts: true,
    includeBleed: false,
    dpi: 150,
  },
  highquality: {
    key: "highquality",
    label: "High Quality Print",
    description: "Production-ready for professional printing. 300 DPI, bleed marks.",
    imageQuality: 95,
    embedFonts: true,
    includeBleed: true,
    dpi: 300,
  },
  booklet: {
    key: "booklet",
    label: "Booklet",
    description: "Imposition for booklet printing (2-up saddle stitch).",
    imageQuality: 90,
    embedFonts: true,
    includeBleed: true,
    dpi: 300,
  },
  custom: {
    key: "custom",
    label: "Custom",
    description: "Custom export settings.",
    imageQuality: 85,
    embedFonts: true,
    includeBleed: false,
    dpi: 150,
  },
};

export const EXPORT_FORMATS: Array<{
  key: ExportFormat;
  label: string;
  description: string;
  icon: string;
  extension: string;
  mimeType: string;
}> = [
  {
    key: "pdf",
    label: "PDF",
    description: "Print-ready PDF document. Primary export format.",
    icon: "picture_as_pdf",
    extension: "pdf",
    mimeType: "application/pdf",
  },
  {
    key: "docx",
    label: "DOCX",
    description: "Microsoft Word document. Preserves semantic structure.",
    icon: "description",
    extension: "docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    key: "html",
    label: "HTML",
    description: "Standalone HTML file with inline CSS. Opens in any browser.",
    icon: "html",
    extension: "html",
    mimeType: "text/html",
  },
];
