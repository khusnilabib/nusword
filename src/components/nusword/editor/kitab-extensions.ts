/**
 * NUSWORD Kitab Tiptap Extensions (PRD §15 — Kitab Engine).
 *
 * Custom Tiptap nodes for kitab-specific content:
 *  - Footnote: inline reference mark that links to a footnote at the page bottom
 *  - BilingualBlock: side-by-side Arabic + translation block
 *  - Ornament: decorative divider (diamond, star, arabesque, etc.)
 *  - Basmala: special ornament with the basmala phrase
 */
import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    kitab: {
      /** Insert a footnote at the current selection. */
      setFootnote: (content?: string) => ReturnType;
      /** Insert a bilingual block (Arabic + translation). */
      setBilingualBlock: (arabic?: string, translation?: string) => ReturnType;
      /** Insert an ornament divider. */
      setOrnament: (style?: string) => ReturnType;
      /** Insert a basmala ornament. */
      setBasmala: () => ReturnType;
    };
  }
}

/* ================================================================
   Footnote — inline mark that renders as a superscript number.
   The footnote text is stored as an attribute.
   ================================================================ */

export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      /** The footnote text content. */
      text: {
        default: "",
      },
      /** Footnote number (auto-assigned during render, stored for stability). */
      number: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "sup[data-footnote]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const num = node.attrs.number ?? "•";
    return [
      "sup",
      mergeAttributes(HTMLAttributes, {
        "data-footnote": "",
        "data-text": node.attrs.text,
        class: "nusword-footnote-ref",
        contenteditable: "false",
        title: node.attrs.text,
      }),
      String(num),
    ];
  },

  addCommands() {
    return {
      setFootnote:
        (text = "") =>
        ({ commands }) =>
          commands.insertContent({
            type: "footnote",
            attrs: { text },
          }),
    };
  },
});

/* ================================================================
   BilingualBlock — a block node with two columns: Arabic (RTL) and
   translation (LTR). Uses attributes for the text content (ProseMirror
   doesn't support multiple content holes in a single node).
   ================================================================ */

export const BilingualBlock = Node.create({
  name: "bilingualBlock",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      /** Arabic text (RTL). */
      arabic: {
        default: "",
      },
      /** Translation text (LTR). */
      translation: {
        default: "",
      },
      /** Layout mode: "side-by-side" | "stacked" | "interlinear". */
      layout: {
        default: "side-by-side",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-bilingual]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-bilingual": "",
        "data-layout": node.attrs.layout,
        class: "nusword-bilingual-block",
      }),
      ["div", { class: "nusword-bilingual-arabic", dir: "rtl" }, node.attrs.arabic || ""],
      ["div", { class: "nusword-bilingual-translation", dir: "ltr" }, node.attrs.translation || ""],
    ];
  },

  addCommands() {
    return {
      setBilingualBlock:
        (arabic = "", translation = "") =>
        ({ commands }) =>
          commands.insertContent({
            type: "bilingualBlock",
            attrs: { arabic, translation, layout: "side-by-side" },
          }),
    };
  },
});

/* ================================================================
   Ornament — a decorative divider block.
   Styles: diamond, star, arabesque, line-double, line-ornate.
   ================================================================ */

export const Ornament = Node.create({
  name: "ornament",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      /** Ornament style: "diamond" | "star" | "arabesque" | "line-double" | "line-ornate". */
      style: {
        default: "diamond",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-ornament]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = node.attrs.style || "diamond";
    const symbols: Record<string, string> = {
      diamond: "◆ ◆ ◆",
      star: "✦ ✦ ✦",
      arabesque: "﷽",
      "line-double": "═══════════",
      "line-ornate": "─── ✦ ───",
    };
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-ornament": style,
        class: `nusword-ornament nusword-ornament-${style}`,
        contenteditable: "false",
      }),
      ["span", { class: "nusword-ornament-symbol" }, symbols[style] || symbols.diamond],
    ];
  },

  addCommands() {
    return {
      setOrnament:
        (style = "diamond") =>
        ({ commands }) =>
          commands.insertContent({
            type: "ornament",
            attrs: { style },
          }),
      setBasmala:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: "ornament",
            attrs: { style: "basmala" },
          }),
    };
  },
});

/* ================================================================
   Basmala — special ornament block that renders the basmala phrase
   in decorative Arabic calligraphy style.
   ================================================================ */

export const Basmala = Node.create({
  name: "basmala",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,

  parseHTML() {
    return [{ tag: "div[data-basmala]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-basmala": "",
        class: "nusword-basmala",
        contenteditable: "false",
        dir: "rtl",
      }),
      "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    ];
  },

  addCommands() {
    return {
      setBasmala:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "basmala" }),
    };
  },
});
