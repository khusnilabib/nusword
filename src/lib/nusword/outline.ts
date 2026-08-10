/**
 * Extract heading entries from a Tiptap JSON document for the outline panel.
 * Returns a flat list of { id, level, text } in document order.
 *
 * Headings get a stable id derived from their text slug so the outline can
 * scroll to them via DOM querySelector([data-heading-id]).
 */
import type { JSONContent } from "@tiptap/react";

export interface OutlineEntry {
  id: string;
  level: 1 | 2 | 3;
  text: string;
}

function slugify(text: string): string {
  return (
    "h-" +
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40)
  );
}

export function extractOutline(doc: JSONContent | null): OutlineEntry[] {
  if (!doc || !doc.content) return [];
  const entries: OutlineEntry[] = [];
  for (const node of doc.content) {
    if (node.type === "heading" && node.attrs?.level) {
      const text = extractText(node);
      if (text.trim()) {
        const level = node.attrs.level as 1 | 2 | 3;
        entries.push({ id: slugify(text), level, text: text.trim() });
      }
    }
  }
  return entries;
}

/** Recursively extract plain text from a Tiptap node. */
export function extractText(node: JSONContent): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join("");
  return "";
}

/** Count total words across all text nodes in a Tiptap document. */
export function countWordsInDoc(doc: JSONContent | null): number {
  if (!doc) return 0;
  const text = extractText(doc).trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}
