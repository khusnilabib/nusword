"use client";

import { useNuswordStore } from "@/stores/nusword-store";
import { DashboardView } from "@/components/nusword/dashboard-view";
import { EditorView } from "@/components/nusword/editor-view";
import { BookView } from "@/components/nusword/book-view";
import { CommandPalette } from "@/components/nusword/command-palette";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

/**
 * NUSWORD Application — /app route.
 *
 * This is the actual editor application (dashboard, editor, book view).
 * Architecturally separated from the marketing site at /.
 *
 * Three views: dashboard, editor (single document), book (multi-chapter).
 * Driven by the Zustand UI store.
 *
 * The command palette (Ctrl/Cmd+K) and global keyboard shortcuts are
 * mounted here so they remain available across all three views.
 */
export default function AppPage() {
  const view = useNuswordStore((s) => s.view);

  // Register global keyboard shortcuts for the /app route. The hook
  // auto-cleans on unmount; the returned manual cleanup is unused here.
  useKeyboardShortcuts();

  return (
    <>
      {view === "book" ? (
        <BookView />
      ) : view === "editor" ? (
        <EditorView />
      ) : (
        <DashboardView />
      )}
      <CommandPalette />
    </>
  );
}
