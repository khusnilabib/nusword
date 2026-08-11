"use client";

/**
 * NUSWORD document data hooks (TanStack Query).
 * Server state for the canonical document model — list, get, create, update
 * (autosave), delete, and version history.
 */
import * as React from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type {
  JSONContent,
  NuswordDocument,
  NuswordDocumentVersion,
  PageSettings,
} from "@/types/document";

/* ------------------------------------------------------------------ */
/* Fetch helpers (client-side, relative URLs only per gateway rules)  */
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
/* List                                                               */
/* ------------------------------------------------------------------ */

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: () =>
      fetchJson<{ documents: NuswordDocument[] }>("/api/documents").then(
        (r) => r.documents,
      ),
  });
}

/* ------------------------------------------------------------------ */
/* Single document                                                     */
/* ------------------------------------------------------------------ */

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: ["document", id],
    enabled: !!id,
    queryFn: () =>
      fetchJson<{ document: NuswordDocument }>(`/api/documents/${id}`).then(
        (r) => r.document,
      ),
  });
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string }) =>
      fetchJson<{ document: NuswordDocument }>("/api/documents", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.document),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Update (used by autosave)                                           */
/* ------------------------------------------------------------------ */

export interface UpdateDocumentInput {
  title?: string;
  content?: JSONContent;
  settings?: PageSettings;
}

export function useUpdateDocument(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDocumentInput) =>
      fetchJson<{ document: NuswordDocument }>(`/api/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((r) => r.document),
    onSuccess: (data) => {
      // Update the single-doc cache so the UI reflects the server's
      // canonical state without a refetch.
      qc.setQueryData(["document", id], data);
      // Mark the list as stale so the dashboard shows the new updatedAt.
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Delete (soft)                                                       */
/* ------------------------------------------------------------------ */

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ ok: boolean; id: string }>(`/api/documents/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Versions                                                            */
/* ------------------------------------------------------------------ */

export function useDocumentVersions(id: string | null) {
  return useQuery({
    queryKey: ["document", id, "versions"],
    enabled: !!id,
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchJson<{ versions: NuswordDocumentVersion[] }>(
        `/api/documents/${id}/versions`,
      ).then((r) => r.versions),
  });
}

export function useCreateVersion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { message?: string }) =>
      fetchJson<{ version: NuswordDocumentVersion }>(
        `/api/documents/${id}/versions`,
        { method: "POST", body: JSON.stringify(input) },
      ).then((r) => r.version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", id, "versions"] });
    },
  });
}

export function useRestoreVersion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      fetchJson<{ document: NuswordDocument }>(
        `/api/documents/${id}/versions`,
        { method: "PUT", body: JSON.stringify({ versionId }) },
      ).then((r) => r.document),
    onSuccess: (data) => {
      qc.setQueryData(["document", id], data);
    },
  });
}
