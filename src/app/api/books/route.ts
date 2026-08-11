/**
 * GET  /api/books        — list user's books (excluding soft-deleted)
 * POST /api/books        — create a new book
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

  const books = await db.book.findMany({
    where: { deletedAt: null, ownerEmail: userEmail },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { chapters: true },
  });
  return NextResponse.json({
    books: books.map((b) => {
      const dto = toBookDto(b, b.chapters);
      return {
        id: dto.id,
        title: dto.title,
        subtitle: dto.subtitle,
        author: dto.author,
        chapterCount: dto.chapters.length,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
      };
    }),
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
