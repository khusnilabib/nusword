/**
 * PageBreak — a custom Tiptap block node for explicit page breaks.
 *
 * In the editor it renders as a visible divider labelled "Page Break".
 * The pagination engine treats this node as a hard page boundary.
 */
import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      /** Insert a page break at the current selection. */
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-break",
        class: "nusword-page-break",
        contenteditable: "false",
      }),
      ["span", { class: "nusword-page-break-label" }, "Page Break"],
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "pageBreak" }),
    };
  },
});
