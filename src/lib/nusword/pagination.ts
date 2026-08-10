/**
 * NUSWORD Pagination Engine (PRD §14 — Document & Page Engine).
 *
 * Deterministic pagination: given a Tiptap document and page settings, produce
 * an ordered list of pages, each containing the blocks that fit on that page.
 *
 * The engine is a PURE function — it does not touch the DOM. Block heights are
 * measured separately (via the measurement container in use-pagination.ts) and
 * passed in as a map from block index → pixel height. This separation keeps the
 * engine deterministic and testable, independent of the browser (PRD §14:
 * "Keep pagination independent from UI rendering so exported output is
 * deterministic").
 *
 * Rules implemented:
 *  - Explicit page breaks (the `pageBreak` node) always force a new page.
 *  - A block that doesn't fit in the remaining page height starts a new page.
 *  - Headings have "keep-with-next": a heading at the bottom of a page with no
 *    body block after it is pushed to the next page (widow/orphan control).
 *  - A single block taller than a full page overflows gracefully (tracked as
 *    a layout warning rather than silently clipping — PRD §14).
 */
import type { JSONContent } from "@tiptap/react";
import type { PageSettings } from "@/types/document";

/** A single paginated page: the blocks assigned to it + metadata. */
export interface PaginatedPage {
  /** 0-based index of this page in the document. */
  index: number;
  /** The display page number (respecting pageNumberStart). */
  pageNumber: number;
  /** Top-level Tiptap blocks assigned to this page. */
  blocks: JSONContent[];
  /** Whether this is the first page. */
  isFirst: boolean;
  /** Whether this is the last page. */
  isLast: boolean;
}

/** Layout issues detected during pagination (PRD §14: track warnings). */
export interface LayoutWarning {
  type: "overflow" | "widow" | "orphan" | "empty-page";
  blockIndex: number;
  message: string;
}

export interface PaginationResult {
  pages: PaginatedPage[];
  warnings: LayoutWarning[];
  totalPages: number;
}

/** Convert millimetres to CSS pixels at 96 DPI (1mm ≈ 3.7795px). */
export const MM_TO_PX = 96 / 25.4;

/** Convert points to CSS pixels (1pt = 1/72 inch, 1px = 1/96 inch). */
export const PT_TO_PX = 96 / 72;

/**
 * Compute the available content area (in px) for a page, accounting for
 * margins, gutter, and header/footer height.
 */
export function pageContentArea(
  settings: PageSettings,
  opts: { headerHeightPx: number; footerHeightPx: number },
): {
  pageWidthPx: number;
  pageHeightPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
} {
  const { widthMm, heightMm } = resolveDims(settings);
  const pageWidthPx = widthMm * MM_TO_PX;
  const pageHeightPx = heightMm * MM_TO_PX;

  const gutterPx = (settings.gutterMm ?? 0) * MM_TO_PX;
  const marginLeftPx = settings.marginLeftMm * MM_TO_PX + gutterPx;
  const marginRightPx = settings.marginRightMm * MM_TO_PX;

  const contentWidthPx = pageWidthPx - marginLeftPx - marginRightPx;
  const contentHeightPx =
    pageHeightPx -
    settings.marginTopMm * MM_TO_PX -
    settings.marginBottomMm * MM_TO_PX -
    opts.headerHeightPx -
    opts.footerHeightPx;

  return { pageWidthPx, pageHeightPx, contentWidthPx, contentHeightPx };
}

function resolveDims(settings: PageSettings): {
  widthMm: number;
  heightMm: number;
} {
  let widthMm: number;
  let heightMm: number;
  if (settings.pageSize === "Custom") {
    widthMm = settings.customWidthMm ?? 210;
    heightMm = settings.customHeightMm ?? 297;
  } else {
    // Inline to avoid circular import with types/document.ts resolvePaperDimensions.
    const PAPER: Record<string, { widthMm: number; heightMm: number }> = {
      A4: { widthMm: 210, heightMm: 297 },
      A5: { widthMm: 148, heightMm: 210 },
      B5: { widthMm: 176, heightMm: 250 },
      Letter: { widthMm: 216, heightMm: 279 },
      Legal: { widthMm: 216, heightMm: 356 },
      F4: { widthMm: 210, heightMm: 330 },
    };
    const def = PAPER[settings.pageSize];
    widthMm = def.widthMm;
    heightMm = def.heightMm;
  }
  if (settings.orientation === "landscape") {
    return { widthMm: heightMm, heightMm: widthMm };
  }
  return { widthMm, heightMm };
}

/**
 * Run the pagination algorithm.
 *
 * @param doc        The Tiptap document JSON (top-level `content` array).
 * @param blockHeights  Map from block index (into doc.content) → pixel height.
 *                      Blocks not in the map get a fallback estimate.
 * @param contentHeightPx  Available content height per page (from pageContentArea).
 * @param pageNumberStart  Starting page number from settings.
 * @returns  PaginationResult with pages + warnings.
 */
export function paginateDocument(
  doc: JSONContent,
  blockHeights: Map<number, number>,
  contentHeightPx: number,
  pageNumberStart: number = 1,
): PaginationResult {
  const blocks = doc.content ?? [];
  const pages: PaginatedPage[] = [];
  const warnings: LayoutWarning[] = [];

  let currentPageBlocks: JSONContent[] = [];
  let currentPageHeight = 0;
  let pageIndex = 0;

  const flushPage = (isLast: boolean) => {
    pages.push({
      index: pageIndex,
      pageNumber: pageIndex + pageNumberStart,
      blocks: currentPageBlocks,
      isFirst: pageIndex === 0,
      isLast,
    });
    if (currentPageBlocks.length === 0) {
      warnings.push({
        type: "empty-page",
        blockIndex: -1,
        message: `Page ${pageIndex + 1} is empty.`,
      });
    }
    pageIndex++;
    currentPageBlocks = [];
    currentPageHeight = 0;
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isPageBreak = block.type === "pageBreak";

    if (isPageBreak) {
      // Explicit page break — finalize current page (even if empty, to
      // represent the intentional break) and start fresh.
      flushPage(false);
      continue;
    }

    const blockHeight = blockHeights.get(i) ?? estimateBlockHeight(block);

    // Widow/orphan control for headings (keep-with-next).
    const isHeading = block.type === "heading";
    const nextBlock = blocks[i + 1];
    const hasNext = nextBlock && nextBlock.type !== "pageBreak";

    // Does this block fit in the remaining space?
    const fits = currentPageHeight + blockHeight <= contentHeightPx;

    if (!fits && currentPageBlocks.length > 0) {
      // Block doesn't fit — start a new page.
      flushPage(false);
    }

    // Check: if this is a heading and the next block wouldn't fit either,
    // push the heading to the next page now (keep-with-next).
    if (
      isHeading &&
      hasNext &&
      currentPageBlocks.length > 0 &&
      currentPageHeight + blockHeight + (blockHeights.get(i + 1) ?? 0) >
        contentHeightPx
    ) {
      flushPage(false);
    }

    // If a single block is taller than a full page, warn but include it.
    if (blockHeight > contentHeightPx) {
      warnings.push({
        type: "overflow",
        blockIndex: i,
        message: `Block ${i + 1} (${block.type}) is taller than a full page and will overflow.`,
      });
    }

    currentPageBlocks.push(block);
    currentPageHeight += blockHeight;
  }

  // Flush the final page (only if it has content or there were prior pages).
  if (currentPageBlocks.length > 0 || pages.length > 0) {
    flushPage(true);
  } else {
    // Completely empty document — one empty page.
    pages.push({
      index: 0,
      pageNumber: pageNumberStart,
      blocks: [],
      isFirst: true,
      isLast: true,
    });
  }

  // Mark last page.
  if (pages.length > 0) {
    pages[pages.length - 1].isLast = true;
  }

  return { pages, warnings, totalPages: pages.length };
}

/** Fallback height estimate (px) when no measurement is available. */
function estimateBlockHeight(block: JSONContent): number {
  const text = extractText(block);
  const lineCount = Math.max(1, Math.ceil(text.length / 60));
  const lineHeightPx = 18 * 1.6; // default 18pt * 1.6
  const paraSpacing = 16;
  if (block.type === "heading") {
    const level = (block.attrs?.level as number) ?? 2;
    return level === 1 ? 56 : level === 2 ? 40 : 32;
  }
  return lineCount * lineHeightPx + paraSpacing;
}

function extractText(node: JSONContent): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join("");
  return "";
}

/**
 * Format a page number according to the settings (decimal / roman / none).
 */
export function formatPageNumber(
  n: number,
  format: "decimal" | "roman" | "none",
): string {
  if (format === "none") return "";
  if (format === "roman") return toRoman(n);
  return String(n);
}

function toRoman(num: number): string {
  if (num <= 0) return String(num);
  const table: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let result = "";
  let n = num;
  for (const [value, sym] of table) {
    while (n >= value) {
      result += sym;
      n -= value;
    }
  }
  return result;
}

/**
 * Resolve a header/footer template string, replacing {{page}}, {{pages}},
 * {{title}} with actual values.
 */
export function resolveTemplate(
  template: string,
  ctx: { page: string; pages: string; title: string },
): string {
  return template
    .replace(/\{\{page\}\}/g, ctx.page)
    .replace(/\{\{pages\}\}/g, ctx.pages)
    .replace(/\{\{title\}\}/g, ctx.title);
}
