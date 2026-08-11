"use client";

/**
 * ExportDialog — the export configuration + preflight + download UI.
 *
 * Lets the user pick a format (PDF/DOCX/HTML) and print preset, runs a
 * preflight check, triggers the export job, and provides a download link.
 * Also shows recent export history for the document.
 *
 * PRD §16: "Presets: Screen PDF, Standard Print, High Quality Print, Booklet,
 * Custom. Preflight runs before final print export."
 */
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  EXPORT_FORMATS,
  EXPORT_PRESETS,
  type ExportFormat,
  type ExportPresetKey,
} from "@/lib/nusword/export/presets";
import type { PaginationResult } from "@/lib/nusword/pagination";
import type { PreflightReport } from "@/lib/nusword/preflight";
import type { JSONContent, PageSettings } from "@/types/document";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  title: string;
  content: JSONContent;
  settings: PageSettings;
  pagination: PaginationResult;
}

interface ExportJobResult {
  id: string;
  format: string;
  preset: string;
  status: string;
  artifactSize: number | null;
  checksum: string | null;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string;
  mimeType: string;
  extension: string;
}

interface ExportJobHistory {
  id: string;
  format: string;
  preset: string;
  status: string;
  artifactSize: number | null;
  createdAt: string;
  downloadUrl: string | null;
  errorMessage: string | null;
}

export function ExportDialog({
  open,
  onOpenChange,
  documentId,
  title,
  content,
  settings,
  pagination,
}: ExportDialogProps) {
  const [format, setFormat] = React.useState<ExportFormat>("pdf");
  const [preset, setPreset] = React.useState<ExportPresetKey>("standard");
  const [isExporting, setIsExporting] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<ExportJobResult | null>(null);
  const [history, setHistory] = React.useState<ExportJobHistory[]>([]);
  const [preflight, setPreflight] = React.useState<PreflightReport | null>(null);

  // Run preflight locally whenever the dialog opens (instant feedback).
  React.useEffect(() => {
    if (!open) return;
    // Import preflight dynamically to keep the bundle smaller.
    import("@/lib/nusword/preflight").then(({ runPreflight }) => {
      setPreflight(runPreflight(content, settings, pagination));
    });
    // Load export history.
    fetch(`/api/documents/${documentId}/export`)
      .then((r) => r.json())
      .then((d) => setHistory(d.jobs || []))
      .catch(() => {});
  }, [open, content, settings, pagination, documentId]);

  const handleExport = async () => {
    setIsExporting(true);
    setLastResult(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, preset, pagination }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Export failed");
      }
      setLastResult(data.job);
      toast.success(`${format.toUpperCase()} exported successfully`);
      // Refresh history.
      const histRes = await fetch(`/api/documents/${documentId}/export`);
      const histData = await histRes.json();
      setHistory(histData.jobs || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface p-0">
        <DialogHeader className="border-b border-outline-variant p-4">
          <DialogTitle className="text-headline-ui-md text-on-surface">
            Export Document
          </DialogTitle>
          <DialogDescription className="text-body-ui-md text-on-surface-variant">
            {title} · {pagination.totalPages} page
            {pagination.totalPages !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-6">
          {/* Format selection */}
          <div>
            <label className="text-label-ui-sm mb-2 block uppercase tracking-wider text-on-surface-variant">
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPORT_FORMATS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFormat(f.key)}
                  className={cn(
                    "flex cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    format === f.key
                      ? "border-primary bg-surface-container-lowest"
                      : "border-outline-variant hover:bg-surface-container-low",
                  )}
                >
                  <Icon
                    name={f.icon}
                    size={24}
                    className={format === f.key ? "text-primary" : "text-on-surface-variant"}
                  />
                  <span className="text-body-ui-md font-semibold text-on-surface">
                    {f.label}
                  </span>
                  <span className="text-label-ui-sm text-on-surface-variant">
                    {f.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preset selection */}
          {format === "pdf" && (
            <div>
              <label className="text-label-ui-sm mb-2 block uppercase tracking-wider text-on-surface-variant">
                Print Preset
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {Object.values(EXPORT_PRESETS).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors",
                      preset === p.key
                        ? "border-primary bg-surface-container-lowest"
                        : "border-outline-variant hover:bg-surface-container-low",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-body-ui-md font-medium text-on-surface">
                        {p.label}
                      </span>
                      <span className="text-label-ui-sm text-on-surface-variant">
                        {p.description}
                      </span>
                    </div>
                    <div className="text-mono-ui text-outline">
                      {p.dpi} DPI
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preflight summary */}
          {preflight && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
                  Preflight
                </span>
                <span
                  className={cn(
                    "text-label-ui-sm rounded px-2 py-0.5",
                    preflight.hasErrors
                      ? "bg-error-container text-on-error-container"
                      : preflight.hasWarnings
                        ? "bg-surface-container-high text-on-surface-variant"
                        : "bg-primary-fixed text-on-primary-fixed",
                  )}
                >
                  {preflight.summary}
                </span>
              </div>
              {preflight.issues.length > 0 && (
                <ul className="space-y-1">
                  {preflight.issues.slice(0, 5).map((issue, i) => (
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
          )}

          {/* Export result */}
          {lastResult && (
            <div className="rounded-lg border border-primary bg-primary-fixed/30 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="check_circle" size={20} className="text-primary" />
                  <div>
                    <p className="text-body-ui-md font-medium text-on-surface">
                      Export complete
                    </p>
                    <p className="text-label-ui-sm text-on-surface-variant">
                      {lastResult.format.toUpperCase()} ·{" "}
                      {formatBytes(lastResult.artifactSize)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(lastResult.downloadUrl)}
                  className="flex cursor-pointer items-center gap-2 rounded bg-primary px-3 py-1.5 text-body-ui-md text-on-primary transition-colors hover:bg-primary-container"
                >
                  <Icon name="download" size={16} />
                  Download
                </button>
              </div>
            </div>
          )}

          {/* Export history */}
          {history.length > 0 && (
            <div>
              <label className="text-label-ui-sm mb-2 block uppercase tracking-wider text-on-surface-variant">
                Recent Exports
              </label>
              <div className="space-y-1">
                {history.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between rounded border border-outline-variant px-3 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        name={
                          job.status === "completed"
                            ? "check_circle"
                            : job.status === "failed"
                              ? "error"
                              : "progress_activity"
                        }
                        size={16}
                        className={
                          job.status === "completed"
                            ? "text-primary"
                            : job.status === "failed"
                              ? "text-error"
                              : "text-on-surface-variant"
                        }
                      />
                      <span className="text-body-ui-md text-on-surface">
                        {job.format.toUpperCase()}
                      </span>
                      <span className="text-label-ui-sm text-on-surface-variant">
                        {EXPORT_PRESETS[job.preset as ExportPresetKey]?.label || job.preset}
                      </span>
                      <span className="text-label-ui-sm text-outline">
                        {new Date(job.createdAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {job.downloadUrl && job.status === "completed" ? (
                      <button
                        type="button"
                        onClick={() => handleDownload(job.downloadUrl!)}
                        className="flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-label-ui-sm text-primary hover:bg-surface-container-low"
                      >
                        <Icon name="download" size={14} />
                        Download
                      </button>
                    ) : job.errorMessage ? (
                      <span className="text-label-ui-sm text-error">
                        {job.errorMessage.slice(0, 40)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-outline-variant p-4">
          <span className="text-label-ui-sm text-outline">
            Artifacts expire after 7 days
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer rounded border border-outline-variant px-4 py-1.5 text-body-ui-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || preflight?.hasErrors}
              className="flex cursor-pointer items-center gap-2 rounded bg-primary px-4 py-1.5 text-body-ui-md text-on-primary transition-colors hover:bg-primary-container disabled:cursor-wait disabled:opacity-50"
            >
              <Icon
                name={isExporting ? "progress_activity" : "file_export"}
                size={16}
                className={isExporting ? "animate-spin" : ""}
              />
              {isExporting ? "Exporting…" : `Export ${format.toUpperCase()}`}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
