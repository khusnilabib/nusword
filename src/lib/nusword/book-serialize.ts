/**
 * Book serialization helpers — convert Prisma rows to the NUSWORD book DTO.
 */
import type { Book, BookChapter } from "@prisma/client";
import type {
  NuswordBook,
  BookSettings,
  BookMatterEntry,
  ChapterNode,
} from "@/types/book";
import { DEFAULT_BOOK_SETTINGS } from "@/types/book";

/** Parse BookSettings JSON (merges defaults for forward-compat). */
export function parseBookSettings(raw: string | null | undefined): BookSettings {
  if (!raw) return { ...DEFAULT_BOOK_SETTINGS };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        ...DEFAULT_BOOK_SETTINGS,
        ...parsed,
        pageSettings: {
          ...DEFAULT_BOOK_SETTINGS.pageSettings,
          ...(parsed.pageSettings || {}),
        },
        runningHeader: {
          ...DEFAULT_BOOK_SETTINGS.runningHeader,
          ...(parsed.runningHeader || {}),
        },
        runningFooter: {
          ...DEFAULT_BOOK_SETTINGS.runningFooter,
          ...(parsed.runningFooter || {}),
        },
        booklet: {
          ...DEFAULT_BOOK_SETTINGS.booklet,
          ...(parsed.booklet || {}),
        },
      };
    }
  } catch {
    /* fall through to default */
  }
  return { ...DEFAULT_BOOK_SETTINGS };
}

/** Parse front/back matter JSON arrays. */
export function parseMatterEntries(raw: string | null | undefined): BookMatterEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as BookMatterEntry[];
  } catch {
    /* fall through */
  }
  return [];
}

/** Stringify book settings for DB storage. */
export function stringifyBookSettings(settings: BookSettings): string {
  return JSON.stringify(settings);
}

/** Stringify matter entries for DB storage. */
export function stringifyMatterEntries(entries: BookMatterEntry[]): string {
  return JSON.stringify(entries);
}

/** Build a chapter tree from flat Prisma rows (nested via parentId). */
export function buildChapterTree(
  chapters: BookChapter[],
  parentId: string | null = null,
  level: number = 1,
): ChapterNode[] {
  return chapters
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      id: c.id,
      documentId: c.documentId,
      title: c.title,
      sortOrder: c.sortOrder,
      parentId: c.parentId,
      startNewPage: c.startNewPage,
      includeInToc: c.includeInToc,
      level,
      children: buildChapterTree(chapters, c.id, level + 1),
    }));
}

/** Convert a Prisma Book + chapters to the API DTO. */
export function toBookDto(book: Book, chapters: BookChapter[]): NuswordBook {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    settings: parseBookSettings(book.settings),
    frontMatter: parseMatterEntries(book.frontMatter),
    backMatter: parseMatterEntries(book.backMatter),
    chapters: buildChapterTree(chapters),
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}
