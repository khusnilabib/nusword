/**
 * GET /api/export-jobs/[id]/download
 *
 * Downloads the artifact file for a completed export job.
 * Returns the file with appropriate Content-Type and Content-Disposition headers.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

const EXPORTS_DIR = path.join(process.cwd(), "exports");

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  html: "text/html",
  svg: "image/svg+xml",
  png: "image/png",
};

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const job = await db.exportJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "completed" || !job.artifactPath) {
    return NextResponse.json(
      { error: "Job not completed", status: job.status },
      { status: 400 },
    );
  }

  const filePath = path.join(EXPORTS_DIR, job.artifactPath);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Artifact file missing" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const mimeType = MIME_TYPES[job.format] || "application/octet-stream";
  const fileName = `nusword-${job.documentId}-${job.format}.${job.format}`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-cache",
    },
  });
}
