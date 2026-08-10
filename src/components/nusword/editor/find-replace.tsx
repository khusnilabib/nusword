"use client";

/**
 * Find & Replace — a lightweight search panel for the Tiptap editor.
 *
 * Uses the editor's text content + DOM to highlight matches and step through
 * them. Replace/Replace-all operates on the underlying ProseMirror document
 * via transactions.
 */
import * as React from "react";
import type { Editor } from "@tiptap/react";
import { Icon } from "../icon";

interface FindReplaceProps {
  editor: Editor | null;
  onClose: () => void;
}

interface Match {
  pos: number;
  from: number;
  to: number;
  text: string;
}

export function FindReplace({ editor, onClose }: FindReplaceProps) {
  const [find, setFind] = React.useState("");
  const [replace, setReplace] = React.useState("");
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const [matchCase, setMatchCase] = React.useState(false);

  const runSearch = React.useCallback(
    (term: string, caseSensitive: boolean) => {
      if (!editor || !term) {
        setMatches([]);
        setActiveIdx(-1);
        clearHighlights(editor);
        return;
      }
      clearHighlights(editor);
      const results: Match[] = [];
      const doc = editor.state.doc;
      const needle = caseSensitive ? term : term.toLowerCase();

      doc.descendants((node, pos) => {
        if (!node.isText || !node.text) return;
        const hay = caseSensitive ? node.text : node.text.toLowerCase();
        let idx = hay.indexOf(needle);
        while (idx !== -1) {
          const from = pos + idx;
          const to = from + term.length;
          results.push({ pos, from, to, text: node.text.slice(idx, idx + term.length) });
          idx = hay.indexOf(needle, idx + needle.length);
        }
      });

      setMatches(results);
      setActiveIdx(results.length > 0 ? 0 : -1);
      if (results.length > 0) {
        highlightMatch(editor, results[0]);
      }
    },
    [editor],
  );

  const goToMatch = (idx: number) => {
    if (!editor || matches.length === 0) return;
    const clamped = ((idx % matches.length) + matches.length) % matches.length;
    setActiveIdx(clamped);
    highlightMatch(editor, matches[clamped]);
  };

  const replaceCurrent = () => {
    if (!editor || activeIdx < 0 || !matches[activeIdx]) return;
    const m = matches[activeIdx];
    editor
      .chain()
      .focus()
      .insertContentAt({ from: m.from, to: m.to }, replace)
      .run();
    // Re-search after replacement.
    setTimeout(() => runSearch(find, matchCase), 0);
  };

  const replaceAll = () => {
    if (!editor || matches.length === 0) return;
    // Replace from last to first so positions stay valid.
    const sorted = [...matches].sort((a, b) => b.from - a.from);
    editor.chain().focus().run();
    const tr = editor.state.tr;
    for (const m of sorted) {
      tr.insertText(replace, m.from, m.to);
    }
    editor.view.dispatch(tr);
    setTimeout(() => runSearch(find, matchCase), 0);
  };

  return (
    <div className="absolute right-4 top-4 z-30 w-80 rounded-lg border border-outline-variant bg-surface p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
          Find &amp; Replace
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close find & replace"
          className="flex size-6 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-low"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Find field */}
      <div className="relative mb-2">
        <input
          type="text"
          value={find}
          onChange={(e) => {
            setFind(e.target.value);
            runSearch(e.target.value, matchCase);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              goToMatch(activeIdx + 1);
            }
          }}
          placeholder="Find…"
          className="h-8 w-full border border-outline-variant bg-surface-container-lowest px-2 pr-8 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          title={matchCase ? "Match case: on" : "Match case: off"}
          onClick={() => {
            const next = !matchCase;
            setMatchCase(next);
            runSearch(find, next);
          }}
          className={cnFindToggle(matchCase)}
        >
          <Icon name="text_fields" size={14} />
        </button>
      </div>

      {/* Replace field */}
      <input
        type="text"
        value={replace}
        onChange={(e) => setReplace(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            replaceCurrent();
          }
        }}
        placeholder="Replace with…"
        className="mb-2 h-8 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <span className="text-label-ui-sm text-on-surface-variant">
          {matches.length > 0
            ? `${activeIdx + 1} of ${matches.length}`
            : find
              ? "No matches"
              : "—"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToMatch(activeIdx - 1)}
            disabled={matches.length === 0}
            aria-label="Previous match"
            className="flex size-7 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30"
          >
            <Icon name="keyboard_arrow_up" size={18} />
          </button>
          <button
            type="button"
            onClick={() => goToMatch(activeIdx + 1)}
            disabled={matches.length === 0}
            aria-label="Next match"
            className="flex size-7 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30"
          >
            <Icon name="keyboard_arrow_down" size={18} />
          </button>
          <div className="mx-1 h-4 w-px bg-outline-variant" />
          <button
            type="button"
            onClick={replaceCurrent}
            disabled={matches.length === 0}
            className="rounded border border-outline-variant px-2 py-1 text-label-ui-sm text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={replaceAll}
            disabled={matches.length === 0}
            className="rounded border border-outline-variant px-2 py-1 text-label-ui-sm text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30"
          >
            All
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- helpers --- */

function clearHighlights(editor: Editor) {
  // Remove any previously applied search-highlight marks.
  const { state, view } = editor;
  const tr = state.tr;
  state.doc.descendants((node, pos) => {
    if (node.marks.some((m) => m.type.name === "highlight")) {
      tr.removeMark(pos, pos + node.nodeSize, state.schema.marks.highlight);
    }
  });
  if (tr.docChanged) view.dispatch(tr.setMeta("addToHistory", false));
}

function highlightMatch(editor: Editor, match: Match) {
  editor
    .chain()
    .focus()
    .setTextSelection({ from: match.from, to: match.to })
    .run();
  // Scroll the match into view.
  const coords = editor.view.coordsAtPos(match.from);
  const editorEl = editor.view.dom.closest(".nusword-editor-root");
  if (editorEl) {
    const rect = editorEl.getBoundingClientRect();
    if (coords.top < rect.top || coords.bottom > rect.bottom) {
      editorEl.scrollBy({
        top: coords.top - rect.top - rect.height / 2,
        behavior: "smooth",
      });
    }
  }
}

function cnFindToggle(active: boolean): string {
  return [
    "absolute right-1 top-1/2 -translate-y-1/2",
    "flex size-6 items-center justify-center rounded",
    "text-body-ui-md transition-colors",
    active
      ? "bg-surface-container-high text-primary"
      : "text-on-surface-variant hover:bg-surface-container-low",
  ].join(" ");
}
