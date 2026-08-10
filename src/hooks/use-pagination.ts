"use client";

/**
 * usePagination — measures Tiptap document blocks and runs the deterministic
 * pagination engine.
 *
 * Approach (PRD §8: "DOM-based pagination for editor"):
 *  1. Render each top-level block into a hidden measurement container sized to
 *     the exact page content width.
 *  2. Measure each block's pixel height via offsetHeight.
 *  3. Pass the measurements to `paginateDocument()` to get the page list.
 *
 * Re-measures on content/settings change (debounced via requestAnimationFrame)
 * and on image load (images change height after decoding).
 */
import * as React from "react";
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
import {
  paginateDocument,
  pageContentArea,
  MM_TO_PX,
  type PaginationResult,
} from "@/lib/nusword/pagination";
import type { JSONContent, PageSettings } from "@/types/document";

/** Estimated header/footer height in px (used for content area calc). */
const HEADER_HEIGHT_PX = 24;
const FOOTER_HEIGHT_PX = 24;

interface UsePaginationArgs {
  content: JSONContent | null;
  settings: PageSettings | null;
  /** Re-measure trigger — bump to force a re-measure (e.g. after image load). */
  measureNonce: number;
}

export function usePagination({
  content,
  settings,
  measureNonce,
}: UsePaginationArgs): PaginationResult & { measuring: boolean } {
  const [result, setResult] = React.useState<PaginationResult>({
    pages: [],
    warnings: [],
    totalPages: 0,
  });
  const [measuring, setMeasuring] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Compute the content area dimensions from settings.
  const dims = React.useMemo(() => {
    if (!settings) return null;
    return pageContentArea(settings, {
      headerHeightPx: settings.header.enabled ? HEADER_HEIGHT_PX : 0,
      footerHeightPx: settings.footer.enabled ? FOOTER_HEIGHT_PX : 0,
    });
  }, [settings]);

  // Build the HTML for each top-level block so we can measure it.
  const blockHtmls = React.useMemo(() => {
    if (!content?.content) return [];
    const extensions = [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: settings?.languageDirection === "rtl" ? "right" : "left",
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
    return content.content.map((block) => {
      try {
        return generateHTML({ type: "doc", content: [block] }, extensions);
      } catch {
        return "";
      }
    });
  }, [content, settings?.languageDirection]);

  // Perform measurement in a hidden container.
  React.useEffect(() => {
    if (!content?.content || !settings || !dims) {
      setResult({ pages: [], warnings: [], totalPages: 0 });
      return;
    }

    setMeasuring(true);

    // Defer to next frame so the browser has painted any pending changes.
    const raf = requestAnimationFrame(() => {
      const blockHeights = new Map<number, number>();

      // Create or reuse the hidden measurement container.
      let container = containerRef.current;
      if (!container) {
        container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-99999px";
        container.style.top = "0";
        container.style.visibility = "hidden";
        container.style.pointerEvents = "none";
        container.className = "nusword-prose";
        document.body.appendChild(container);
        containerRef.current = container;
      }

      // Size the container to the content width.
      container.style.width = `${dims.contentWidthPx}px`;
      container.style.fontSize = `${settings.fontSizePt * (96 / 72)}px`;
      container.style.lineHeight = String(settings.lineHeight);
      container.style.margin = "0";
      container.style.padding = "0";
      container.style.columnCount = "1";

      // Render each block and measure it.
      content.content.forEach((block, i) => {
        if (block.type === "pageBreak") {
          blockHeights.set(i, 0);
          return;
        }
        const html = blockHtmls[i];
        if (!html) {
          blockHeights.set(i, 24);
          return;
        }
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const child = wrapper.firstElementChild as HTMLElement | null;
        if (child) {
          container!.appendChild(child);
          // Measure: offsetHeight + computed margin.
          const style = getComputedStyle(child);
          const marginTop = parseFloat(style.marginTop) || 0;
          const marginBottom = parseFloat(style.marginBottom) || 0;
          const height = child.offsetHeight + marginTop + marginBottom;
          blockHeights.set(i, height);
          container!.removeChild(child);
        } else {
          blockHeights.set(i, 24);
        }
      });

      const res = paginateDocument(
        content,
        blockHeights,
        dims.contentHeightPx,
        settings.pageNumberStart,
      );
      setResult(res);
      setMeasuring(false);
    });

    return () => cancelAnimationFrame(raf);
  }, [content, settings, dims, blockHtmls, measureNonce]);

  // Cleanup the measurement container on unmount.
  React.useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
    };
  }, []);

  return { ...result, measuring };
}

/** Re-export for consumers that need the px conversion. */
export { MM_TO_PX };
