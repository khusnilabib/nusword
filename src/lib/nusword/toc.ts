/**
 * NUSWORD Table of Contents Generator (PRD §15: TOC).
 *
 * Generates a TOC from the book's chapter tree + heading structure.
 * Each TOC entry includes the chapter/heading title, level (for indentation),
 * and page number (resolved from the paginated book).
 */
import type { ChapterNode } from "@/types/book";
import type { JSONContent } from "@tiptap/react";
import { extractText } from "./outline";

export interface TocEntry {
  id: string;
  level: number;
  title: string;
  /** 1-based page number where this entry starts (null = unknown). */
  pageNumber: number | null;
  /** Whether this is a chapter (true) or a heading within a chapter (false). */
  isChapter: boolean;
}

/**
 * Build the table of contents from a chapter tree.
 * Each chapter with includeInToc=true becomes a level-1 entry.
 * Headings (H2, H3) within each chapter's content become sub-entries.
 *
 * @param chapters  The flattened chapter tree (with level + children).
 * @param chapterContents  Map of chapterId → Tiptap JSON content.
 * @param chapterPageMap   Map of chapterId → starting page number.
 * @returns TocEntry[] in reading order.
 */
export function generateToc(
  chapters: ChapterNode[],
  chapterContents: Map<string, JSONContent>,
  chapterPageMap: Map<string, number>,
): TocEntry[] {
  const entries: TocEntry[] = [];

  const walkChapter = (chapter: ChapterNode) => {
    if (chapter.includeInToc) {
      const pageNumber = chapterPageMap.get(chapter.id) ?? null;
      entries.push({
        id: chapter.id,
        level: chapter.level,
        title: chapter.title,
        pageNumber,
        isChapter: true,
      });
    }

    // Extract headings from the chapter's content.
    const content = chapterContents.get(chapter.id);
    if (content?.content) {
      let headingOffset = 0;
      for (const block of content.content) {
        if (block.type === "heading" && block.attrs?.level) {
          const level = block.attrs.level as number;
          const text = extractText(block);
          if (text.trim()) {
            const pageNumber = chapterPageMap.get(chapter.id);
            entries.push({
              id: `${chapter.id}-h${headingOffset}`,
              level: chapter.level + level - 1,
              title: text.trim(),
              pageNumber: pageNumber ? pageNumber + headingOffset : null,
              isChapter: false,
            });
            headingOffset++;
          }
        }
      }
    }

    // Recurse into children.
    for (const child of chapter.children) {
      walkChapter(child);
    }
  };

  for (const chapter of chapters) {
    walkChapter(chapter);
  }

  return entries;
}

/**
 * Render the TOC as Tiptap JSON (for insertion into a document).
 * Each entry is a paragraph with the title left-aligned and page number
 * right-aligned (using tab stops simulated with spacing).
 */
export function tocToTiptapJson(entries: TocEntry[]): JSONContent {
  const paragraphs: JSONContent[] = entries.map((entry) => {
    const indent = "  ".repeat(Math.max(0, entry.level - 1));
    const pageStr = entry.pageNumber !== null ? String(entry.pageNumber) : "";
    const text = `${indent}${entry.title}`;
    const dots = " ".repeat(Math.max(3, 60 - text.length - pageStr.length));
    return {
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: [
        { type: "text", text: `${text}${dots}${pageStr}` },
      ],
    };
  });

  return {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Table of Contents" }] },
      ...paragraphs,
    ],
  };
}
