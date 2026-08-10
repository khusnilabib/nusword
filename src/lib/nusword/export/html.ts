/**
 * NUSWORD HTML Export (PRD §16 — Render & Export).
 *
 * Generates a standalone HTML file with inline CSS that reproduces the
 * paginated document. Uses @page CSS rules for page size/margins so the
 * HTML can be printed to PDF from any browser as a fallback.
 */
import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { PageBreak } from "@/components/nusword/editor/page-break";
import type { JSONContent, PageSettings } from "@/types/document";
import { resolvePaperDimensions, mm } from "@/types/document";
import {
  formatPageNumber,
  resolveTemplate,
  type PaginationResult,
} from "@/lib/nusword/pagination";
import type { ExportPreset } from "./presets";

interface HtmlExportArgs {
  title: string;
  content: JSONContent;
  settings: PageSettings;
  pagination: PaginationResult;
  preset: ExportPreset;
}

/** Generate a standalone HTML string from the paginated document. */
export async function generateHtml({
  title,
  settings,
  pagination,
}: HtmlExportArgs): Promise<string> {
  const { widthMm, heightMm } = resolvePaperDimensions(settings);
  const extensions = [
    StarterKit.configure({ link: false, underline: false }),
    Underline,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      defaultAlignment: settings.languageDirection === "rtl" ? "right" : "left",
    }),
    Link,
    Image,
    Typography,
    Highlight,
    TextStyle,
    Color,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    PageBreak,
  ];

  const pagesHtml = pagination.pages
    .map((page) => {
      const pageStr = formatPageNumber(page.pageNumber, settings.pageNumberFormat);
      const pagesStr = formatPageNumber(
        pagination.totalPages - 1 + settings.pageNumberStart,
        settings.pageNumberFormat,
      );

      const showHeader = settings.header.enabled && (!page.isFirst || !settings.differentFirstPage);
      const showFooter = settings.footer.enabled && (!page.isFirst || !settings.differentFirstPage);

      const headerHtml = showHeader
        ? `<div class="nw-page-header">
             <span>${escapeHtml(resolveTemplate(settings.header.left, { page: pageStr, pages: pagesStr, title }))}</span>
             <span>${escapeHtml(resolveTemplate(settings.header.center, { page: pageStr, pages: pagesStr, title }))}</span>
             <span>${escapeHtml(resolveTemplate(settings.header.right, { page: pageStr, pages: pagesStr, title }))}</span>
           </div>`
        : "";

      const footerHtml = showFooter
        ? `<div class="nw-page-footer">
             <span>${escapeHtml(resolveTemplate(settings.footer.left, { page: pageStr, pages: pagesStr, title }))}</span>
             <span>${escapeHtml(resolveTemplate(settings.footer.center, { page: pageStr, pages: pagesStr, title }))}</span>
             <span>${escapeHtml(resolveTemplate(settings.footer.right, { page: pageStr, pages: pagesStr, title }))}</span>
           </div>`
        : "";

      let contentHtml = "";
      try {
        contentHtml = generateHTML(
          { type: "doc", content: page.blocks },
          extensions as never,
        );
      } catch {
        contentHtml = "";
      }

      return `<section class="nw-page">
        ${headerHtml}
        <div class="nw-page-content">${contentHtml}</div>
        ${footerHtml}
      </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${settings.languageDirection === "rtl" ? "ar" : "en"}" dir="${settings.languageDirection}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(title)}</title>
<style>
  @page {
    size: ${widthMm}mm ${heightMm}mm;
    margin: ${settings.marginTopMm}mm ${settings.marginRightMm}mm ${settings.marginBottomMm}mm ${settings.marginLeftMm}mm;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: #e2e7ff;
    font-family: ${getFontStack(settings.fontFamily)};
    color: #131b2e;
  }
  .nw-page {
    position: relative;
    width: ${mm(widthMm)};
    min-height: ${mm(heightMm)};
    margin: 0 auto 24px;
    padding: ${mm(settings.marginTopMm)} ${mm(settings.marginRightMm)} ${mm(settings.marginBottomMm)} ${mm(settings.marginLeftMm + (settings.gutterMm ?? 0))};
    background: white;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    page-break-after: always;
  }
  .nw-page:last-child { page-break-after: auto; }
  .nw-page-header, .nw-page-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'Hanken Grotesk', sans-serif;
    font-size: 10px;
    color: #717878;
    height: 20px;
  }
  .nw-page-header { margin-bottom: 8px; }
  .nw-page-footer { margin-top: 8px; }
  .nw-page-header span, .nw-page-footer span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nw-page-header span:nth-child(2),
  .nw-page-footer span:nth-child(2) { text-align: center; }
  .nw-page-header span:nth-child(3),
  .nw-page-footer span:nth-child(3) { text-align: right; }
  .nw-page-content {
    font-size: ${settings.fontSizePt}pt;
    line-height: ${settings.lineHeight};
  }
  .nw-page-content h1 { font-size: 36px; font-weight: 700; margin: 0.5em 0 0.3em; }
  .nw-page-content h2 { font-size: 24px; font-weight: 700; margin: 1.2em 0 0.3em; }
  .nw-page-content h3 { font-size: 20px; font-weight: 600; margin: 1em 0 0.3em; }
  .nw-page-content p { margin: 0 0 0.5em; }
  .nw-page-content ul, .nw-page-content ol { padding-left: 1.5em; }
  .nw-page-content blockquote { border-left: 2px solid #c1c8c7; padding-left: 1em; margin: 0; color: #414848; font-style: italic; }
  .nw-page-content pre { background: #eaedff; padding: 0.75em 1em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 14px; overflow-x: auto; }
  .nw-page-content table { border-collapse: collapse; width: 100%; }
  .nw-page-content th, .nw-page-content td { border: 1px solid #c1c8c7; padding: 0.4em 0.6em; }
  .nw-page-content th { background: #f2f3ff; font-weight: 600; }
  .nw-page-content img { max-width: 100%; height: auto; }
  .nw-page-content a { color: #012425; text-decoration: underline; }
  @media print {
    body { background: white; }
    .nw-page { box-shadow: none; margin: 0; }
  }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFontStack(fontFamily: string): string {
  switch (fontFamily) {
    case "Hanken Grotesk":
      return "'Hanken Grotesk', sans-serif";
    case "JetBrains Mono":
      return "'JetBrains Mono', monospace";
    case "Amiri (Arabic)":
      return "'Amiri', serif";
    default:
      return "'Source Serif 4', Georgia, serif";
  }
}
