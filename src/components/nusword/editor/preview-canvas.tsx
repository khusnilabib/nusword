"use client";

/**
 * PreviewCanvas — the deterministic multi-page renderer (PRD §3: preview;
 * PRD §14: deterministic page renderer).
 *
 * Renders the paginated document as a stack of paper sheets, each with:
 *  - Header (left/center/right slots with template variables resolved)
 *  - Content area (the blocks assigned to that page, rendered as read-only HTML)
 *  - Footer (with page numbering)
 *
 * This is the "print preview" view — what the exported PDF will look like.
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
import {
  formatPageNumber,
  resolveTemplate,
  type PaginatedPage,
  type PaginationResult,
} from "@/lib/nusword/pagination";
import { cn } from "@/lib/utils";

const HEADER_HEIGHT_PX = 24;
const FOOTER_HEIGHT_PX = 24;

interface PreviewCanvasProps {
  title: string;
  content: JSONContent;
  settings: PageSettings;
  pagination: PaginationResult;
  zoom: number;
  activePageIndex: number;
  onPageClick: (index: number) => void;
}

export function PreviewCanvas({
  title,
  content,
  settings,
  pagination,
  zoom,
  activePageIndex,
  onPageClick,
}: PreviewCanvasProps) {
  const { widthMm, heightMm } = resolvePaperDimensions(settings);
  const scale = zoom / 100;
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

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-auto bg-surface-container-low px-4 py-10">
      {/* Ruler */}
      <div className="sticky top-0 z-10 flex h-6 w-full shrink-0 items-end overflow-hidden border-b border-outline-variant bg-surface px-gutter">
        <div className="ruler-h h-4 flex-1" />
      </div>

      <div
        className="mt-6 flex flex-col items-center"
        style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
      >
        {pagination.pages.map((page) => (
          <PreviewPage
            key={page.index}
            page={page}
            title={title}
            settings={settings}
            widthMm={widthMm}
            heightMm={heightMm}
            totalPages={pagination.totalPages}
            extensions={extensions}
            isActive={page.index === activePageIndex}
            onClick={() => onPageClick(page.index)}
          />
        ))}

        {/* Layout warnings */}
        {pagination.warnings.length > 0 && (
          <div className="mt-4 w-[210mm] max-w-full rounded-lg border border-error-container bg-error-container/20 p-3 text-body-ui-md text-on-error-container">
            <strong>Layout warnings:</strong>
            <ul className="mt-1 list-disc pl-5">
              {pagination.warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- */

function PreviewPage({
  page,
  title,
  settings,
  widthMm,
  heightMm,
  totalPages,
  extensions,
  isActive,
  onClick,
}: {
  page: PaginatedPage;
  title: string;
  settings: PageSettings;
  widthMm: number;
  heightMm: number;
  totalPages: number;
  extensions: ReturnType<typeof React.useMemo> extends Array<infer T> ? T[] : never;
  isActive: boolean;
  onClick: () => void;
}) {
  const showHeader = settings.header.enabled && (!page.isFirst || !settings.differentFirstPage);
  const showFooter = settings.footer.enabled && (!page.isFirst || !settings.differentFirstPage);

  const pageStr = formatPageNumber(page.pageNumber, settings.pageNumberFormat);
  const pagesStr = formatPageNumber(
    totalPages - 1 + settings.pageNumberStart,
    settings.pageNumberFormat,
  );

  const headerLeft = resolveTemplate(settings.header.left, { page: pageStr, pages: pagesStr, title });
  const headerCenter = resolveTemplate(settings.header.center, { page: pageStr, pages: pagesStr, title });
  const headerRight = resolveTemplate(settings.header.right, { page: pageStr, pages: pagesStr, title });
  const footerLeft = resolveTemplate(settings.footer.left, { page: pageStr, pages: pagesStr, title });
  const footerCenter = resolveTemplate(settings.footer.center, { page: pageStr, pages: pagesStr, title });
  const footerRight = resolveTemplate(settings.footer.right, { page: pageStr, pages: pagesStr, title });

  return (
    <div
      className={cn("nusword-preview-page", isActive && "ring-2 ring-primary/30")}
      style={{
        width: mm(widthMm),
        minHeight: mm(heightMm),
        paddingTop: mm(settings.marginTopMm),
        paddingBottom: mm(settings.marginBottomMm),
        paddingLeft: mm(settings.marginLeftMm + (settings.gutterMm ?? 0)),
        paddingRight: mm(settings.marginRightMm),
        marginBottom: "24px",
      }}
      onClick={onClick}
    >
      {/* Header */}
      {showHeader && (
        <div
          className="nusword-preview-header"
          style={{ top: mm(settings.marginTopMm - 12), height: `${HEADER_HEIGHT_PX}px` }}
        >
          <span>{headerLeft}</span>
          <span>{headerCenter}</span>
          <span>{headerRight}</span>
        </div>
      )}

      {/* Content */}
      <div
        className="nusword-preview-content nusword-prose"
        dir={settings.languageDirection}
        style={{
          fontSize: `${settings.fontSizePt}pt`,
          lineHeight: settings.lineHeight,
          marginTop: showHeader ? `${HEADER_HEIGHT_PX + 8}px` : "0",
          marginBottom: showFooter ? `${FOOTER_HEIGHT_PX + 8}px` : "0",
        }}
      >
        <PageBlocks page={page} extensions={extensions} />
      </div>

      {/* Footer */}
      {showFooter && (
        <div
          className="nusword-preview-footer"
          style={{ bottom: mm(settings.marginBottomMm - 12), height: `${FOOTER_HEIGHT_PX}px` }}
        >
          <span>{footerLeft}</span>
          <span>{footerCenter}</span>
          <span>{footerRight}</span>
        </div>
      )}
    </div>
  );
}

/** Render the blocks assigned to a page as read-only HTML. */
function PageBlocks({
  page,
  extensions,
}: {
  page: PaginatedPage;
  extensions: Array<{ [k: string]: unknown }>;
}) {
  const html = React.useMemo(() => {
    if (page.blocks.length === 0) return "";
    try {
      return generateHTML({ type: "doc", content: page.blocks }, extensions as never);
    } catch {
      return "";
    }
  }, [page.blocks, extensions]);

  if (page.blocks.length === 0) {
    return <p style={{ color: "var(--outline)" }}>— Empty page —</p>;
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
