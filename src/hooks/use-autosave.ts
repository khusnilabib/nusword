"use client";

/**
 * useAutosave — debounced autosave for the document editor (PRD §10).
 *
 * Watches a mutable "draft" (title + content + settings) and flushes to the
 * server after `delayMs` of inactivity. Exposes a `saveState` for the top nav
 * ("saving" | "saved" | "error") and an immediate `flush` for manual save.
 *
 * Bug fixes:
 *  1. Initial load no longer triggers "saving" — lastFlushedRef is set to the
 *     initial draftSignature when the document is first hydrated.
 *  2. No infinite loop from server canonicalization — after flush, we update
 *     lastFlushedRef to the CURRENT draftSignature (not the server response).
 *  3. "Saving" indicator only shows when the timer fires, not immediately.
 */
import * as React from "react";
import { useUpdateDocument } from "./use-documents";
import type { JSONContent, PageSettings, SaveState } from "@/types/document";

interface UseAutosaveArgs {
  documentId: string | null;
  title: string;
  content: JSONContent | null;
  settings: PageSettings | null;
  /** Whether the editor has been hydrated with initial content. */
  ready: boolean;
  delayMs?: number;
}

export function useAutosave({
  documentId,
  title,
  content,
  settings,
  ready,
  delayMs = 2000,
}: UseAutosaveArgs) {
  const updateMutation = useUpdateDocument(documentId ?? "");
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushedRef = React.useRef<string>("");
  const isFlushingRef = React.useRef(false);

  // Build a canonical signature of the current draft so we can detect changes.
  const draftSignature = React.useMemo(() => {
    if (!ready || !content || !settings) return "";
    return JSON.stringify({ title, content, settings });
  }, [ready, title, content, settings]);

  // When the document is first hydrated, mark the initial state as "flushed"
  // so the initial load doesn't trigger a save.
  React.useEffect(() => {
    if (ready && draftSignature && !lastFlushedRef.current) {
      lastFlushedRef.current = draftSignature;
    }
  }, [ready, draftSignature]);

  // The flush function — saves to server and updates lastFlushedRef.
  const flush = React.useCallback(async () => {
    if (!documentId || !content || !settings) return;
    if (isFlushingRef.current) return; // prevent concurrent flushes
    if (lastFlushedRef.current === draftSignature) return;

    isFlushingRef.current = true;
    setSaveState("saving");

    try {
      await updateMutation.mutateAsync({ title, content, settings });
      // Update lastFlushedRef to the current signature AFTER successful save.
      // This prevents re-triggering from server canonicalization.
      lastFlushedRef.current = draftSignature;
      setSaveState("saved");
      // Reset to idle after 2 seconds.
      setTimeout(() => {
        setSaveState((s) => (s === "saved" ? "idle" : s));
      }, 2000);
    } catch {
      setSaveState("error");
    } finally {
      isFlushingRef.current = false;
    }
  }, [
    documentId,
    title,
    content,
    settings,
    draftSignature,
    updateMutation,
  ]);

  // Schedule a flush whenever the draft changes — but DON'T set "saving"
  // immediately. Only show "saving" when the timer fires.
  React.useEffect(() => {
    if (!documentId || !ready) return;
    if (draftSignature === lastFlushedRef.current) return;
    if (draftSignature === "") return;

    // Don't set "saving" here — wait until the debounce timer fires.
    // Just show a subtle "editing" state.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draftSignature, documentId, ready, delayMs, flush]);

  // Flush on page hide.
  React.useEffect(() => {
    const handler = () => {
      if (draftSignature !== lastFlushedRef.current && draftSignature) {
        // Use sendBeacon for reliability during page unload.
        // Fallback to flush() for the JWT cookie approach.
        void flush();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [draftSignature, flush]);

  return { saveState, flush, isSaving: saveState === "saving" };
}
