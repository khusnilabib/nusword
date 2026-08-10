/**
 * GET  /api/documents/[id]/versions   — list version snapshots (newest first)
 * POST /api/documents/[id]/versions   — create an immutable version snapshot
 * PUT  /api/documents/[id]/versions   — restore document to a specific version
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toDocumentDto, toVersionDto } from "@/lib/nusword/serialize";
import { z } from "zod";

const CreateVersionSchema = z.object({
  message: z.string().max(200).optional(),
});

const RestoreSchema = z.object({
  versionId: z.string(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const versions = await db.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { version: "desc" },
    take: 50,
  });
  return NextResponse.json({ versions: versions.map(toVersionDto) });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Compute next version number (sufficient for single-user Phase 2).
  const latest = await db.documentVersion.findFirst({
    where: { documentId: id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  // Snapshot the current document content + settings (immutable copy).
  const version = await db.documentVersion.create({
    data: {
      documentId: id,
      content: doc.content,
      settings: doc.settings,
      version: nextVersion,
      message: parsed.data.message ?? null,
    },
  });

  return NextResponse.json({ version: toVersionDto(version) }, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = RestoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const version = await db.documentVersion.findUnique({
    where: { id: parsed.data.versionId },
  });
  if (!version || version.documentId !== id) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Restore: copy version content + settings back into the live document.
  const updated = await db.document.update({
    where: { id },
    data: {
      content: version.content,
      settings: version.settings,
    },
  });

  return NextResponse.json({ document: toDocumentDto(updated) });
}
