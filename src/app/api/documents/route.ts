/**
 * GET  /api/documents        — list documents (excluding soft-deleted)
 * POST /api/documents        — create a new document
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  stringifyContent,
  stringifySettings,
  toDocumentDto,
} from "@/lib/nusword/serialize";
import { DEFAULT_PAGE_SETTINGS } from "@/types/document";
import { z } from "zod";

const CreateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export async function GET() {
  const docs = await db.document.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ documents: docs.map(toDocumentDto) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };
  const doc = await db.document.create({
    data: {
      title: parsed.data.title ?? "Untitled",
      content: stringifyContent(emptyDoc),
      settings: stringifySettings({ ...DEFAULT_PAGE_SETTINGS }),
    },
  });
  return NextResponse.json({ document: toDocumentDto(doc) }, { status: 201 });
}
