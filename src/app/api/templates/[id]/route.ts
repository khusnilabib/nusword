/**
 * GET    /api/templates/[id] — get a single template (content + settings parsed from JSON)
 * PATCH  /api/templates/[id] — update template fields
 * DELETE /api/templates/[id] — delete template
 *
 * Phase 7: template marketplace (PRD §7: Template Engine).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  published: z.boolean().optional(),
  content: z.any().optional(),
  settings: z.any().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Safe JSON parse with fallback. */
function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const template = await db.template.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    template: {
      id: template.id,
      title: template.title,
      description: template.description,
      type: template.type,
      category: template.category,
      published: template.published,
      useCount: template.useCount,
      organizationId: template.organizationId,
      content: parseJson(template.content, { type: "doc", content: [] }),
      settings: parseJson(template.settings, {}),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const existing = await db.template.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data: {
    title?: string;
    description?: string | null;
    published?: boolean;
    content?: string;
    settings?: string;
  } = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.published !== undefined) data.published = parsed.data.published;
  if (parsed.data.content !== undefined) {
    data.content =
      typeof parsed.data.content === "string"
        ? parsed.data.content
        : JSON.stringify(parsed.data.content);
  }
  if (parsed.data.settings !== undefined) {
    data.settings =
      typeof parsed.data.settings === "string"
        ? parsed.data.settings
        : JSON.stringify(parsed.data.settings);
  }

  const updated = await db.template.update({ where: { id }, data });

  return NextResponse.json({
    template: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      type: updated.type,
      category: updated.category,
      published: updated.published,
      useCount: updated.useCount,
      organizationId: updated.organizationId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const existing = await db.template.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.template.delete({ where: { id } });
  return NextResponse.json({ ok: true, id });
}
