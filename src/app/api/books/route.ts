/**
 * GET  /api/books        — list user's books (excluding soft-deleted)
 * POST /api/books        — create a new book
 *
 * Performance: the GET list uses `_count: { select: { chapters: true } }`
 * instead of `include: { chapters: true }` so Prisma returns just the chapter
 * count per book rather than fetching every chapter row.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  stringifyBookSettings,
  toBookDto,
} from "@/lib/nusword/book-serialize";
import { DEFAULT_BOOK_SETTINGS } from "@/types/book";
import { getAuthEmailOrFallback } from "@/lib/supabase/server";
import { z } from "zod";

const CreateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
});

export async function GET() {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only fetch the columns + chapter count needed by the dashboard list.
  // Avoids materialising every BookChapter row just to compute `.length`.
  const books = await db.book.findMany({
    where: { deletedAt: null, ownerEmail: userEmail },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      subtitle: true,
      author: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { chapters: true } },
    },
  });
  return NextResponse.json({
    books: books.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      author: b.author,
      chapterCount: b._count.chapters,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const userEmail = await getAuthEmailOrFallback();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const book = await db.book.create({
    data: {
      title: parsed.data.title ?? "Untitled Book",
      subtitle: parsed.data.subtitle ?? null,
      author: parsed.data.author ?? null,
      settings: stringifyBookSettings({ ...DEFAULT_BOOK_SETTINGS }),
      ownerEmail: userEmail,
    },
    include: { chapters: true },
  });

  return NextResponse.json({ book: toBookDto(book, book.chapters) }, { status: 201 });
}
