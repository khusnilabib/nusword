/**
 * GET  /api/templates — list published templates (optionally filtered by ?category=)
 * POST /api/templates — create a new template
 *
 * Phase 7: template marketplace (PRD §7: Template Engine).
 * The list endpoint only returns published templates; the POST endpoint
 * creates an unpublished draft owned by the current user (no org yet).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const CURRENT_USER_EMAIL = "user@nusword.local";

const VALID_CATEGORIES = ["academic", "business", "creative", "religious", "personal"] as const;

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  type: z.enum(["document", "book"]).default("document"),
  category: z.enum(VALID_CATEGORIES).default("personal"),
  content: z.any(), // Tiptap JSON — stringified before storage
  settings: z.any(), // PageSettings / BookSettings JSON
  published: z.boolean().default(false),
});

/** Convert a Prisma Template row to the API DTO shape (no content/settings). */
function toTemplateDto(row: {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  published: boolean;
  useCount: number;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    category: row.category,
    published: row.published,
    useCount: row.useCount,
    organizationId: row.organizationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const where: { published: boolean; category?: string } = { published: true };
  if (category && (VALID_CATEGORIES as readonly string[]).includes(category)) {
    where.category = category;
  }

  const templates = await db.template.findMany({
    where,
    orderBy: { useCount: "desc" },
    take: 200,
  });

  return NextResponse.json({ templates: templates.map(toTemplateDto) });
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

  const contentStr =
    typeof parsed.data.content === "string"
      ? parsed.data.content
      : JSON.stringify(parsed.data.content ?? { type: "doc", content: [] });

  const settingsStr =
    typeof parsed.data.settings === "string"
      ? parsed.data.settings
      : JSON.stringify(parsed.data.settings ?? {});

  const template = await db.template.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      category: parsed.data.category,
      content: contentStr,
      settings: settingsStr,
      published: parsed.data.published,
    },
  });

  await db.usageEvent.create({
    data: {
      email: CURRENT_USER_EMAIL,
      type: "template.create",
      resourceId: template.id,
    },
  });

  return NextResponse.json({ template: toTemplateDto(template) }, { status: 201 });
}
