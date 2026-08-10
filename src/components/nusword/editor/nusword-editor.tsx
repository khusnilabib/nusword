"use client";

/**
 * NuswordEditor — the Tiptap/ProseMirror rich-text editor (PRD §8, §10).
 *
 * This is the content authoring surface. It emits structured JSON (not HTML)
 * on every change so the parent can autosave the canonical document model.
 *
 * Includes a formatting toolbar (bold/italic/underline/strike, headings,
 * lists, alignment, link, image, table, undo/redo) and exposes the editor
 * instance via a ref for external commands (find/replace, outline).
 */
import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import type { JSONContent } from "@tiptap/react";
import { PageBreak } from "./page-break";
import { Icon } from "../icon";
import { cn } from "@/lib/utils";

export interface NuswordEditorHandle {
  editor: Editor | null;
}

interface NuswordEditorProps {
  /** Initial Tiptap JSON content. Only used on mount. */
  initialContent: JSONContent;
  /** Called on every content change with the new JSON. */
  onChange?: (json: JSONContent) => void;
  /** Called once the editor instance is ready (mounted). */
  onReady?: (editor: Editor | null) => void;
  /** Placeholder text for empty documents. */
  placeholder?: string;
  /** Whether the editor is editable. */
  editable?: boolean;
  /** Font size in pt for body text (applied via inline style on the editor). */
  fontSizePt?: number;
  /** Line height multiplier. */
  lineHeight?: number;
  /** Language direction. */
  dir?: "ltr" | "rtl";
  /** Ref to access the editor instance externally. */
  editorRef?: React.RefObject<NuswordEditorHandle | null>;
}

export function NuswordEditor({
  initialContent,
  onChange,
  onReady,
  placeholder = "Start writing your document…",
  editable = true,
  fontSizePt = 18,
  lineHeight = 1.6,
  dir = "ltr",
  editorRef,
}: NuswordEditorProps) {
  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      // StarterKit v3 includes Link + Underline by default — disable them
      // here so we can register our own configured versions below.
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "nusword-codeblock" } },
        link: false,
        underline: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: dir === "rtl" ? "right" : "left",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder, showOnlyWhenEditable: true }),
      Typography,
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
      Table.configure({ resizable: true, lastColumnResizable: true }),
      TableRow,
      TableHeader,
      TableCell.configure({ width: "auto" }),
      PageBreak,
    ],
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        class: "nusword-prose",
        style: `font-size:${fontSizePt}pt;line-height:${lineHeight};`,
        dir,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  // Expose editor instance via ref + onReady callback.
  React.useEffect(() => {
    if (editorRef) {
      editorRef.current = { editor };
    }
    onReady?.(editor);
    return () => {
      if (editorRef) {
        editorRef.current = { editor: null };
      }
      onReady?.(null);
    };
  }, [editor, editorRef, onReady]);

  // Update editable / dir when props change.
  React.useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  React.useEffect(() => {
    if (editor) editor.setOptions({ editorProps: { attributes: { dir } } });
  }, [editor, dir]);

  return (
    <div className="nusword-editor-root">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

/* ================================================================
   Formatting Toolbar
   ================================================================ */

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [linkUrl, setLinkUrl] = React.useState("");
  const [showLinkInput, setShowLinkInput] = React.useState(false);

  if (!editor) return null;

  const setLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b border-outline-variant bg-surface px-2 py-1">
      {/* Undo / Redo */}
      <TbBtn
        label="Undo"
        icon="undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <TbBtn
        label="Redo"
        icon="redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />
      <TbDivider />

      {/* Headings */}
      <TbBtn
        label="Paragraph"
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
        text="¶"
      />
      <TbBtn
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        text="H1"
      />
      <TbBtn
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        text="H2"
      />
      <TbBtn
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        text="H3"
      />
      <TbDivider />

      {/* Inline formatting */}
      <TbBtn
        label="Bold"
        icon="format_bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <TbBtn
        label="Italic"
        icon="format_italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <TbBtn
        label="Underline"
        icon="format_underlined"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <TbBtn
        label="Strikethrough"
        icon="format_strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <TbBtn
        label="Highlight"
        icon="highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      />
      <TbBtn
        label="Inline code"
        icon="code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <TbDivider />

      {/* Lists */}
      <TbBtn
        label="Bullet list"
        icon="format_list_bulleted"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <TbBtn
        label="Numbered list"
        icon="format_list_numbered"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <TbBtn
        label="Quote"
        icon="format_quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <TbBtn
        label="Code block"
        icon="data_object"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <TbDivider />

      {/* Alignment */}
      <TbBtn
        label="Align left"
        icon="format_align_left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      />
      <TbBtn
        label="Align center"
        icon="format_align_center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      />
      <TbBtn
        label="Align right"
        icon="format_align_right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      />
      <TbBtn
        label="Align justify"
        icon="format_align_justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      />
      <TbDivider />

      {/* Link */}
      {showLinkInput ? (
        <div className="flex items-center gap-1">
          <input
            type="url"
            autoFocus
            placeholder="https://…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setLink();
              } else if (e.key === "Escape") {
                setShowLinkInput(false);
                setLinkUrl("");
              }
            }}
            className="h-7 w-40 border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
          />
          <TbBtn label="Apply link" icon="check" onClick={setLink} />
        </div>
      ) : (
        <TbBtn
          label="Insert link"
          icon="link"
          active={editor.isActive("link")}
          onClick={() => {
            const existing = editor.getAttributes("link").href;
            if (existing) setLinkUrl(existing);
            setShowLinkInput(true);
          }}
        />
      )}

      {/* Image */}
      <TbBtn label="Insert image" icon="image" onClick={addImage} />

      {/* Table */}
      <TbBtn
        label="Insert table"
        icon="table_chart"
        active={editor.isActive("table")}
        onClick={insertTable}
      />
      <TbDivider />

      {/* Horizontal rule */}
      <TbBtn
        label="Horizontal rule"
        icon="horizontal_rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
      {/* Page break */}
      <TbBtn
        label="Insert page break"
        icon="more_horiz"
        onClick={() => editor.chain().focus().setPageBreak().run()}
      />
    </div>
  );
}

function TbBtn({
  label,
  icon,
  text,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon?: string;
  text?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn("tb-btn", active && "is-active", disabled && "opacity-30")}
    >
      {icon ? <Icon name={icon} size={16} /> : <span className="text-xs font-semibold">{text}</span>}
    </button>
  );
}

function TbDivider() {
  return <div className="tb-divider" aria-hidden="true" />;
}
