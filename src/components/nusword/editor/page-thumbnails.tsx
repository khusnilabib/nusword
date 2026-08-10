"use client";

/**
 * PageThumbnails — mini previews of each paginated page for the sidebar.
 *
 * Renders scaled-down versions of each page so the user can navigate the
 * multi-page document visually. Clicking a thumbnail scrolls the preview to
 * that page (in preview mode) or switches to preview mode at that page.
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
import { PageBreak } from "./page-break";
import {
  resolvePaperDimensions,
  mm,
  type JSONContent,
  type PageSettings,
} from "@/types/document";
import type { PaginationResult } from "@/lib/nusword/pagination";
import { Icon } from "../icon";
import { cn } from "@/lib/utils";

interface PageThumbnailsProps {
  content: JSONContent;
  settings: PageSettings;
  pagination: PaginationResult;
  activePageIndex: number;
  onPageClick: (index: number) => void;
  onSwitchToPreview: () => void;
}

export function PageThumbnails({
  content,
  settings,
  pagination,
  activePageIndex,
  onPageClick,
  onSwitchToPreview,
}: PageThumbnailsProps) {
  const { widthMm } = resolvePaperDimensions(settings);
  // Thumbnail width: fit sidebar (280px - padding ~ 240px usable).
  const thumbWidthPx = 200;
  const scale = thumbWidthPx / (widthMm * 3.7795);

  const extensions = React.useMemo(
    () => [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment:
          settings.languageDirection === "rtl" ? "right" : "left",
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
    ],
    [settings.languageDirection],
  );

  if (pagination.totalPages === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Icon name="layers" size={28} className="text-outline-variant" />
        <p className="text-body-ui-md text-on-surface-variant">No pages</p>
        <p className="text-label-ui-sm text-outline">
          Add content to build pages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-label-ui-sm text-on-surface-variant">
          {pagination.totalPages} {pagination.totalPages === 1 ? "page" : "pages"}
        </span>
        <button
          type="button"
          onClick={onSwitchToPreview}
          className="flex cursor-pointer items-center gap-1 rounded border border-outline-variant px-2 py-1 text-label-ui-sm text-primary transition-colors hover:bg-surface-container-low"
        >
          <Icon name="visibility" size={14} />
          Preview
        </button>
      </div>

      {pagination.warnings.length > 0 && (
        <div className="rounded border border-error-container/50 bg-error-container/10 p-2 text-label-ui-sm text-on-error-container">
          {pagination.warnings.length} warning
          {pagination.warnings.length > 1 ? "s" : ""}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        {pagination.pages.map((page) => {
          const html = (() => {
            try {
              return generateHTML(
                { type: "doc", content: page.blocks },
                extensions as never,
              );
            } catch {
              return "";
            }
          })();
          return (
            <button
              key={page.index}
              type="button"
              onClick={() => onPageClick(page.index)}
              className={cn(
                "nusword-thumbnail block w-full",
                activePageIndex === page.index && "is-active",
              )}
              style={{ width: `${thumbWidthPx}px` }}
              aria-label={`Go to page ${page.pageNumber}`}
            >
              <div
                className="nusword-thumbnail-content"
                style={{
                  width: mm(widthMm),
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  height: `${(widthMm * 3.7795 * 1.414 * scale)}px`,
                  fontSize: `${settings.fontSizePt}pt`,
                  lineHeight: settings.lineHeight,
                  padding: `${settings.marginTopMm * 3.7795 * scale}px ${
                    settings.marginRightMm * 3.7795 * scale
                  }px ${settings.marginBottomMm * 3.7795 * scale}px ${
                    settings.marginLeftMm * 3.7795 * scale
                  }px`,
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
              <div className="nusword-thumbnail-label">
                {page.pageNumber}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
