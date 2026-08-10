"use client";

import { useNuswordStore } from "@/stores/nusword-store";
import { DashboardView } from "@/components/nusword/dashboard-view";
import { EditorView } from "@/components/nusword/editor-view";

/**
 * NUSWORD — Phase 1 (Foundation) entry point.
 *
 * The project constraint is that only the `/` route is user-visible, so the
 * dashboard and editor are rendered as two client-side views driven by the
 * Zustand UI store. No mock data — both views show empty states.
 */
export default function Home() {
  const view = useNuswordStore((s) => s.view);

  return view === "editor" ? <EditorView /> : <DashboardView />;
}
