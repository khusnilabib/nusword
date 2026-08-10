/**
 * POST /api/templates/[id]/use — create a new document from a template.
 *
 * Copies the template's content + settings into a new Document record,
 * increments the template's useCount, and logs a "template.use" usage event.
 *
 * The created document is returned using the same DTO shape as POST /api/documents
 * (i.e. `{ document: { id, title, content, settings, createdAt, updatedAt, wordCount } }`).
 *
 * Phase 7: template marketplace (PRD §7: Template Engine).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmailOrFallback } from "@/lib/supabase/server";
import {
  parseContent,
  parseSettings,
  stringifyContent,
  stringifySettings,
  toDocumentDto,
} from "@/lib/nusword/serialize";
import { z } from "zod";

const UseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Safe JSON parse with fallback (used to canonicalise template content/settings). */
function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const template = await db.template.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Parse the template's content + settings JSON strings before writing
  // them to the new Document row. parseContent + parseSettings apply the
  // canonical Tiptap shape and the DEFAULT_PAGE_SETTINGS merge respectively.
  const rawContent = parseJson(template.content, null);
  const rawSettings = parseJson(template.settings, null);
  const content = parseContent(rawContent === null ? null : JSON.stringify(rawContent));
  const settings = parseSettings(rawSettings === null ? null : JSON.stringify(rawSettings));

  const doc = await db.document.create({
    data: {
      title: parsed.data.title ?? template.title,
      content: stringifyContent(content),
      settings: stringifySettings(settings),
    },
  });

  // Increment template useCount.
  await db.template.update({
    where: { id },
    data: { useCount: { increment: 1 } },
  });

  await db.usageEvent.create({
    data: {
      email: userEmail,
      type: "template.use",
      resourceId: doc.id,
      metadata: JSON.stringify({ templateId: id, templateTitle: template.title }),
    },
  });

  return NextResponse.json({ document: toDocumentDto(doc) }, { status: 201 });
}
