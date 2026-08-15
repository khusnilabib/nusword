"use client";

/**
 * useKeyboardShortcuts — registers global keyboard shortcuts for the
 * NUSWORD /app route (PRD §10: "keyboard-first editing for common
 * commands").
 *
 * Shortcuts:
 *   Ctrl/Cmd+K         Open command palette
 *   Ctrl/Cmd+S         Save (flush autosave) — toast "Saved" shown by
 *                      EditorShell after the flush completes
 *   Ctrl/Cmd+P         Open export dialog
 *   Ctrl/Cmd+F         Toggle Find & Replace
 *   Ctrl/Cmd+Shift+P   Toggle preview mode
 *   Ctrl/Cmd+B/I/U     Bold / Italic / Underline — handled natively by
 *                      the Tiptap editor; we only preventDefault to stop
 *                      the browser's bookmark/italic/underline UI when
 *                      focus is inside the contenteditable editor
 *
 * Design constraints:
 *   - Only active while on the /app route (checked at event time, not at
 *     mount time, so client-side navigation in/out of /app is honored).
 *   - Does not interfere with native text input fields (INPUT, TEXTAREA,
 *     SELECT). The B/I/U formatting shortcuts are skipped entirely when
 *     focus is in such a field; meta shortcuts (K/S/P/F/Shift+P) are still
 *     active so the user can save / find / export while editing the title.
 *
 * Returns a manual cleanup function. React's useEffect also auto-cleans
 * on unmount, so callers usually don't need to invoke it themselves.
 */
import * as React from "react";
import { useNuswordStore } from "@/stores/nusword-store";

export function useKeyboardShortcuts(): () => void {
  const setCommandPaletteOpen = useNuswordStore((s) => s.setCommandPaletteOpen);
  const requestSave = useNuswordStore((s) => s.requestSave);
  const setExportDialogOpen = useNuswordStore((s) => s.setExportDialogOpen);
  const toggleFindReplace = useNuswordStore((s) => s.toggleFindReplace);
  const setEditorMode = useNuswordStore((s) => s.setEditorMode);
  const editorMode = useNuswordStore((s) => s.editorMode);

  // Keep the latest editorMode in a ref so the keydown handler doesn't
  // need to re-bind whenever it changes.
  const editorModeRef = React.useRef(editorMode);
  React.useEffect(() => {
    editorModeRef.current = editorMode;
  }, [editorMode]);

  // Stable cleanup ref so the returned manual-cleanup function is idempotent.
  const cleanupRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    const isMod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey;
    const isTextInput = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const isContentEditor = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      return el.isContentEditable;
    };
    const isAppRoute = () =>
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/app");

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isAppRoute()) return;
      if (!isMod(e)) return;
      if (e.altKey) return; // avoid colliding with OS-level alt combos

      const key = e.key.toLowerCase();
      const shift = e.shiftKey;

      // ---- Mod+K : open command palette -----------------------------
      // Works everywhere, including from inside text inputs — power users
      // expect to invoke the palette mid-typing.
      if (key === "k" && !shift) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // ---- Mod+S : save ---------------------------------------------
      // Allow from any context (including the title input) so users can
      // trigger an autosave flush while editing metadata.
      if (key === "s" && !shift) {
        e.preventDefault();
        requestSave();
        return;
      }

      // ---- Mod+P : export dialog ------------------------------------
      // (Distinct from Mod+Shift+P below — preview toggle.)
      if (key === "p" && !shift) {
        e.preventDefault();
        setExportDialogOpen(true);
        return;
      }

      // ---- Mod+Shift+P : toggle preview -----------------------------
      if (key === "p" && shift) {
        e.preventDefault();
        setEditorMode(editorModeRef.current === "edit" ? "preview" : "edit");
        return;
      }

      // ---- Mod+F : toggle Find & Replace ----------------------------
      if (key === "f" && !shift) {
        e.preventDefault();
        toggleFindReplace();
        return;
      }

      // ---- Mod+B / I / U : bold / italic / underline ----------------
      // Tiptap's own keymap applies the formatting on the editor element.
      // We only need to suppress the browser default (e.g. Firefox
      // bookmarks bar on Cmd+B). When focus is in a plain text input,
      // we leave the event untouched so the browser handles it natively.
      if (key === "b" || key === "i" || key === "u") {
        if (isContentEditor(e.target) && !isTextInput(e.target)) {
          e.preventDefault();
        }
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const cleanup = () => window.removeEventListener("keydown", onKeyDown);
    cleanupRef.current = cleanup;
    return cleanup;
  }, [
    setCommandPaletteOpen,
    requestSave,
    setExportDialogOpen,
    toggleFindReplace,
    setEditorMode,
  ]);

  // Manual cleanup hook (in addition to React's auto-cleanup on unmount).
  return React.useCallback(() => cleanupRef.current(), []);
}
