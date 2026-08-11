/**
 * GET    /api/books/[id]           — get a single book with chapter tree
 * PATCH  /api/books/[id]           — update title/subtitle/author/settings/frontMatter/backMatter
 * DELETE /api/books/[id]           — soft-delete a book
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseBookSettings,
  parseMatterEntries,
  stringifyBookSettings,
  stringifyMatterEntries,
  toBookDto,
} from "@/lib/nusword/book-serialize";
import { z } from "zod";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(200).nullable().optional(),
  author: z.string().max(200).nullable().optional(),
  settings: z.any().optional(),
  frontMatter: z.array(z.any()).optional(),
  backMatter: z.array(z.any()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const book = await db.book.findUnique({
    where: { id },
    include: { chapters: { orderBy: { sortOrder: "asc" } } },
  });
  if (!book || book.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ book: toBookDto(book, book.chapters) });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db.book.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: {
    title?: string;
    subtitle?: string | null;
    author?: string | null;
    settings?: string;
    frontMatter?: string;
    backMatter?: string;
  } = {};

  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.subtitle !== undefined) data.subtitle = parsed.data.subtitle;
  if (parsed.data.author !== undefined) data.author = parsed.data.author;
  if (parsed.data.settings !== undefined) {
    // Re-stringify to canonicalise.
    data.settings = stringifyBookSettings(
      parseBookSettings(stringifyBookSettings(parsed.data.settings)),
    );
  }
  if (parsed.data.frontMatter !== undefined) {
    data.frontMatter = stringifyMatterEntries(
      parseMatterEntries(stringifyMatterEntries(parsed.data.frontMatter)),
    );
  }
  if (parsed.data.backMatter !== undefined) {
    data.backMatter = stringifyMatterEntries(
      parseMatterEntries(stringifyMatterEntries(parsed.data.backMatter)),
    );
  }

  const updated = await db.book.update({
    where: { id },
    data,
    include: { chapters: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ book: toBookDto(updated, updated.chapters) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const existing = await db.book.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.book.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true, id });
}
