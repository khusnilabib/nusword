"use client";

import { useNuswordStore } from "@/stores/nusword-store";
import { DashboardView } from "@/components/nusword/dashboard-view";
import { EditorView } from "@/components/nusword/editor-view";
import { BookView } from "@/components/nusword/book-view";

/**
 * NUSWORD — Phase 5 entry point.
 *
 * Three views: dashboard, editor (single document), book (multi-chapter).
 * Driven by the Zustand UI store.
 */
export default function Home() {
  const view = useNuswordStore((s) => s.view);

  if (view === "book") return <BookView />;
  if (view === "editor") return <EditorView />;
  return <DashboardView />;
}
