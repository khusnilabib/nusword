/**
 * GET    /api/documents/[id]           — get a single document
 * PATCH  /api/documents/[id]           — update title / content / settings / wordGoal (autosave)
 * DELETE /api/documents/[id]           — soft-delete (move to trash)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseContent,
  parseSettings,
  stringifyContent,
  stringifySettings,
  toDocumentDto,
} from "@/lib/nusword/serialize";
import { getAuthEmailOrFallback } from "@/lib/supabase/server";
import { z } from "zod";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(), // Tiptap JSON — validated structurally on parse
  settings: z.any().optional(), // PageSettings JSON
  // Optional word count goal for the editor progress bar.
  // null/undefined clears the goal; a positive int sets it.
  wordGoal: z.number().int().min(1).max(10_000_000).nullish(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document: toDocumentDto(doc) });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db.document.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Ownership check: only the owner may mutate a document.
  if (existing.ownerEmail !== userEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: {
    title?: string;
    content?: string;
    settings?: string;
    wordGoal?: number | null;
  } = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.content !== undefined) {
    // Re-stringify to canonicalise.
    data.content = stringifyContent(parseContent(stringifyContent(parsed.data.content)));
  }
  if (parsed.data.settings !== undefined) {
    data.settings = stringifySettings(parseSettings(stringifySettings(parsed.data.settings)));
  }
  // Distinguish "field not provided" (undefined) from "explicitly cleared" (null).
  if (parsed.data.wordGoal !== undefined) {
    data.wordGoal = parsed.data.wordGoal ?? null;
  }

  const updated = await db.document.update({ where: { id }, data });
  return NextResponse.json({ document: toDocumentDto(updated) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const existing = await db.document.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Soft-delete: set deletedAt instead of removing the row (PRD §25).
  const updated = await db.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true, id: updated.id });
}
