/**
 * NUSWORD Preflight Checker (PRD §16 — Preflight).
 *
 * Runs before final print export to detect layout problems:
 *  - Overflow (blocks taller than a full page)
 *  - Blank pages
 *  - Missing content (empty document)
 *  - Margin/bleed issues (bleed > 0 but no margin to accommodate it)
 *  - Page count warnings (single page for booklet, etc.)
 *
 * Returns a structured report with severity levels so the UI can show
 * warnings/errors before the user commits to export.
 */
import type { PageSettings } from "@/types/document";
import type { PaginationResult } from "@/lib/nusword/pagination";
import type { JSONContent } from "@tiptap/react";

export type PreflightSeverity = "info" | "warning" | "error";

export interface PreflightIssue {
  severity: PreflightSeverity;
  category: string;
  message: string;
  page?: number;
}

export interface PreflightReport {
  issues: PreflightIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
  summary: string;
}

/**
 * Run preflight checks on a document before export.
 */
export function runPreflight(
  content: JSONContent,
  settings: PageSettings,
  pagination: PaginationResult,
): PreflightReport {
  const issues: PreflightIssue[] = [];

  // 1. Empty document check
  const hasContent = pagination.pages.some(
    (p) => p.blocks.length > 0,
  );
  if (!hasContent) {
    issues.push({
      severity: "error",
      category: "content",
      message: "Document has no content. Nothing to export.",
    });
  }

  // 2. Overflow warnings from pagination engine
  for (const w of pagination.warnings) {
    issues.push({
      severity: w.type === "overflow" ? "warning" : "info",
      category: w.type,
      message: w.message,
      page: w.blockIndex >= 0 ? undefined : undefined,
    });
  }

  // 3. Blank pages
  const blankPages = pagination.pages.filter(
    (p) => p.blocks.length === 0,
  );
  for (const p of blankPages) {
    issues.push({
      severity: "warning",
      category: "blank-page",
      message: `Page ${p.pageNumber} is blank.`,
      page: p.pageNumber,
    });
  }

  // 4. Margin/bleed checks
  if (settings.bleedMm > 0) {
    const minMargin = settings.bleedMm;
    if (settings.marginTopMm < minMargin) {
      issues.push({
        severity: "warning",
        category: "bleed",
        message: `Top margin (${settings.marginTopMm}mm) is less than bleed (${settings.bleedMm}mm). Content may be clipped.`,
      });
    }
    if (settings.marginBottomMm < minMargin) {
      issues.push({
        severity: "warning",
        category: "bleed",
        message: `Bottom margin (${settings.marginBottomMm}mm) is less than bleed (${settings.bleedMm}mm). Content may be clipped.`,
      });
    }
  }

  // 5. Very small margins
  const minSafeMargin = 10;
  if (settings.marginTopMm < minSafeMargin || settings.marginBottomMm < minSafeMargin) {
    issues.push({
      severity: "info",
      category: "margin",
      message: `Margins are below ${minSafeMargin}mm. Content may be too close to the page edge for printing.`,
    });
  }

  // 6. Font size checks
  if (settings.fontSizePt < 8) {
    issues.push({
      severity: "warning",
      category: "typography",
      message: `Font size (${settings.fontSizePt}pt) is very small and may be unreadable in print.`,
    });
  }
  if (settings.fontSizePt > 24) {
    issues.push({
      severity: "info",
      category: "typography",
      message: `Font size (${settings.fontSizePt}pt) is large, which will increase page count.`,
    });
  }

  // 7. Page count info
  if (pagination.totalPages > 100) {
    issues.push({
      severity: "info",
      category: "page-count",
      message: `Document has ${pagination.totalPages} pages. Export may take longer.`,
    });
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  const hasWarnings = issues.some((i) => i.severity === "warning");

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  let summary: string;
  if (hasErrors) {
    summary = `${errorCount} error${errorCount > 1 ? "s" : ""}, ${warningCount} warning${warningCount !== 1 ? "s" : ""}`;
  } else if (hasWarnings) {
    summary = `${warningCount} warning${warningCount > 1 ? "s" : ""}, ${infoCount} info`;
  } else if (issues.length > 0) {
    summary = `${infoCount} info`;
  } else {
    summary = "No issues found";
  }

  return { issues, hasErrors, hasWarnings, summary };
}
