"use client";

/**
 * useAutosave — debounced autosave for the document editor (PRD §10).
 *
 * Watches a mutable "draft" (title + content + settings) and flushes to the
 * server after `delayMs` of inactivity. Exposes a `saveState` for the top nav
 * ("saving" | "saved" | "error") and an immediate `flush` for manual save.
 *
 * The hook is designed so that rapid typing only triggers one network request
 * once the user pauses.
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
  delayMs = 1500,
}: UseAutosaveArgs) {
  const updateMutation = useUpdateDocument(documentId ?? "");
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushedRef = React.useRef<string>("");
  const flushRef = React.useRef<() => Promise<void>>(async () => {});

  // Build a canonical signature of the current draft so we can detect changes.
  const draftSignature = React.useMemo(() => {
    if (!ready || !content || !settings) return "";
    return JSON.stringify({ title, content, settings });
  }, [ready, title, content, settings]);

  // Keep the latest flush function in a ref so the scheduling effect and
  // beforeunload handler can always call the current version without
  // re-subscribing.
  const flush = React.useCallback(async () => {
    if (!documentId || !content || !settings) return;
    if (lastFlushedRef.current === draftSignature) return;

    setSaveState("saving");
    try {
      await updateMutation.mutateAsync({ title, content, settings });
      lastFlushedRef.current = draftSignature;
      setSaveState("saved");
      setTimeout(() => {
        setSaveState((s) => (s === "saved" ? "idle" : s));
      }, 2000);
    } catch {
      setSaveState("error");
    }
  }, [
    documentId,
    title,
    content,
    settings,
    draftSignature,
    updateMutation,
  ]);

  React.useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Schedule a flush whenever the draft changes.
  React.useEffect(() => {
    if (!documentId || !ready) return;
    if (draftSignature === lastFlushedRef.current) return;
    if (draftSignature === "") return;

    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flushRef.current();
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draftSignature, documentId, ready, delayMs]);

  // Flush on page hide.
  React.useEffect(() => {
    const handler = () => void flushRef.current();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return { saveState, flush, isSaving: saveState === "saving" };
}
