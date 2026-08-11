"use client";

/**
 * NUSWORD book data hooks (TanStack Query).
 * Server state for books, chapters, and TOC generation.
 */
import * as React from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  NuswordBook,
  ChapterNode,
  BookSettings,
  BookMatterEntry,
} from "@/types/book";
import type { JSONContent } from "@tiptap/react";

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

/** Book list summary (for dashboard). */
export interface BookSummary {
  id: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  chapterCount: number;
  createdAt: string;
  updatedAt: string;
}

export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    queryFn: () =>
      fetchJson<{ books: BookSummary[] }>("/api/books").then((r) => r.books),
  });
}

export function useBook(id: string | null) {
  return useQuery({
    queryKey: ["book", id],
    enabled: !!id,
    queryFn: () =>
      fetchJson<{ book: NuswordBook }>(`/api/books/${id}`).then((r) => r.book),
  });
}

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string; author?: string }) =>
      fetchJson<{ book: NuswordBook }>("/api/books", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.book),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/books/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export interface UpdateBookInput {
  title?: string;
  subtitle?: string | null;
  author?: string | null;
  settings?: BookSettings;
  frontMatter?: BookMatterEntry[];
  backMatter?: BookMatterEntry[];
}

export function useUpdateBook(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBookInput) =>
      fetchJson<{ book: NuswordBook }>(`/api/books/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((r) => r.book),
    onSuccess: (data) => {
      qc.setQueryData(["book", id], data);
      qc.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

/* --- Chapters --- */

export function useCreateChapter(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string; parentId?: string | null }) =>
      fetchJson<{ chapter: any }>(`/api/books/${bookId}/chapters`, {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.chapter),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book", bookId] });
    },
  });
}

export function useUpdateChapter(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      chapterId: string;
      title?: string;
      startNewPage?: boolean;
      includeInToc?: boolean;
    }) =>
      fetchJson(
        `/api/books/${bookId}/chapters/${input.chapterId}`,
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book", bookId] });
    },
  });
}

export function useDeleteChapter(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chapterId: string) =>
      fetchJson(`/api/books/${bookId}/chapters/${chapterId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book", bookId] });
    },
  });
}

export function useReorderChapters(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chapters: Array<{ id: string; sortOrder: number; parentId: string | null }>) =>
      fetchJson(`/api/books/${bookId}/chapters`, {
        method: "PUT",
        body: JSON.stringify(chapters),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book", bookId] });
    },
  });
}

/* --- TOC --- */

export interface TocEntry {
  id: string;
  level: number;
  title: string;
  pageNumber: number | null;
  isChapter: boolean;
}

export function useBookToc(bookId: string | null) {
  return useQuery({
    queryKey: ["book", bookId, "toc"],
    enabled: !!bookId,
    queryFn: () =>
      fetchJson<{ entries: TocEntry[]; tocJson: JSONContent }>(
        `/api/books/${bookId}/toc`,
      ),
  });
}
