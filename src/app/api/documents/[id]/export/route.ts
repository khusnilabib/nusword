/**
 * POST /api/documents/[id]/export
 *
 * Creates an export job, runs preflight, generates the artifact, and returns
 * the job with a download URL. For Phase 4 (single-process), export runs
 * synchronously within the request. In production this would enqueue a
 * background worker (PRD §11, §16).
 *
 * Body: { format: "pdf"|"docx"|"html", preset: ExportPresetKey, pagination: PaginationResult }
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseContent, parseSettings, toDocumentDto } from "@/lib/nusword/serialize";
import { runPreflight } from "@/lib/nusword/preflight";
import { generatePdf } from "@/lib/nusword/export/pdf";
import { generateDocx } from "@/lib/nusword/export/docx";
import { generateHtml } from "@/lib/nusword/export/html";
import { EXPORT_PRESETS, type ExportFormat, type ExportPresetKey } from "@/lib/nusword/export/presets";
import type { PaginationResult } from "@/lib/nusword/pagination";
import { z } from "zod";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const EXPORTS_DIR = path.join(process.cwd(), "exports");

const RequestSchema = z.object({
  format: z.enum(["pdf", "docx", "html"]),
  preset: z.enum(["screen", "standard", "highquality", "booklet", "custom"]).default("standard"),
  pagination: z.object({
    pages: z.array(z.any()),
    warnings: z.array(z.any()),
    totalPages: z.number(),
  }),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const format = parsed.data.format as ExportFormat;
  const presetKey = parsed.data.preset as ExportPresetKey;
  const preset = EXPORT_PRESETS[presetKey];
  const pagination = parsed.data.pagination as PaginationResult;

  const content = parseContent(doc.content);
  const settings = parseSettings(doc.settings);

  // Run preflight
  const preflight = runPreflight(content, settings, pagination);

  // Create export job record
  const job = await db.exportJob.create({
    data: {
      documentId: id,
      format,
      preset: presetKey,
      status: "processing",
      preflightReport: JSON.stringify(preflight),
    },
  });

  try {
    // Ensure exports directory exists
    if (!fs.existsSync(EXPORTS_DIR)) {
      fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    }

    let buffer: Buffer;
    let extension: string;
    let mimeType: string;

    switch (format) {
      case "pdf":
        buffer = await generatePdf({
          title: doc.title,
          content,
          settings,
          pagination,
          preset,
        });
        extension = "pdf";
        mimeType = "application/pdf";
        break;
      case "docx":
        buffer = await generateDocx({
          title: doc.title,
          content,
          settings,
          preset,
        });
        extension = "docx";
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case "html":
        const htmlString = await generateHtml({
          title: doc.title,
          content,
          settings,
          pagination,
          preset,
        });
        buffer = Buffer.from(htmlString, "utf-8");
        extension = "html";
        mimeType = "text/html";
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Compute checksum
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Write artifact to disk
    const fileName = `${id}-${job.id}.${extension}`;
    const filePath = path.join(EXPORTS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    // Update job as completed
    const retentionDays = 7;
    const updated = await db.exportJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        artifactPath: fileName,
        artifactSize: buffer.length,
        checksum,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      job: {
        id: updated.id,
        format: updated.format,
        preset: updated.preset,
        status: updated.status,
        artifactSize: updated.artifactSize,
        checksum: updated.checksum,
        createdAt: updated.createdAt.toISOString(),
        completedAt: updated.completedAt?.toISOString() ?? null,
        downloadUrl: `/api/export-jobs/${updated.id}/download`,
        mimeType,
        extension,
      },
      preflight,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    await db.exportJob.update({
      where: { id: job.id },
      data: { status: "failed", errorMessage: message, completedAt: new Date() },
    });
    return NextResponse.json(
      { error: "Export failed", message, jobId: job.id },
      { status: 500 },
    );
  }
}

/** GET — list recent export jobs for this document. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const jobs = await db.exportJob.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      format: j.format,
      preset: j.preset,
      status: j.status,
      artifactSize: j.artifactSize,
      checksum: j.checksum,
      createdAt: j.createdAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
      downloadUrl: j.artifactPath ? `/api/export-jobs/${j.id}/download` : null,
      errorMessage: j.errorMessage,
    })),
  });
}
