"use client";

/**
 * NUSWORD Trash View.
 *
 * Lists soft-deleted documents and books. Each row has "Restore" and
 * "Delete Permanently" actions. The view is a simple list (not a grid) —
 * matches the spec from the task description.
 *
 * Data comes from the `/api/documents/trash` and `/api/books/trash` routes
 * via the use-trash hooks.
 */
import * as React from "react";
import { Icon } from "./icon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { absoluteDateTime, relativeTime } from "@/lib/nusword/time";
import {
  useTrashedDocuments,
  useRestoreDocument,
  usePermanentDeleteDocument,
  useTrashedBooks,
  useRestoreBook,
  usePermanentDeleteBook,
} from "@/hooks/use-trash";

export function TrashView() {
  const { data: docs = [], isLoading: docsLoading } = useTrashedDocuments();
  const { data: books = [], isLoading: booksLoading } = useTrashedBooks();

  const isEmpty =
    !docsLoading && !booksLoading && docs.length === 0 && books.length === 0;

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-display-doc text-on-surface">Trash</h1>
        <p className="text-body-ui-md text-on-surface-variant">
          Restore deleted items or remove them permanently. Items left here
          count toward your storage quota.
        </p>
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="space-y-10">
          {/* Documents section */}
          <section>
            <h2 className="text-label-ui-sm mb-3 flex items-center gap-2 uppercase tracking-wider text-on-surface-variant">
              <Icon name="description" size={16} />
              Documents
              {docs.length > 0 && (
                <span className="text-outline">{docs.length}</span>
              )}
            </h2>
            {docsLoading ? (
              <TrashRowSkeleton />
            ) : docs.length === 0 ? (
              <p className="text-body-ui-md text-on-surface-variant">
                No deleted documents.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-outline-variant bg-surface">
                {docs.map((doc, i) => (
                  <DocumentTrashRow
                    key={doc.id}
                    id={doc.id}
                    title={doc.title || "Untitled"}
                    wordCount={doc.wordCount}
                    deletedAt={doc.deletedAt}
                    isLast={i === docs.length - 1}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Books section */}
          <section>
            <h2 className="text-label-ui-sm mb-3 flex items-center gap-2 uppercase tracking-wider text-on-surface-variant">
              <Icon name="menu_book" size={16} />
              Books
              {books.length > 0 && (
                <span className="text-outline">{books.length}</span>
              )}
            </h2>
            {booksLoading ? (
              <TrashRowSkeleton />
            ) : books.length === 0 ? (
              <p className="text-body-ui-md text-on-surface-variant">
                No deleted books.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-outline-variant bg-surface">
                {books.map((book, i) => (
                  <BookTrashRow
                    key={book.id}
                    id={book.id}
                    title={book.title}
                    chapterCount={book.chapterCount}
                    deletedAt={book.deletedAt}
                    isLast={i === books.length - 1}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row components                                                       */
/* ------------------------------------------------------------------ */

function TrashRow({
  icon,
  title,
  subtitle,
  deletedAt,
  isLast,
  onRestore,
  onPermanentDelete,
  restorePending,
  deletePending,
}: {
  icon: string;
  title: string;
  subtitle: string;
  deletedAt: string | null;
  isLast: boolean;
  onRestore: () => void;
  onPermanentDelete: () => void;
  restorePending: boolean;
  deletePending: boolean;
}) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-container-low",
        !isLast && "border-b border-outline-variant",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} size={20} />
      </div>

      <div className="min-w-[180px] flex-1">
        <p className="text-body-ui-md truncate font-medium text-on-surface">
          {title}
        </p>
        <p className="text-label-ui-sm text-on-surface-variant">{subtitle}</p>
      </div>

      <div className="text-label-ui-sm flex shrink-0 items-center gap-1 text-on-surface-variant">
        <Icon name="delete" size={14} />
        <span title={deletedAt ? absoluteDateTime(deletedAt) : ""}>
          {deletedAt ? `Deleted ${relativeTime(deletedAt)}` : "—"}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRestore}
          disabled={restorePending || deletePending}
          className="flex cursor-pointer items-center gap-1.5 rounded border border-outline-variant px-3 py-1.5 text-label-ui-sm text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-wait disabled:opacity-50"
        >
          <Icon
            name={restorePending ? "progress_activity" : "restore"}
            size={14}
          />
          Restore
        </button>
        <button
          type="button"
          onClick={onPermanentDelete}
          disabled={restorePending || deletePending}
          className="flex cursor-pointer items-center gap-1.5 rounded border border-error/40 px-3 py-1.5 text-label-ui-sm text-error transition-colors hover:bg-error-container/30 disabled:cursor-wait disabled:opacity-50"
        >
          <Icon
            name={deletePending ? "progress_activity" : "delete_forever"}
            size={14}
          />
          Delete Permanently
        </button>
      </div>
    </li>
  );
}

function TrashRowSkeleton() {
  return (
    <ul className="overflow-hidden rounded-lg border border-outline-variant bg-surface">
      {[0, 1].map((i) => (
        <li
          key={i}
          className={cn(
            "flex items-center gap-4 px-4 py-3",
            i === 0 && "border-b border-outline-variant",
          )}
        >
          <div className="size-9 animate-pulse rounded-full bg-surface-container" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-container" />
            <div className="h-2 w-1/4 animate-pulse rounded bg-surface-container" />
          </div>
          <div className="h-6 w-24 animate-pulse rounded bg-surface-container" />
        </li>
      ))}
    </ul>
  );
}

/** Document trash row — wires actions to the document trash mutations. */
function DocumentTrashRow({
  id,
  title,
  wordCount,
  deletedAt,
  isLast,
}: {
  id: string;
  title: string;
  wordCount: number;
  deletedAt: string | null;
  isLast: boolean;
}) {
  const restore = useRestoreDocument();
  const permanentDelete = usePermanentDeleteDocument();

  const handleRestore = () => {
    restore.mutate(id, {
      onSuccess: () => toast.success(`"${title}" restored`),
      onError: () => toast.error("Failed to restore document"),
    });
  };

  const handlePermanentDelete = () => {
    if (
      !window.confirm(`Permanently delete "${title}"? This cannot be undone.`)
    ) {
      return;
    }
    permanentDelete.mutate(id, {
      onSuccess: () => toast.success(`"${title}" permanently deleted`),
      onError: () => toast.error("Failed to delete document"),
    });
  };

  return (
    <TrashRow
      icon="description"
      title={title}
      subtitle={`${wordCount.toLocaleString("id-ID")} words`}
      deletedAt={deletedAt}
      isLast={isLast}
      onRestore={handleRestore}
      onPermanentDelete={handlePermanentDelete}
      restorePending={restore.isPending}
      deletePending={permanentDelete.isPending}
    />
  );
}

/** Book trash row — wires actions to the book trash mutations. */
function BookTrashRow({
  id,
  title,
  chapterCount,
  deletedAt,
  isLast,
}: {
  id: string;
  title: string;
  chapterCount: number;
  deletedAt: string | null;
  isLast: boolean;
}) {
  const restore = useRestoreBook();
  const permanentDelete = usePermanentDeleteBook();

  const handleRestore = () => {
    restore.mutate(id, {
      onSuccess: () => toast.success(`"${title}" restored`),
      onError: () => toast.error("Failed to restore book"),
    });
  };

  const handlePermanentDelete = () => {
    if (
      !window.confirm(
        `Permanently delete "${title}"? This will also remove its chapters. This cannot be undone.`,
      )
    ) {
      return;
    }
    permanentDelete.mutate(id, {
      onSuccess: () => toast.success(`"${title}" permanently deleted`),
      onError: () => toast.error("Failed to delete book"),
    });
  };

  return (
    <TrashRow
      icon="menu_book"
      title={title}
      subtitle={`${chapterCount} chapter${chapterCount === 1 ? "" : "s"}`}
      deletedAt={deletedAt}
      isLast={isLast}
      onRestore={handleRestore}
      onPermanentDelete={handlePermanentDelete}
      restorePending={restore.isPending}
      deletePending={permanentDelete.isPending}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-lowest/50 px-6 py-16 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name="delete_sweep" size={26} />
      </div>
      <p className="text-headline-ui-md text-on-surface">Trash is empty</p>
      <p className="text-body-ui-md mt-1 max-w-sm text-on-surface-variant">
        Documents and books you delete will land here for 30 days before being
        removed permanently.
      </p>
    </div>
  );
}
