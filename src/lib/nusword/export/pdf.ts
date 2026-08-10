/**
 * NUSWORD PDF Export (PRD §16 — Render & Export).
 *
 * Generates a PDF from the paginated document using pdfkit.
 * Each paginated page becomes a PDF page with correct dimensions,
 * margins, header, footer, and content blocks.
 *
 * The pagination data (which blocks go on which page) is computed client-side
 * via DOM measurement and sent to the server in the export request. This keeps
 * the server-side renderer deterministic and independent of browser rendering
 * (PRD §14: "Keep pagination independent from UI rendering so exported output
 * is deterministic").
 */
import PDFDocument from "pdfkit";
import type { JSONContent, PageSettings } from "@/types/document";
import {
  resolvePaperDimensions,
  type HeaderFooterConfig,
} from "@/types/document";
import {
  formatPageNumber,
  resolveTemplate,
  type PaginatedPage,
  type PaginationResult,
  MM_TO_PX,
} from "@/lib/nusword/pagination";
import type { ExportPreset } from "./presets";

/** mm → PDF points (1mm = 2.834645669 pt). */
const MM_TO_PT = 72 / 25.4;

interface PdfExportArgs {
  title: string;
  content: JSONContent;
  settings: PageSettings;
  pagination: PaginationResult;
  preset: ExportPreset;
}

/**
 * Generate a PDF Buffer from the paginated document.
 */
export async function generatePdf({
  title,
  settings,
  pagination,
  preset,
}: PdfExportArgs): Promise<Buffer> {
  const { widthMm, heightMm } = resolvePaperDimensions(settings);
  const widthPt = widthMm * MM_TO_PT;
  const heightPt = heightMm * MM_TO_PT;

  const doc = new PDFDocument({
    size: [widthPt, heightPt],
    margins: {
      top: settings.marginTopMm * MM_TO_PT,
      bottom: settings.marginBottomMm * MM_TO_PT,
      left: settings.marginLeftMm * MM_TO_PT,
      right: settings.marginRightMm * MM_TO_PT,
    },
    info: {
      Title: title,
      Producer: "NUSWORD",
      Creator: "NUSWORD Export Engine",
    },
  });

  // Collect the PDF into a buffer.
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const marginPt = {
    top: settings.marginTopMm * MM_TO_PT,
    bottom: settings.marginBottomMm * MM_TO_PT,
    left: settings.marginLeftMm * MM_TO_PT,
    right: settings.marginRightMm * MM_TO_PT,
  };
  const contentWidthPt =
    widthPt - marginPt.left - marginPt.right - (settings.gutterMm ?? 0) * MM_TO_PT;
  const headerHeightPt = 20;
  const footerHeightPt = 20;

  for (let i = 0; i < pagination.pages.length; i++) {
    const page = pagination.pages[i];
    if (i > 0) doc.addPage();

    const showHeader =
      settings.header.enabled && (!page.isFirst || !settings.differentFirstPage);
    const showFooter =
      settings.footer.enabled && (!page.isFirst || !settings.differentFirstPage);

    const pageStr = formatPageNumber(page.pageNumber, settings.pageNumberFormat);
    const pagesStr = formatPageNumber(
      pagination.totalPages - 1 + settings.pageNumberStart,
      settings.pageNumberFormat,
    );

    // Header
    if (showHeader) {
      drawHeaderFooter(doc, settings.header, {
        page: pageStr,
        pages: pagesStr,
        title,
        y: marginPt.top - headerHeightPt + 4,
        leftX: marginPt.left,
        centerX: widthPt / 2,
        rightX: widthPt - marginPt.right,
        width: contentWidthPt,
      });
    }

    // Content blocks
    let y = marginPt.top + (showHeader ? headerHeightPt + 4 : 0);
    const contentBottom = heightPt - marginPt.bottom - (showFooter ? footerHeightPt + 4 : 0);

    for (const block of page.blocks) {
      if (block.type === "pageBreak") continue;
      y = drawBlock(doc, block, y, marginPt.left, contentWidthPt, contentBottom, settings);
      if (y >= contentBottom) break; // safety
    }

    // Footer
    if (showFooter) {
      drawHeaderFooter(doc, settings.footer, {
        page: pageStr,
        pages: pagesStr,
        title,
        y: heightPt - marginPt.bottom + 4,
        leftX: marginPt.left,
        centerX: widthPt / 2,
        rightX: widthPt - marginPt.right,
        width: contentWidthPt,
      });
    }
  }

  doc.end();

  // Wait for the PDF to finish.
  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

/* ---------------------------------------------------------------- */

function drawHeaderFooter(
  doc: PDFKit.PDFDocument,
  config: HeaderFooterConfig,
  ctx: {
    page: string;
    pages: string;
    title: string;
    y: number;
    leftX: number;
    centerX: number;
    rightX: number;
    width: number;
  },
) {
  doc.fontSize(9);
  doc.fillColor("#717878");

  if (config.left) {
    const text = resolveTemplate(config.left, ctx);
    doc.text(text, ctx.leftX, ctx.y, {
      width: ctx.width / 3,
      align: "left",
      lineBreak: false,
    });
  }
  if (config.center) {
    const text = resolveTemplate(config.center, ctx);
    doc.text(text, ctx.leftX + ctx.width / 6, ctx.y, {
      width: ctx.width / 1.5,
      align: "center",
      lineBreak: false,
    });
  }
  if (config.right) {
    const text = resolveTemplate(config.right, ctx);
    doc.text(text, ctx.rightX - ctx.width / 3, ctx.y, {
      width: ctx.width / 3,
      align: "right",
      lineBreak: false,
    });
  }
  doc.fillColor("#131b2e"); // reset
}

/** Draw a single Tiptap block and return the new Y position. */
function drawBlock(
  doc: PDFKit.PDFDocument,
  block: JSONContent,
  y: number,
  x: number,
  width: number,
  bottomLimit: number,
  settings: PageSettings,
): number {
  if (y >= bottomLimit) return y;

  const fontSize = settings.fontSizePt;
  const lineHeight = settings.lineHeight;
  const align = (block.attrs?.textAlign as string) || "left";

  switch (block.type) {
    case "heading": {
      const level = (block.attrs?.level as number) ?? 2;
      const headingSize = level === 1 ? fontSize * 2 : level === 2 ? fontSize * 1.4 : fontSize * 1.15;
      doc.fontSize(headingSize);
      const text = extractText(block);
      const opts = { width, align: align as "left" | "center" | "right" | "justify" };
      const height = doc.heightOfString(text, opts);
      doc.text(text, x, y, { ...opts, lineGap: 4 });
      return y + height + 8;
    }
    case "paragraph": {
      doc.fontSize(fontSize);
      const text = renderInlineText(block);
      if (!text.trim()) return y + fontSize * lineHeight * 0.5;
      const opts = { width, align: align as "left" | "center" | "right" | "justify", lineGap: 2 };
      const height = doc.heightOfString(text, opts);
      doc.text(text, x, y, opts);
      return y + height + 6;
    }
    case "bulletList":
    case "orderedList": {
      const items = block.content || [];
      let itemY = y;
      items.forEach((item, idx) => {
        if (itemY >= bottomLimit) return;
        const marker = block.type === "bulletList" ? "•" : `${idx + 1}.`;
        doc.fontSize(fontSize);
        const text = renderInlineText(item);
        const markerWidth = 18;
        doc.text(marker, x, itemY, { width: markerWidth, align: "left" });
        const opts = { width: width - markerWidth, align: align as "left" | "justify" };
        const height = doc.heightOfString(text, opts);
        doc.text(text, x + markerWidth, itemY, opts);
        itemY += height + 4;
      });
      return itemY + 4;
    }
    case "blockquote": {
      doc.fontSize(fontSize);
      const text = renderInlineText(block);
      const opts = { width: width - 20, align: "left" as const };
      const height = doc.heightOfString(text, opts);
      // Draw a left border line
      doc
        .moveTo(x, y)
        .lineTo(x, y + height)
        .lineWidth(2)
        .strokeColor("#c1c8c7")
        .stroke();
      doc.fillColor("#414848");
      doc.text(text, x + 12, y, opts);
      doc.fillColor("#131b2e");
      return y + height + 8;
    }
    case "codeBlock": {
      doc.fontSize(fontSize * 0.8);
      const text = extractText(block);
      const opts = { width: width - 8, align: "left" as const };
      const height = doc.heightOfString(text, opts);
      doc
        .roundedRect(x, y, width, height + 8, 2)
        .fillColor("#eaedff")
        .fill();
      doc.fillColor("#131b2e");
      doc.text(text, x + 4, y + 4, opts);
      return y + height + 12;
    }
    case "horizontalRule": {
      doc
        .moveTo(x, y + 4)
        .lineTo(x + width, y + 4)
        .lineWidth(1)
        .strokeColor("#c1c8c7")
        .stroke();
      return y + 12;
    }
    case "image": {
      const src = block.attrs?.src as string;
      if (src && src.startsWith("data:image/")) {
        try {
          const base64Data = src.split(",")[1];
          const imgBuffer = Buffer.from(base64Data, "base64");
          const img = doc.openImage(imgBuffer);
          const imgWidth = Math.min(width, img.width);
          const imgHeight = (img.height / img.width) * imgWidth;
          doc.image(imgBuffer, x, y, { width: imgWidth, height: imgHeight });
          return y + imgHeight + 8;
        } catch {
          // skip broken images
        }
      }
      return y + 20;
    }
    case "table": {
      // Simplified table rendering
      return drawTable(doc, block, y, x, width, fontSize);
    }
    default: {
      const text = extractText(block);
      if (!text) return y;
      doc.fontSize(fontSize);
      const opts = { width, align: align as "left" | "justify" };
      const height = doc.heightOfString(text, opts);
      doc.text(text, x, y, opts);
      return y + height + 6;
    }
  }
}

function drawTable(
  doc: PDFKit.PDFDocument,
  table: JSONContent,
  y: number,
  x: number,
  width: number,
  fontSize: number,
): number {
  const rows = table.content || [];
  const colCount = rows[0]?.content?.length || 1;
  const colWidth = width / colCount;
  let rowY = y;

  for (const row of rows) {
    const cells = row.content || [];
    let maxCellHeight = 0;
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const cellText = extractText(cell);
      doc.fontSize(fontSize * 0.9);
      const cellHeight = doc.heightOfString(cellText, {
        width: colWidth - 8,
      });
      maxCellHeight = Math.max(maxCellHeight, cellHeight);
    }
    const rowHeight = maxCellHeight + 8;

    // Draw cell borders
    for (let c = 0; c <= colCount; c++) {
      doc
        .moveTo(x + c * colWidth, rowY)
        .lineTo(x + c * colWidth, rowY + rowHeight)
        .lineWidth(0.5)
        .strokeColor("#c1c8c7")
        .stroke();
    }
    doc
      .moveTo(x, rowY + rowHeight)
      .lineTo(x + width, rowY + rowHeight)
      .lineWidth(0.5)
      .strokeColor("#c1c8c7")
      .stroke();

    // Draw cell text
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const cellText = extractText(cell);
      doc.fontSize(fontSize * 0.9);
      if (row.attrs?.isHeader) {
        doc.fillColor("#131b2e");
      }
      doc.text(cellText, x + c * colWidth + 4, rowY + 4, {
        width: colWidth - 8,
      });
    }
    rowY += rowHeight;
  }
  // Top border
  doc
    .moveTo(x, y)
    .lineTo(x + width, y)
    .lineWidth(0.5)
    .strokeColor("#c1c8c7")
    .stroke();

  return rowY + 8;
}

/** Extract plain text from a Tiptap node (recursive). */
function extractText(node: JSONContent): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join("");
  return "";
}

/** Render inline text with basic formatting markers for PDFKit.
 *  PDFKit doesn't support rich inline formatting in a single text() call,
 *  so we extract plain text. Bold/italic within a paragraph are flattened. */
function renderInlineText(node: JSONContent): string {
  return extractText(node);
}
