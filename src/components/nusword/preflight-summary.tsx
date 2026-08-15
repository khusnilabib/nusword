"use client";

/**
 * PreflightSummary — the preflight report UI for the ExportDialog.
 *
 * Extracted from `export-dialog.tsx` so it can be lazy-loaded via
 * `React.lazy()`. The preflight module (and anything it transitively
 * imports) is only fetched when this component renders, which only
 * happens when the export dialog is actually open. This keeps the
 * preflight code out of the main editor bundle.
 */
import * as React from "react";
import { runPreflight, type PreflightReport } from "@/lib/nusword/preflight";
import type { PaginationResult } from "@/lib/nusword/pagination";
import type { JSONContent, PageSettings } from "@/types/document";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

export interface PreflightSummaryProps {
  content: JSONContent;
  settings: PageSettings;
  pagination: PaginationResult;
  /** Called whenever the preflight report is recomputed. */
  onReport?: (report: PreflightReport) => void;
}

export function PreflightSummary({
  content,
  settings,
  pagination,
  onReport,
}: PreflightSummaryProps) {
  // Compute preflight report. Re-runs only when inputs change.
  const report: PreflightReport = React.useMemo(
    () => runPreflight(content, settings, pagination),
    [content, settings, pagination],
  );

  // Lift the report up to the parent (used to gate the Export button).
  React.useEffect(() => {
    onReport?.(report);
  }, [report, onReport]);

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
          Preflight
        </span>
        <span
          className={cn(
            "text-label-ui-sm rounded px-2 py-0.5",
            report.hasErrors
              ? "bg-error-container text-on-error-container"
              : report.hasWarnings
                ? "bg-surface-container-high text-on-surface-variant"
                : "bg-primary-fixed text-on-primary-fixed",
          )}
        >
          {report.summary}
        </span>
      </div>
      {report.issues.length > 0 && (
        <ul className="space-y-1">
          {report.issues.slice(0, 5).map((issue, i) => (
            <li
              key={i}
              className="text-body-ui-md flex items-start gap-2 text-on-surface-variant"
            >
              <Icon
                name={
                  issue.severity === "error"
                    ? "error"
                    : issue.severity === "warning"
                      ? "warning"
                      : "info"
                }
                size={14}
                className={
                  issue.severity === "error"
                    ? "text-error mt-0.5 shrink-0"
                    : issue.severity === "warning"
                      ? "text-on-surface-variant mt-0.5 shrink-0"
                      : "text-outline mt-0.5 shrink-0"
                }
              />
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
