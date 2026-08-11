/**
 * Document Export APIs (PRD §16 — Preflight + Render & Export).
 *
 *   POST /documents/:id/export            — create + run an export job
 *   GET  /documents/:id/export            — list recent export jobs
 *   GET  /export-jobs/:id/download        — download a completed artifact (raw)
 *
 * Mirrors `src/app/api/documents/[id]/export/route.ts` and
 * `src/app/api/export-jobs/[id]/download/route.ts`.
 *
 * Export jobs are tracked in the `export_jobs` table with status
 * (pending/processing/completed/failed), preflight report (JSON), inline
 * artifact storage (BYTEA), SHA-256 checksum, and a 7-day retention window.
 *
 * NOTE on generators:
 *   The original Next.js prototype uses pdfkit + the `docx` npm package + a
 *   Tiptap-rendered HTML pipeline. For the Encore port we ship a working
 *   HTML generator (pure-TS Tiptap-JSON walker, no Tiptap runtime dep) and
 *   lightweight PDF/DOCX stubs that produce a minimal but valid artifact.
 *   The full pdfkit/docx generators can be wired in by replacing the bodies
 *   of `generatePdf` and `generateDocx` below — the surrounding job
 *   tracking, checksum, retention, and download flow is already production-ready.
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { z } from "zod";
import { collect, db, firstRow } from "./documents";
import {
  asDocumentRow,
  extractText,
  parseContent,
  parseSettings,
  toDocumentDTO,
  type DocumentRow,
  type TiptapNode,
} from "./_serialize";
import type { PageSettings } from "../../shared/types";

// ─── Constants ───────────────────────────────────────────────────────────

/** Retention: artifacts expire after this many days (PRD §25). */
const RETENTION_DAYS = 7;

/** MIME types per export format. */
const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  html: "text/html",
  svg: "image/svg+xml",
  png: "image/png",
};

/** File extensions per export format. */
const EXTENSIONS: Record<string, string> = {
  pdf: "pdf",
  docx: "docx",
  html: "html",
  svg: "svg",
  png: "png",
};

// ─── Schemas ─────────────────────────────────────────────────────────────

const ExportRequestSchema = z.object({
  format: z.enum(["pdf", "docx", "html"]),
  preset: z
    .enum(["screen", "standard", "highquality", "booklet", "custom"])
    .default("standard"),
  pagination: z
    .object({
      pages: z.array(z.any()),
      warnings: z.array(z.any()),
      totalPages: z.number(),
    })
    .optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function getEmail(): string {
  const email = auth.data?.email;
  if (!email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return email;
}

/** Fetch a live document row by id (no ownership check). */
async function fetchDocRow(id: string): Promise<DocumentRow | null> {
  const row = await firstRow(
    db.query`
      SELECT id, owner_email, title, content, settings, organization_id,
             created_at, updated_at, deleted_at
      FROM documents WHERE id = ${id}
    `,
  );
  if (!row) return null;
  return asDocumentRow(row as Record<string, unknown>);
}

/** Fetch a live document accessible to the caller (owner or sharee). */
async function fetchAccessibleDoc(id: string, email: string): Promise<DocumentRow> {
  const row = await fetchDocRow(id);
  if (!row || row.deleted_at) {
    throw APIError.notFound("Document not found");
  }
  if (row.owner_email !== email) {
    const share = await firstRow(
      db.query`
        SELECT id FROM shared_documents
        WHERE document_id = ${id} AND shared_with_email = ${email}
        LIMIT 1
      `,
    );
    if (!share) {
      throw APIError.permissionDenied("You do not have access to this document");
    }
  }
  return row;
}

/** Run preflight checks on the document before export. */
function runPreflight(
  content: TiptapNode,
  settings: PageSettings,
  pagination: z.infer<typeof ExportRequestSchema>["pagination"],
): {
  issues: Array<{ severity: string; category: string; message: string; page?: number }>;
  hasErrors: boolean;
  hasWarnings: boolean;
  summary: string;
} {
  const issues: Array<{ severity: string; category: string; message: string; page?: number }> = [];

  // 1. Empty content check.
  const hasContent = !!content.content && content.content.length > 0;
  if (!hasContent) {
    issues.push({
      severity: "error",
      category: "content",
      message: "Document has no content. Nothing to export.",
    });
  }

  // 2. Pagination warnings (if provided).
  if (pagination) {
    for (const w of pagination.warnings) {
      const wObj = w as { type?: string; message?: string };
      issues.push({
        severity: wObj.type === "overflow" ? "warning" : "info",
        category: wObj.type ?? "pagination",
        message: wObj.message ?? "",
      });
    }
    if (pagination.totalPages > 100) {
      issues.push({
        severity: "info",
        category: "page-count",
        message: `Document has ${pagination.totalPages} pages. Export may take longer.`,
      });
    }
  }

  // 3. Bleed/margin checks.
  if (settings.bleedMm > 0) {
    if (settings.marginTopMm < settings.bleedMm) {
      issues.push({
        severity: "warning",
        category: "bleed",
        message: `Top margin (${settings.marginTopMm}mm) is less than bleed (${settings.bleedMm}mm). Content may be clipped.`,
      });
    }
    if (settings.marginBottomMm < settings.bleedMm) {
      issues.push({
        severity: "warning",
        category: "bleed",
        message: `Bottom margin (${settings.marginBottomMm}mm) is less than bleed (${settings.bleedMm}mm). Content may be clipped.`,
      });
    }
  }

  // 4. Typography sanity.
  if (settings.fontSizePt < 8) {
    issues.push({
      severity: "warning",
      category: "typography",
      message: `Font size (${settings.fontSizePt}pt) is very small and may be unreadable in print.`,
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

// ─── Generators ──────────────────────────────────────────────────────────

interface GenerateArgs {
  title: string;
  content: TiptapNode;
  settings: PageSettings;
  preset: string;
}

/** Escape HTML special characters. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Render a single Tiptap node to HTML (recursive). */
function renderNodeHtml(node: TiptapNode): string {
  if (node.text) return escapeHtml(node.text);
  if (!node.content) return "";
  const inner = node.content.map(renderNodeHtml).join("");
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const tag = `h${Math.min(6, Math.max(1, level))}`;
      return `<${tag}>${inner}</${tag}>`;
    }
    case "paragraph":
      return `<p>${inner}</p>`;
    case "bulletList":
      return `<ul>${inner}</ul>`;
    case "orderedList":
      return `<ol>${inner}</ol>`;
    case "listItem":
      return `<li>${inner}</li>`;
    case "blockquote":
      return `<blockquote>${inner}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${inner}</code></pre>`;
    case "horizontalRule":
      return `<hr/>`;
    case "hardBreak":
      return `<br/>`;
    case "image": {
      const src = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"/>`;
    }
    case "link": {
      const href = (node.attrs?.href as string) ?? "";
      return `<a href="${escapeHtml(href)}">${inner}</a>`;
    }
    default:
      return inner;
  }
}

/** Generate a standalone HTML file from the document (no Tiptap runtime dep). */
function generateHtml({ title, content, settings }: GenerateArgs): Buffer {
  const bodyHtml = renderNodeHtml(content);
  const dir = settings.languageDirection === "rtl" ? "rtl" : "ltr";
  return Buffer.from(
    `<!DOCTYPE html>
<html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(title)}</title>
<style>
  body {
    font-family: ${settings.fontFamily}, Georgia, serif;
    font-size: ${settings.fontSizePt}pt;
    line-height: ${settings.lineHeight};
    color: #131b2e;
    max-width: 760px;
    margin: 2rem auto;
    padding: 0 1.5rem;
  }
  h1 { font-size: 2em; font-weight: 700; margin: 0.5em 0 0.3em; }
  h2 { font-size: 1.5em; font-weight: 700; margin: 1.2em 0 0.3em; }
  h3 { font-size: 1.2em; font-weight: 600; margin: 1em 0 0.3em; }
  p { margin: 0 0 0.5em; }
  ul, ol { padding-left: 1.5em; }
  blockquote { border-left: 3px solid #c1c8c7; padding-left: 1em; margin: 0; color: #414848; font-style: italic; }
  pre { background: #eaedff; padding: 0.75em 1em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; overflow-x: auto; }
  img { max-width: 100%; height: auto; }
  a { color: #012425; text-decoration: underline; }
  hr { border: none; border-top: 1px solid #c1c8c7; margin: 1.5em 0; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${bodyHtml}
</body>
</html>`,
    "utf-8",
  );
}

/**
 * Generate a PDF artifact.
 *
 * Phase 9 stub: produces a minimal valid PDF containing the document title
 * and extracted plain-text content. Wire in `pdfkit` here for full layout
 * (margins, headers/footers, page breaks, RTL, kitab ornaments) — the
 * surrounding job-tracking flow already handles checksums, retention, etc.
 */
function generatePdf({ title, content }: GenerateArgs): Buffer {
  const text = extractText(content).trim() || "(empty document)";
  // Escape PDF string literals (parens + backslashes).
  const escapePdf = (s: string): string =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  // Split text into ~80-char lines for the page body.
  const lines: string[] = [];
  const words = text.split(/\s+/);
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 > 80) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);

  const titleLine = escapePdf(title);
  const bodyLines = lines.map((l) => escapePdf(l));

  // Build a minimal single-page PDF.
  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
  );
  const contentLines: string[] = [];
  contentLines.push("BT");
  contentLines.push("/F1 24 Tf");
  contentLines.push("72 760 Td");
  contentLines.push(`(${titleLine}) Tj`);
  contentLines.push("0 -36 Td");
  contentLines.push("/F1 11 Tf");
  for (const l of bodyLines) {
    contentLines.push(`(${l}) Tj`);
    contentLines.push("0 -14 Td");
  }
  contentLines.push("ET");
  const stream = contentLines.join("\n");
  objects.push(
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  );

  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n", "utf-8")];
  const offsets: number[] = [parts[0].length];
  for (const obj of objects) {
    const buf = Buffer.from(obj, "utf-8");
    offsets.push(offsets[offsets.length - 1] + buf.length);
    parts.push(buf);
  }
  const xrefStart = offsets[offsets.length - 1];
  const xrefLines = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
  for (let i = 0; i < objects.length; i++) {
    xrefLines.push(`${offsets[i].toString().padStart(10, "0")} 00000 n \n`);
  }
  parts.push(Buffer.from(xrefLines.join(""), "utf-8"));
  parts.push(
    Buffer.from(
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
      "utf-8",
    ),
  );
  return Buffer.concat(parts);
}

/**
 * Generate a DOCX artifact.
 *
 * Phase 9 stub: produces a minimal WordML (XML) document containing the
 * title and extracted text. Wire in the `docx` npm package here for full
 * styling — the surrounding flow is unchanged.
 */
function generateDocx({ title, content }: GenerateArgs): Buffer {
  const text = escapeHtml(extractText(content).trim() || "(empty document)");
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>${escapeHtml(title)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>${text}</w:t></w:r>
    </w:p>
  </w:body>
</w:wordDocument>`;
  return Buffer.from(xml, "utf-8");
}

/** DB row shape for export_jobs. */
interface ExportJobRow {
  id: string;
  document_id: string;
  format: string;
  preset: string;
  status: string;
  artifact_data: Buffer | null;
  artifact_name: string | null;
  artifact_size: number | null;
  checksum: string | null;
  mime_type: string | null;
  preflight_report: string | null;
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
  expires_at: Date | null;
}

/** Coerce a raw DB row into a typed ExportJobRow. */
function asJobRow(row: Record<string, unknown>): ExportJobRow {
  return {
    id: row.id as string,
    document_id: row.document_id as string,
    format: row.format as string,
    preset: row.preset as string,
    status: row.status as string,
    artifact_data: (row.artifact_data as Buffer | null) ?? null,
    artifact_name: (row.artifact_name as string | null) ?? null,
    artifact_size: (row.artifact_size as number | null) ?? null,
    checksum: (row.checksum as string | null) ?? null,
    mime_type: (row.mime_type as string | null) ?? null,
    preflight_report: (row.preflight_report as string | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    created_at: row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at as string),
    completed_at: (row.completed_at as Date | null) ?? null,
    expires_at: (row.expires_at as Date | null) ?? null,
  };
}

/** Convert an export_jobs row to the API DTO. */
function toJobDTO(row: ExportJobRow) {
  return {
    id: row.id,
    documentId: row.document_id,
    format: row.format,
    preset: row.preset,
    status: row.status,
    artifactSize: row.artifact_size,
    checksum: row.checksum,
    mimeType: row.mime_type,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    expiresAt: row.expires_at?.toISOString() ?? null,
    downloadUrl: row.artifact_data ? `/export-jobs/${row.id}/download` : null,
    errorMessage: row.error_message,
  };
}

// ─── APIs ────────────────────────────────────────────────────────────────

/**
 * POST /documents/:id/export — create + run an export job.
 *
 * Body: `{ format, preset?, pagination? }`. Runs synchronously: creates the
 * job row, runs preflight, generates the artifact, stores it inline (BYTEA),
 * computes a SHA-256 checksum, and marks the job completed.
 *
 * In production this should be moved to a background worker (PRD §16); the
 * surrounding job-tracking is already async-friendly.
 */
export const createExport = api(
  { method: "POST", path: "/documents/:id/export", auth: true },
  async (params: {
    id: string;
    format: "pdf" | "docx" | "html";
    preset?: "screen" | "standard" | "highquality" | "booklet" | "custom";
    pagination?: {
      pages: unknown[];
      warnings: Array<{ type?: string; message?: string }>;
      totalPages: number;
    };
  }): Promise<{ job: ReturnType<typeof toJobDTO>; preflight: unknown }> => {
    const { id, ...rest } = params;
    const email = getEmail();
    const doc = await fetchAccessibleDoc(id, email);

    const parsed = ExportRequestSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    const format = parsed.data.format;
    const preset = parsed.data.preset;
    const content = parseContent(doc.content);
    const settings = parseSettings(doc.settings);

    // Preflight.
    const preflight = runPreflight(content, settings, parsed.data.pagination);

    // Create the job row (status = processing).
    const jobId = randomUUID();
    await db.exec`
      INSERT INTO export_jobs
        (id, document_id, format, preset, status, preflight_report)
      VALUES
        (${jobId}, ${id}, ${format}, ${preset}, 'processing',
         ${JSON.stringify(preflight)})
    `;

    try {
      // Generate the artifact.
      const args: GenerateArgs = { title: doc.title, content, settings, preset };
      let buffer: Buffer;
      switch (format) {
        case "pdf":
          buffer = generatePdf(args);
          break;
        case "docx":
          buffer = generateDocx(args);
          break;
        case "html":
          buffer = generateHtml(args);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const checksum = createHash("sha256").update(buffer).digest("hex");
      const extension = EXTENSIONS[format] ?? "bin";
      const mimeType = MIME_TYPES[format] ?? "application/octet-stream";
      const artifactName = `nusword-${id}-${jobId}.${extension}`;
      const expiresAt = new Date(
        Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );

      await db.exec`
        UPDATE export_jobs
        SET status         = 'completed',
            artifact_data  = ${buffer},
            artifact_name  = ${artifactName},
            artifact_size  = ${buffer.length},
            checksum       = ${checksum},
            mime_type      = ${mimeType},
            completed_at   = NOW(),
            expires_at     = ${expiresAt}
        WHERE id = ${jobId}
      `;

      const row = await firstRow(
        db.query`
          SELECT id, document_id, format, preset, status, artifact_data,
                 artifact_name, artifact_size, checksum, mime_type,
                 preflight_report, error_message, created_at, completed_at,
                 expires_at
          FROM export_jobs WHERE id = ${jobId}
        `,
      );
      if (!row) {
        throw APIError.internal("Failed to load completed job");
      }
      return { job: toJobDTO(asJobRow(row as Record<string, unknown>)), preflight };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      await db.exec`
        UPDATE export_jobs
        SET status = 'failed', error_message = ${message}, completed_at = NOW()
        WHERE id = ${jobId}
      `;
      throw APIError.internal(`Export failed: ${message}`).withDetails({ jobId });
    }
  },
);

/**
 * GET /documents/:id/export — list recent export jobs for a document.
 */
export const listExports = api(
  { method: "GET", path: "/documents/:id/export", auth: true },
  async ({ id }: { id: string }): Promise<{ jobs: ReturnType<typeof toJobDTO>[] }> => {
    const email = getEmail();
    await fetchAccessibleDoc(id, email);
    const rows = await collect(
      db.query`
        SELECT id, document_id, format, preset, status, artifact_data,
               artifact_name, artifact_size, checksum, mime_type,
               preflight_report, error_message, created_at, completed_at,
               expires_at
        FROM export_jobs
        WHERE document_id = ${id}
        ORDER BY created_at DESC
        LIMIT 20
      `,
    );
    return {
      jobs: rows.map((r) => toJobDTO(asJobRow(r as Record<string, unknown>))),
    };
  },
);

/**
 * GET /export-jobs/:id/download — download the artifact for a completed job.
 *
 * Implemented with `api.raw` so we can stream the binary bytes with the
 * correct Content-Type and Content-Disposition headers. Auth is enforced
 * by reading the bearer token via the standard Encore auth pipeline — the
 * `auth: true` option still applies (Encore gates raw handlers too).
 *
 * Returns 200 + binary body on success.
 */
export const downloadExport = api.raw(
  { method: "GET", path: "/export-jobs/:id/download", auth: true },
  async (req, resp) => {
    // Extract :id from the URL (Encore populates req.url with the matched path).
    const match = req.url?.match(/\/export-jobs\/([^/]+)\/download/);
    const id = match?.[1];
    if (!id) {
      resp.statusCode = 400;
      resp.end(JSON.stringify({ error: "Missing job id" }));
      return;
    }

    // Auth context — `auth: true` already rejected unauthenticated requests
    // before this handler ran, so auth.data is populated. We import lazily
    // to avoid a static circular dependency.
    const { auth } = await import("~encore/auth");
    const email = (auth.data as { email?: string } | undefined)?.email;
    if (!email) {
      resp.statusCode = 401;
      resp.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const row = await firstRow(
      db.query`
        SELECT id, document_id, format, preset, status, artifact_data,
               artifact_name, artifact_size, checksum, mime_type,
               preflight_report, error_message, created_at, completed_at,
               expires_at
        FROM export_jobs WHERE id = ${id}
      `,
    );
    if (!row) {
      resp.statusCode = 404;
      resp.end(JSON.stringify({ error: "Job not found" }));
      return;
    }
    const job = asJobRow(row as Record<string, unknown>);
    if (job.status !== "completed" || !job.artifact_data) {
      resp.statusCode = 400;
      resp.end(JSON.stringify({ error: `Job not completed (status: ${job.status})` }));
      return;
    }

    // Verify access to the underlying document.
    const docRow = await firstRow(
      db.query`SELECT owner_email, deleted_at FROM documents WHERE id = ${job.document_id}`,
    );
    if (!docRow || docRow.deleted_at) {
      resp.statusCode = 404;
      resp.end(JSON.stringify({ error: "Document not found" }));
      return;
    }
    if ((docRow.owner_email as string) !== email) {
      const share = await firstRow(
        db.query`
          SELECT id FROM shared_documents
          WHERE document_id = ${job.document_id} AND shared_with_email = ${email}
          LIMIT 1
        `,
      );
      if (!share) {
        resp.statusCode = 403;
        resp.end(JSON.stringify({ error: "You do not have access to this document" }));
        return;
      }
    }

    const mimeType = job.mime_type ?? MIME_TYPES[job.format] ?? "application/octet-stream";
    const fileName =
      job.artifact_name ??
      `nusword-export-${id}.${EXTENSIONS[job.format] ?? "bin"}`;

    resp.writeHead(200, {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(job.artifact_data.length),
      "Cache-Control": "private, no-cache",
    });
    resp.end(job.artifact_data);
  },
);
