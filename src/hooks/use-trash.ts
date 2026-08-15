"use client";

/**
 * NUSWORD trash hooks (TanStack Query).
 *
 * Server state for the trashcan UI — list, restore, and permanently delete
 * soft-deleted documents and books. Soft-deletes go through the regular
 * `/api/documents/[id]` and `/api/books/[id]` DELETE routes; these hooks only
 * handle the trashcan view itself.
 */
import * as React from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { NuswordDocument } from "@/types/document";
import type { BookSummary } from "./use-books";

/* ------------------------------------------------------------------ */
/* Fetch helpers                                                       */
/* ------------------------------------------------------------------ */

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TrashedDocument extends NuswordDocument {
  deletedAt: string | null;
}

export interface TrashedBook extends BookSummary {
  deletedAt: string | null;
}

type TrashAction = "restore" | "permanent-delete";

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export function useTrashedDocuments() {
  return useQuery({
    queryKey: ["documents", "trash"],
    queryFn: () =>
      fetchJson<{ documents: TrashedDocument[] }>(
        "/api/documents/trash",
      ).then((r) => r.documents),
  });
}

export function useRestoreDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/documents/trash`, {
        method: "PATCH",
        body: JSON.stringify({ id, action: "restore" as TrashAction }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", "trash"] });
      // The restored document should reappear in the main list.
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function usePermanentDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/documents/trash`, {
        method: "PATCH",
        body: JSON.stringify({
          id,
          action: "permanent-delete" as TrashAction,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", "trash"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Books                                                               */
/* ------------------------------------------------------------------ */

export function useTrashedBooks() {
  return useQuery({
    queryKey: ["books", "trash"],
    queryFn: () =>
      fetchJson<{ books: TrashedBook[] }>(`/api/books/trash`).then(
        (r) => r.books,
      ),
  });
}

export function useRestoreBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/books/trash`, {
        method: "PATCH",
        body: JSON.stringify({ id, action: "restore" as TrashAction }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books", "trash"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function usePermanentDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/books/trash`, {
        method: "PATCH",
        body: JSON.stringify({
          id,
          action: "permanent-delete" as TrashAction,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books", "trash"] });
    },
  });
}
