/**
 * NUSWORD Booklet Imposition (PRD §15: Booklet engine).
 *
 * Calculates sheet signatures and page ordering for saddle-stitch binding.
 * For a booklet, pages are arranged on folded sheets so that when the sheets
 * are nested and stapled at the fold, the pages appear in correct reading
 * order.
 *
 * Example: a 4-sheet booklet (8 sheets = 32 pages) arranges pages so that
 * sheet 1 has page 32 on the left and page 1 on the right (front), and
 * page 2 on the left and page 31 on the right (back).
 *
 * Imposition must be a separate module from document editing (PRD §15).
 */

export interface ImpositionSheet {
  /** 0-based sheet index. */
  index: number;
  /** Front side: [leftPage, rightPage] (1-based page numbers). */
  front: [number, number];
  /** Back side: [leftPage, rightPage] (1-based page numbers). */
  back: [number, number];
}

export interface ImpositionResult {
  /** Total pages in the document (may be padded to a multiple of 4). */
  totalPages: number;
  /** Original page count before padding. */
  originalPageCount: number;
  /** Number of blank pages added to make the count divisible by 4. */
  blankPagesAdded: number;
  /** Number of sheets per signature. */
  sheetsPerSignature: number;
  /** Number of signatures. */
  signatureCount: number;
  /** The imposed sheets with their page assignments. */
  sheets: ImpositionSheet[];
}

/**
 * Calculate saddle-stitch imposition for a document.
 *
 * @param pageCount    The document's page count.
 * @param sheetsPerSignature  Number of sheets per booklet signature.
 * @returns ImpositionResult with the page ordering for each sheet.
 */
export function calculateBookletImposition(
  pageCount: number,
  sheetsPerSignature: number = 4,
): ImpositionResult {
  // Each sheet has 4 pages (2 front, 2 back). Each signature has
  // sheetsPerSignature * 4 pages.
  const pagesPerSignature = sheetsPerSignature * 4;

  // Pad page count to a multiple of pagesPerSignature.
  const paddedPageCount = Math.ceil(pageCount / pagesPerSignature) * pagesPerSignature;
  const blankPagesAdded = paddedPageCount - pageCount;

  const signatureCount = paddedPageCount / pagesPerSignature;
  const sheets: ImpositionSheet[] = [];

  for (let sig = 0; sig < signatureCount; sig++) {
    const sigStartPage = sig * pagesPerSignature;
    const sigSheets = sheetsPerSignature;

    for (let s = 0; s < sigSheets; s++) {
      // Within a signature, the first sheet pairs the first and last pages.
      const low = sigStartPage + s * 2 + 1; // left side of front
      const high = sigStartPage + pagesPerSignature - s * 2; // right side of front

      // Back side: the inner pair
      const lowBack = low + 1;
      const highBack = high - 1;

      sheets.push({
        index: sig * sheetsPerSignature + s,
        front: [high, low],
        back: [lowBack, highBack],
      });
    }
  }

  return {
    totalPages: paddedPageCount,
    originalPageCount: pageCount,
    blankPagesAdded,
    sheetsPerSignature,
    signatureCount,
    sheets,
  };
}

/**
 * Reorder a page list according to imposition.
 * Given an array of pages (0-indexed), returns them in booklet reading order
 * so the exporter can lay them out 2-up per sheet.
 *
 * Pages beyond the original count are filled with null (blank pages).
 */
export function imposePages<T>(
  pages: T[],
  sheetsPerSignature: number = 4,
): Array<T | null> {
  const pageCount = pages.length;
  const imposition = calculateBookletImposition(pageCount, sheetsPerSignature);
  const result: Array<T | null> = [];

  for (const sheet of imposition.sheets) {
    // Front: [high, low] → reading order left-to-right on the sheet
    const frontHigh = sheet.front[0] - 1; // 0-based
    const frontLow = sheet.front[1] - 1;
    result.push(frontHigh < pageCount ? pages[frontHigh] : null);
    result.push(frontLow < pageCount ? pages[frontLow] : null);

    // Back: [lowBack, highBack]
    const backLow = sheet.back[0] - 1;
    const backHigh = sheet.back[1] - 1;
    result.push(backLow < pageCount ? pages[backLow] : null);
    result.push(backHigh < pageCount ? pages[backHigh] : null);
  }

  return result;
}

/**
 * Get the facing page number for a given page in a booklet.
 * On a folded sheet, page N faces page (totalPages - N + 1).
 */
export function getFacingPage(pageNumber: number, totalPages: number): number {
  return totalPages - pageNumber + 1;
}
