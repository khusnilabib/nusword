"use client";

/**
 * NUSWORD Book Editor View (Phase 5 — Book Engine).
 *
 * Shows the book's chapter tree, front/back matter configuration, and book
 * settings. When a chapter is selected, its document content is loaded into
 * the Tiptap editor for editing.
 *
 * Layout:
 *  - Top nav: back + book title + export
 *  - Left sidebar: Chapters / Front Matter / Back Matter / Settings tabs
 *  - Center: chapter content editor or book settings panel
 *  - Right sidebar: book properties (binding, mirror margins, running headers)
 */
import * as React from "react";
import { Icon } from "./icon";
import { NuswordEditor, type NuswordEditorHandle } from "./editor/nusword-editor";
import { useNuswordStore } from "@/stores/nusword-store";
import {
  useBook,
  useUpdateBook,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useBookToc,
} from "@/hooks/use-books";
import { useDocument, useUpdateDocument } from "@/hooks/use-documents";
import { useAutosave } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BINDING_TYPES,
  FRONT_MATTER_TYPES,
  BACK_MATTER_TYPES,
  type BookSettings,
  type BookMatterEntry,
  type BindingType,
  type FrontMatterType,
  type BackMatterType,
  type ChapterNode,
} from "@/types/book";
import { ORNAMENT_STYLES, BILINGUAL_LAYOUTS, ARABIC_FONTS } from "@/types/kitab";
import { calculateBookletImposition } from "@/lib/nusword/imposition";
import type { JSONContent, PageSettings } from "@/types/document";

export function BookView() {
  const bookId = useNuswordStore((s) => s.activeBookId);
  const exitToDashboard = useNuswordStore((s) => s.exitToDashboard);

  if (!bookId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <button
          onClick={exitToDashboard}
          className="rounded border border-outline-variant px-4 py-2 text-body-ui-md text-primary hover:bg-surface-container-low"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return <BookShell bookId={bookId} onBack={exitToDashboard} />;
}

/* ================================================================ */

function BookShell({ bookId, onBack }: { bookId: string; onBack: () => void }) {
  const { data: book, isLoading, isError } = useBook(bookId);
  const [activeChapterId, setActiveChapterId] = React.useState<string | null>(null);
  const tab = useNuswordStore((s) => s.bookSidebarTab);
  const setTab = useNuswordStore((s) => s.setBookSidebarTab);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-surface-container-low">
        <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
        <p className="text-body-ui-md text-on-surface-variant">Loading book…</p>
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Icon name="error" size={32} className="text-error" />
        <p className="text-headline-ui-md text-on-surface">Couldn&apos;t load book</p>
        <button
          onClick={onBack}
          className="rounded border border-outline-variant px-4 py-2 text-body-ui-md text-primary hover:bg-surface-container-low"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-container-low text-on-surface">
      {/* Top Nav */}
      <nav className="z-50 flex h-toolbar-height w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile md:px-gutter">
        <div className="flex min-w-0 items-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to dashboard"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <Icon name="menu_book" size={22} className="shrink-0 text-primary" />
          <div className="flex min-w-0 flex-col">
            <span className="text-body-ui-md truncate text-base font-semibold text-on-surface md:text-lg">
              {book.title}
            </span>
            {book.author && (
              <span className="text-label-ui-sm truncate text-on-surface-variant">
                by {book.author}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-label-ui-sm hidden text-on-surface-variant sm:inline">
            {book.chapters.length} chapters
          </span>
          <button
            type="button"
            className="cursor-pointer rounded bg-primary px-3 py-1.5 text-body-ui-md text-on-primary transition-colors hover:bg-primary-container sm:px-4"
          >
            Export Book
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <BookSidebar
          bookId={bookId}
          chapters={book.chapters}
          activeChapterId={activeChapterId}
          onSelectChapter={setActiveChapterId}
          tab={tab}
          onTabChange={setTab}
        />

        {/* Center Content */}
        {tab === "chapters" ? (
          activeChapterId ? (
            <ChapterEditor
              bookId={bookId}
              chapterId={activeChapterId}
              chapters={book.chapters}
            />
          ) : (
            <ChapterPlaceholder chapters={book.chapters} />
          )
        ) : (
          <BookConfigPanel bookId={bookId} book={book} tab={tab} />
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Left Sidebar — Chapters / Front Matter / Back Matter / Settings
   ================================================================ */

function BookSidebar({
  bookId,
  chapters,
  activeChapterId,
  onSelectChapter,
  tab,
  onTabChange,
}: {
  bookId: string;
  chapters: ChapterNode[];
  activeChapterId: string | null;
  onSelectChapter: (id: string) => void;
  tab: string;
  onTabChange: (tab: any) => void;
}) {
  return (
    <aside className="z-40 flex w-sidebar-width shrink-0 flex-col border-r border-outline-variant bg-surface">
      <div className="border-b border-outline-variant p-4">
        <h2 className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
          Book Structure
        </h2>
      </div>

      <div className="flex border-b border-outline-variant">
        {([
          { key: "chapters", icon: "format_list_numbered", label: "Chapters" },
          { key: "front-matter", icon: "vertical_align_top", label: "Front" },
          { key: "back-matter", icon: "vertical_align_bottom", label: "Back" },
          { key: "settings", icon: "settings", label: "Settings" },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTabChange(t.key)}
            className={cn(
              "flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2 transition-all",
              tab === t.key
                ? "border-b-2 border-primary bg-surface-container-low text-primary"
                : "border-b-2 border-transparent text-on-surface-variant hover:text-primary",
            )}
          >
            <Icon name={t.icon} size={16} />
            <span className="text-label-ui-sm hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "chapters" && (
          <ChapterTree
            bookId={bookId}
            chapters={chapters}
            activeChapterId={activeChapterId}
            onSelectChapter={onSelectChapter}
          />
        )}
        {tab === "front-matter" && <MatterPanel bookId={bookId} matter="front" />}
        {tab === "back-matter" && <MatterPanel bookId={bookId} matter="back" />}
        {tab === "settings" && <BookSettingsSummary bookId={bookId} />}
      </div>
    </aside>
  );
}

/* ================================================================
   Chapter Tree
   ================================================================ */

function ChapterTree({
  bookId,
  chapters,
  activeChapterId,
  onSelectChapter,
}: {
  bookId: string;
  chapters: ChapterNode[];
  activeChapterId: string | null;
  onSelectChapter: (id: string) => void;
}) {
  const createChapter = useCreateChapter(bookId);

  const handleAddChapter = () => {
    createChapter.mutate(
      { title: `Chapter ${chapters.length + 1}` },
      {
        onSuccess: (chapter) => onSelectChapter(chapter.id),
        onError: () => toast.error("Failed to create chapter"),
      },
    );
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleAddChapter}
        disabled={createChapter.isPending}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-outline-variant py-2 text-body-ui-md text-primary transition-colors hover:bg-surface-container-low disabled:opacity-50"
      >
        <Icon name={createChapter.isPending ? "progress_activity" : "add"} size={16} />
        Add Chapter
      </button>

      {chapters.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Icon name="menu_book" size={28} className="text-outline-variant" />
          <p className="text-body-ui-md text-on-surface-variant">No chapters yet</p>
          <p className="text-label-ui-sm text-outline">
            Add your first chapter to start building the book.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {chapters.map((chapter, idx) => (
            <ChapterTreeItem
              key={chapter.id}
              bookId={bookId}
              chapter={chapter}
              index={idx}
              active={activeChapterId === chapter.id}
              onSelect={onSelectChapter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterTreeItem({
  bookId,
  chapter,
  index,
  active,
  onSelect,
}: {
  bookId: string;
  chapter: ChapterNode;
  index: number;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const deleteChapter = useDeleteChapter(bookId);
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded py-1.5 pr-2 transition-colors cursor-pointer",
          active ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:bg-surface-container-low",
        )}
        onClick={() => onSelect(chapter.id)}
      >
        <span className="text-mono-ui w-6 shrink-0 text-center text-outline">
          {index + 1}
        </span>
        <Icon name="description" size={16} className="shrink-0" />
        <span className="text-body-ui-md flex-1 truncate">{chapter.title}</span>
        {chapter.children.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex size-5 items-center justify-center rounded hover:bg-surface-container"
          >
            <Icon name={expanded ? "expand_more" : "chevron_right"} size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete chapter "${chapter.title}"?`)) {
              deleteChapter.mutate(chapter.id, {
                onSuccess: () => toast.success("Chapter deleted"),
                onError: () => toast.error("Failed to delete chapter"),
              });
            }
          }}
          className="flex size-5 items-center justify-center rounded text-on-surface-variant opacity-0 hover:bg-error-container/30 hover:text-error group-hover:opacity-100"
          aria-label="Delete chapter"
        >
          <Icon name="delete" size={14} />
        </button>
      </div>

      {expanded && chapter.children.length > 0 && (
        <div className="ml-6 border-l border-outline-variant pl-2">
          {chapter.children.map((child, idx) => (
            <ChapterTreeItem
              key={child.id}
              bookId={bookId}
              chapter={child}
              index={idx}
              active={active}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Chapter Editor — loads the chapter's document into Tiptap
   ================================================================ */

function ChapterEditor({
  bookId,
  chapterId,
  chapters,
}: {
  bookId: string;
  chapterId: string;
  chapters: ChapterNode[];
}) {
  // Find the chapter and its document.
  const findChapter = (nodes: ChapterNode[]): ChapterNode | null => {
    for (const n of nodes) {
      if (n.id === chapterId) return n;
      const found = findChapter(n.children);
      if (found) return found;
    }
    return null;
  };
  const chapter = findChapter(chapters);
  const documentId = chapter?.documentId;

  const { data: doc, isLoading } = useDocument(documentId);
  const updateChapter = useUpdateChapter(bookId);

  const [title, setTitle] = React.useState(chapter?.title ?? "");
  const [content, setContent] = React.useState<JSONContent | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const editorRef = React.useRef<NuswordEditorHandle | null>(null);

  React.useEffect(() => {
    if (doc) {
      setContent(doc.content);
      setHydrated(true);
    } else {
      setHydrated(false);
    }
  }, [doc]);

  React.useEffect(() => {
    setTitle(chapter?.title ?? "");
  }, [chapter?.title]);

  const updateMutation = useUpdateDocument(documentId ?? "");
  const { saveState } = useAutosave({
    documentId,
    title,
    content,
    settings: doc?.settings ?? null,
    ready: hydrated,
  });

  if (!chapter) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-body-ui-md text-on-surface-variant">Chapter not found</p>
      </div>
    );
  }

  if (isLoading || !doc || !content) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Icon name="progress_activity" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "Saved";

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-auto bg-surface-container-low px-4 py-10">
      {/* Chapter header */}
      <div className="mb-4 flex w-[210mm] max-w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
            Chapter
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title !== chapter.title) {
                updateChapter.mutate({ chapterId, title });
              }
            }}
            className="text-body-ui-md border-b border-transparent bg-transparent font-semibold text-on-surface focus:border-primary focus:outline-none"
          />
        </div>
        <span className={cn("text-label-ui-sm flex items-center gap-1", saveState === "error" ? "text-error" : "text-outline")}>
          <Icon name={saveState === "saving" ? "progress_activity" : "cloud_done"} size={14} />
          {saveLabel}
        </span>
      </div>

      {/* Paper + editor */}
      <article
        className="paper-shadow relative z-0 mx-auto mb-20 flex w-[210mm] max-w-full min-h-[297mm] origin-top flex-col bg-white p-[25.4mm]"
      >
        <NuswordEditor
          key={documentId}
          initialContent={content}
          onChange={setContent}
          editorRef={editorRef}
          fontSizePt={doc.settings.fontSizePt}
          lineHeight={doc.settings.lineHeight}
          dir={doc.settings.languageDirection}
        />
      </article>
    </main>
  );
}

function ChapterPlaceholder({ chapters }: { chapters: ChapterNode[] }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <Icon name="menu_book" size={48} className="text-outline-variant" />
      <p className="text-headline-ui-md text-on-surface">
        {chapters.length > 0 ? "Select a chapter" : "No chapters yet"}
      </p>
      <p className="text-body-ui-md text-on-surface-variant">
        {chapters.length > 0
          ? "Choose a chapter from the sidebar to start editing."
          : "Create your first chapter using the \"Add Chapter\" button."}
      </p>
    </div>
  );
}

/* ================================================================
   Front/Back Matter Panel
   ================================================================ */

function MatterPanel({ bookId, matter }: { bookId: string; matter: "front" | "back" }) {
  const { data: book } = useBook(bookId);
  const updateBook = useUpdateBook(bookId);
  const entries = matter === "front" ? book?.frontMatter ?? [] : book?.backMatter ?? [];
  const types = matter === "front" ? FRONT_MATTER_TYPES : BACK_MATTER_TYPES;

  if (!book) return null;

  const handleToggle = (entryId: string) => {
    const updated = entries.map((e) =>
      e.id === entryId ? { ...e, enabled: !e.enabled } : e,
    );
    updateBook.mutate(
      matter === "front" ? { frontMatter: updated } : { backMatter: updated },
    );
  };

  const handleAdd = (type: FrontMatterType | BackMatterType, label: string) => {
    const newEntry: BookMatterEntry = {
      id: crypto.randomUUID(),
      type,
      title: label,
      enabled: true,
    };
    const updated = [...entries, newEntry];
    updateBook.mutate(
      matter === "front" ? { frontMatter: updated } : { backMatter: updated },
    );
  };

  return (
    <div className="space-y-3">
      <div className="text-label-ui-sm text-on-surface-variant">
        {matter === "front" ? "Front Matter" : "Back Matter"}
      </div>

      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-2 rounded border px-2 py-1.5",
                entry.enabled
                  ? "border-outline-variant bg-surface-container-lowest"
                  : "border-outline-variant/50 bg-surface-container-low/50 opacity-60",
              )}
            >
              <Icon
                name={types.find((t) => t.type === entry.type)?.icon ?? "article"}
                size={16}
                className="text-on-surface-variant"
              />
              <span className="text-body-ui-md flex-1 truncate text-on-surface">
                {entry.title}
              </span>
              <button
                type="button"
                onClick={() => handleToggle(entry.id)}
                className={cn(
                  "flex size-6 cursor-pointer items-center justify-center rounded",
                  entry.enabled ? "text-primary" : "text-on-surface-variant",
                )}
              >
                <Icon name={entry.enabled ? "toggle_on" : "toggle_off"} size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new matter types */}
      <div className="border-t border-outline-variant pt-2">
        <div className="text-label-ui-sm mb-1.5 text-outline">Add section:</div>
        <div className="flex flex-wrap gap-1">
          {types.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => handleAdd(t.type, t.label)}
              className="flex cursor-pointer items-center gap-1 rounded border border-outline-variant px-2 py-1 text-label-ui-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Book Settings Summary (sidebar)
   ================================================================ */

function BookSettingsSummary({ bookId }: { bookId: string }) {
  const { data: book } = useBook(bookId);
  if (!book) return null;

  const s = book.settings;
  const binding = BINDING_TYPES.find((b) => b.type === s.binding);

  return (
    <div className="space-y-3 text-body-ui-md">
      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
        <div className="text-label-ui-sm text-on-surface-variant">Binding</div>
        <div className="mt-0.5 font-semibold text-on-surface">{binding?.label ?? s.binding}</div>
        <div className="text-label-ui-sm text-outline">{binding?.description}</div>
      </div>

      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
        <div className="text-label-ui-sm text-on-surface-variant">Trim Size</div>
        <div className="mt-0.5 font-semibold text-on-surface">{s.pageSettings.pageSize}</div>
      </div>

      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
        <div className="text-label-ui-sm text-on-surface-variant">Mirror Margins</div>
        <div className="mt-0.5 font-semibold text-on-surface">
          {s.mirrorMargins ? "Enabled" : "Disabled"}
        </div>
      </div>

      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
        <div className="text-label-ui-sm text-on-surface-variant">Running Headers</div>
        <div className="mt-0.5 font-semibold text-on-surface">
          {s.runningHeader.enabled ? `Source: ${s.runningHeader.source}` : "Disabled"}
        </div>
      </div>

      {s.binding === "saddle" && (
        <div className="rounded-lg border border-primary/30 bg-primary-fixed/20 p-3">
          <div className="text-label-ui-sm text-primary">Booklet Imposition</div>
          <div className="mt-0.5 text-body-ui-md text-on-surface">
            {s.booklet.sheetsPerSignature} sheets/signature
          </div>
          <div className="text-label-ui-sm text-on-surface-variant">
            = {s.booklet.sheetsPerSignature * 4} pages/signature
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Book Config Panel (center area for front/back/settings tabs)
   ================================================================ */

function BookConfigPanel({
  bookId,
  book,
  tab,
}: {
  bookId: string;
  book: any;
  tab: string;
}) {
  if (tab === "settings") {
    return <BookSettingsEditor bookId={bookId} book={book} />;
  }

  // Front/back matter config in the center area.
  const matter = tab === "front-matter" ? "front" : "back";
  const entries = matter === "front" ? book.frontMatter : book.backMatter;
  const types = matter === "front" ? FRONT_MATTER_TYPES : BACK_MATTER_TYPES;

  return (
    <main className="flex-1 overflow-y-auto bg-surface-container-low p-margin-mobile md:p-margin-desktop">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-headline-ui-lg text-on-surface">
            {matter === "front" ? "Front Matter" : "Back Matter"}
          </h1>
          <p className="text-body-ui-md text-on-surface-variant">
            Configure the {matter === "front" ? "opening" : "closing"} sections of your book.
            Toggle sections on/off and they will appear in the correct order during export.
          </p>
        </div>

        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-outline-variant p-8 text-center">
              <Icon name={matter === "front" ? "vertical_align_top" : "vertical_align_bottom"} size={32} className="text-outline-variant" />
              <p className="text-body-ui-md mt-2 text-on-surface-variant">
                No {matter} matter sections yet.
              </p>
              <p className="text-label-ui-sm text-outline">
                Add sections from the sidebar.
              </p>
            </div>
          ) : (
            entries.map((entry: BookMatterEntry, idx: number) => {
              const typeInfo = types.find((t) => t.type === entry.type);
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border p-4",
                    entry.enabled
                      ? "border-outline-variant bg-surface"
                      : "border-outline-variant/40 bg-surface-container-low/50 opacity-60",
                  )}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary">
                    <Icon name={typeInfo?.icon ?? "article"} size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-mono-ui text-outline">{idx + 1}.</span>
                      <h3 className="text-headline-ui-md text-on-surface">{entry.title}</h3>
                    </div>
                    <p className="text-label-ui-sm text-on-surface-variant">
                      {typeInfo?.label}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* TOC Preview */}
        <TocPreview bookId={bookId} />
      </div>
    </main>
  );
}

/* ================================================================
   Book Settings Editor (center area)
   ================================================================ */

function BookSettingsEditor({ bookId, book }: { bookId: string; book: any }) {
  const updateBook = useUpdateBook(bookId);
  const settings = book.settings as BookSettings;

  const update = (patch: Partial<BookSettings>) => {
    updateBook.mutate({ settings: { ...settings, ...patch } });
  };

  const updatePageSettings = (patch: Partial<PageSettings>) => {
    update({ pageSettings: { ...settings.pageSettings, ...patch } });
  };

  return (
    <main className="flex-1 overflow-y-auto bg-surface-container-low p-margin-mobile md:p-margin-desktop">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-headline-ui-lg text-on-surface">Book Settings</h1>
          <p className="text-body-ui-md text-on-surface-variant">
            Configure binding, page layout, and running headers for your book.
          </p>
        </div>

        {/* Book metadata */}
        <div className="space-y-3">
          <h2 className="text-headline-ui-md text-on-surface">Metadata</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Title</label>
              <input
                type="text"
                value={book.title}
                onChange={(e) => updateBook.mutate({ title: e.target.value })}
                className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Author</label>
              <input
                type="text"
                value={book.author ?? ""}
                onChange={(e) => updateBook.mutate({ author: e.target.value })}
                className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Binding */}
        <div className="space-y-3">
          <h2 className="text-headline-ui-md text-on-surface">Binding</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BINDING_TYPES.map((b) => (
              <button
                key={b.type}
                type="button"
                onClick={() => update({ binding: b.type as BindingType })}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                  settings.binding === b.type
                    ? "border-primary bg-surface-container-lowest"
                    : "border-outline-variant hover:bg-surface-container-low",
                )}
              >
                <Icon name={b.icon} size={24} className={settings.binding === b.type ? "text-primary" : "text-on-surface-variant"} />
                <div>
                  <div className="text-body-ui-md font-semibold text-on-surface">{b.label}</div>
                  <div className="text-label-ui-sm text-on-surface-variant">{b.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Page settings */}
        <div className="space-y-3">
          <h2 className="text-headline-ui-md text-on-surface">Page Layout</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Trim Size</label>
              <select
                value={settings.pageSettings.pageSize}
                onChange={(e) => updatePageSettings({ pageSize: e.target.value as any })}
                className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="A5">A5 (148 × 210 mm)</option>
                <option value="B5">B5 (176 × 250 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
                <option value="F4">F4 (210 × 330 mm)</option>
              </select>
            </div>
            <div>
              <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Font Size (pt)</label>
              <input
                type="number"
                value={settings.pageSettings.fontSizePt}
                onChange={(e) => updatePageSettings({ fontSizePt: parseFloat(e.target.value) || 12 })}
                className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {([
              { key: "marginTopMm", label: "Top" },
              { key: "marginBottomMm", label: "Bottom" },
              { key: "marginLeftMm", label: "Left" },
              { key: "marginRightMm", label: "Right" },
            ] as const).map((m) => (
              <div key={m.key}>
                <label className="text-label-ui-sm mb-1 block text-on-surface-variant">{m.label} (mm)</label>
                <input
                  type="number"
                  value={settings.pageSettings[m.key]}
                  onChange={(e) => updatePageSettings({ [m.key]: parseFloat(e.target.value) || 0 } as any)}
                  className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
                />
              </div>
            ))}
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded border border-outline-variant px-3 py-2">
            <span className="text-body-ui-md text-on-surface">Mirror Margins (facing pages)</span>
            <button
              type="button"
              onClick={() => update({ mirrorMargins: !settings.mirrorMargins })}
              className={cn(settings.mirrorMargins ? "text-primary" : "text-on-surface-variant")}
            >
              <Icon name={settings.mirrorMargins ? "toggle_on" : "toggle_off"} size={24} />
            </button>
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded border border-outline-variant px-3 py-2">
            <span className="text-body-ui-md text-on-surface">Chapters start on odd (right) page</span>
            <button
              type="button"
              onClick={() => update({ chaptersStartOnOddPage: !settings.chaptersStartOnOddPage })}
              className={cn(settings.chaptersStartOnOddPage ? "text-primary" : "text-on-surface-variant")}
            >
              <Icon name={settings.chaptersStartOnOddPage ? "toggle_on" : "toggle_off"} size={24} />
            </button>
          </label>
        </div>

        {/* Running Headers */}
        <div className="space-y-3">
          <h2 className="text-headline-ui-md text-on-surface">Running Headers</h2>
          <label className="flex cursor-pointer items-center justify-between rounded border border-outline-variant px-3 py-2">
            <span className="text-body-ui-md text-on-surface">Enable running headers</span>
            <button
              type="button"
              onClick={() => update({ runningHeader: { ...settings.runningHeader, enabled: !settings.runningHeader.enabled } })}
              className={cn(settings.runningHeader.enabled ? "text-primary" : "text-on-surface-variant")}
            >
              <Icon name={settings.runningHeader.enabled ? "toggle_on" : "toggle_off"} size={24} />
            </button>
          </label>
          {settings.runningHeader.enabled && (
            <div>
              <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Header source</label>
              <select
                value={settings.runningHeader.source}
                onChange={(e) => update({ runningHeader: { ...settings.runningHeader, source: e.target.value as any } })}
                className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="chapter">Chapter title</option>
                <option value="book">Book title</option>
                <option value="custom">Custom text</option>
              </select>
            </div>
          )}
        </div>

        {/* Booklet Imposition */}
        {settings.binding === "saddle" && (
          <div className="space-y-3">
            <h2 className="text-headline-ui-md text-on-surface">Booklet Imposition</h2>
            <div className="rounded-lg border border-primary/30 bg-primary-fixed/20 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Sheets per signature</label>
                  <input
                    type="number"
                    value={settings.booklet.sheetsPerSignature}
                    onChange={(e) => update({ booklet: { ...settings.booklet, sheetsPerSignature: parseInt(e.target.value) || 4 } })}
                    className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="text-label-ui-sm text-on-surface-variant">Pages per signature</div>
                  <div className="text-headline-ui-md text-primary">
                    {settings.booklet.sheetsPerSignature * 4}
                  </div>
                </div>
              </div>
              <p className="text-label-ui-sm mt-3 text-on-surface-variant">
                Saddle-stitch binding folds sheets in half and staples at the spine.
                Each sheet produces 4 pages (2 front, 2 back).
              </p>
            </div>
          </div>
        )}

        {/* Kitab Profile (Phase 6) */}
        <KitabProfileEditor settings={settings} onUpdate={update} />
      </div>
    </main>
  );
}

/* ================================================================
   Kitab Profile Editor (Phase 6)
   ================================================================ */

function KitabProfileEditor({
  settings,
  onUpdate,
}: {
  settings: BookSettings;
  onUpdate: (patch: Partial<BookSettings>) => void;
}) {
  const kitab = settings.kitab;

  const updateKitab = (patch: Partial<typeof kitab>) => {
    onUpdate({ kitab: { ...kitab, ...patch } });
  };

  const updateFootnotes = (patch: Partial<typeof kitab.footnotes>) => {
    updateKitab({ footnotes: { ...kitab.footnotes, ...patch } });
  };

  const updateTraditionalHeader = (patch: Partial<typeof kitab.traditionalHeader>) => {
    updateKitab({ traditionalHeader: { ...kitab.traditionalHeader, ...patch } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon name="auto_stories" size={24} className="text-primary" />
        <div>
          <h2 className="text-headline-ui-md text-on-surface">Kitab Profile</h2>
          <p className="text-body-ui-md text-on-surface-variant">
            Islamic/Arabic publishing: RTL, Arabic typography, bilingual blocks, footnotes, ornaments.
          </p>
        </div>
      </div>

      {/* Enable Kitab */}
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
        <div>
          <div className="text-body-ui-md font-semibold text-on-surface">Enable Kitab Mode</div>
          <div className="text-label-ui-sm text-on-surface-variant">
            Activates RTL, Arabic fonts, bilingual layout, footnotes, and ornaments.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const enabled = !kitab.enabled;
            // Combine kitab + pageSettings changes into a single update to
            // avoid race conditions between two separate mutations.
            const patch: Partial<BookSettings> = {
              kitab: { ...kitab, enabled },
            };
            if (enabled) {
              patch.pageSettings = {
                ...settings.pageSettings,
                languageDirection: "rtl",
                fontFamily: "Amiri",
                pageNumberFormat: "arabic-indic",
              };
            }
            onUpdate(patch);
          }}
          className={cn(kitab.enabled ? "text-primary" : "text-on-surface-variant")}
        >
          <Icon name={kitab.enabled ? "toggle_on" : "toggle_off"} size={32} />
        </button>
      </label>

      {kitab.enabled && (
        <div className="space-y-6 rounded-lg border border-primary/30 bg-primary-fixed/10 p-4">
          {/* Arabic Typography */}
          <div className="space-y-3">
            <h3 className="text-headline-ui-md text-on-surface flex items-center gap-2">
              <Icon name="text_fields" size={18} />
              Arabic Typography
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Arabic Font</label>
                <select
                  value={kitab.arabicFont}
                  onChange={(e) => updateKitab({ arabicFont: e.target.value })}
                  className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
                >
                  {ARABIC_FONTS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Arabic Font Size (pt)</label>
                <input
                  type="number"
                  value={kitab.arabicFontSizePt}
                  onChange={(e) => updateKitab({ arabicFontSizePt: parseFloat(e.target.value) || 16 })}
                  className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Arabic Line Height</label>
                <input
                  type="number"
                  step="0.1"
                  value={kitab.arabicLineHeight}
                  onChange={(e) => updateKitab({ arabicLineHeight: parseFloat(e.target.value) || 2.0 })}
                  className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Translation Font</label>
                <select
                  value={kitab.translationFont}
                  onChange={(e) => updateKitab({ translationFont: e.target.value })}
                  className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="Source Serif 4">Source Serif 4</option>
                  <option value="Hanken Grotesk">Hanken Grotesk</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bilingual Layout */}
          <div className="space-y-3">
            <h3 className="text-headline-ui-md text-on-surface flex items-center gap-2">
              <Icon name="view_column" size={18} />
              Bilingual Layout
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {BILINGUAL_LAYOUTS.map((layout) => (
                <button
                  key={layout.type}
                  type="button"
                  onClick={() => updateKitab({ bilingualLayout: layout.type })}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded border p-2 text-left transition-colors",
                    kitab.bilingualLayout === layout.type
                      ? "border-primary bg-surface-container-lowest"
                      : "border-outline-variant hover:bg-surface-container-low",
                  )}
                >
                  <Icon name={layout.icon} size={18} className={kitab.bilingualLayout === layout.type ? "text-primary" : "text-on-surface-variant"} />
                  <div>
                    <div className="text-body-ui-md font-medium text-on-surface">{layout.label}</div>
                    <div className="text-label-ui-sm text-on-surface-variant">{layout.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ornaments */}
          <div className="space-y-3">
            <h3 className="text-headline-ui-md text-on-surface flex items-center gap-2">
              <Icon name="auto_awesome" size={18} />
              Ornament Style
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {ORNAMENT_STYLES.map((orn) => (
                <button
                  key={orn.type}
                  type="button"
                  onClick={() => updateKitab({ ornamentStyle: orn.type })}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded border p-2 transition-colors",
                    kitab.ornamentStyle === orn.type
                      ? "border-primary bg-surface-container-lowest"
                      : "border-outline-variant hover:bg-surface-container-low",
                  )}
                >
                  {orn.preview && (
                    <span className="text-lg text-primary" style={{ fontFamily: "var(--font-amiri), serif" }}>
                      {orn.preview}
                    </span>
                  )}
                  <span className="text-label-ui-sm text-on-surface-variant">{orn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footnotes */}
          <div className="space-y-3">
            <h3 className="text-headline-ui-md text-on-surface flex items-center gap-2">
              <Icon name="superscript" size={18} />
              Footnotes
            </h3>
            <label className="flex cursor-pointer items-center justify-between rounded border border-outline-variant px-3 py-2">
              <span className="text-body-ui-md text-on-surface">Enable footnotes</span>
              <button
                type="button"
                onClick={() => updateFootnotes({ enabled: !kitab.footnotes.enabled })}
                className={cn(kitab.footnotes.enabled ? "text-primary" : "text-on-surface-variant")}
              >
                <Icon name={kitab.footnotes.enabled ? "toggle_on" : "toggle_off"} size={24} />
              </button>
            </label>
            {kitab.footnotes.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Numbering</label>
                  <select
                    value={kitab.footnotes.numbering}
                    onChange={(e) => updateFootnotes({ numbering: e.target.value as any })}
                    className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="arabic-indic">Arabic-Indic (٠١٢٣)</option>
                    <option value="decimal">Decimal (1234)</option>
                    <option value="per-page">Per page (reset each page)</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Position</label>
                  <select
                    value={kitab.footnotes.position}
                    onChange={(e) => updateFootnotes({ position: e.target.value as any })}
                    className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="bottom">Bottom of page</option>
                    <option value="margin">Margin (side notes)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Traditional Header */}
          <div className="space-y-3">
            <h3 className="text-headline-ui-md text-on-surface flex items-center gap-2">
              <Icon name="border_color" size={18} />
              Traditional Kitab Header
            </h3>
            <label className="flex cursor-pointer items-center justify-between rounded border border-outline-variant px-3 py-2">
              <span className="text-body-ui-md text-on-surface">Enable traditional header</span>
              <button
                type="button"
                onClick={() => updateTraditionalHeader({ enabled: !kitab.traditionalHeader.enabled })}
                className={cn(kitab.traditionalHeader.enabled ? "text-primary" : "text-on-surface-variant")}
              >
                <Icon name={kitab.traditionalHeader.enabled ? "toggle_on" : "toggle_off"} size={24} />
              </button>
            </label>
            {kitab.traditionalHeader.enabled && (
              <>
                <div>
                  <label className="text-label-ui-sm mb-1 block text-on-surface-variant">Custom header text (Arabic)</label>
                  <input
                    type="text"
                    value={kitab.traditionalHeader.customText}
                    onChange={(e) => updateTraditionalHeader({ customText: e.target.value })}
                    placeholder="e.g. سورة البقرة"
                    dir="rtl"
                    className="h-9 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
                    style={{ fontFamily: "var(--font-amiri), serif" }}
                  />
                </div>
                <label className="flex cursor-pointer items-center justify-between rounded border border-outline-variant px-3 py-2">
                  <span className="text-body-ui-md text-on-surface">Decorative border around header</span>
                  <button
                    type="button"
                    onClick={() => updateTraditionalHeader({ border: !kitab.traditionalHeader.border })}
                    className={cn(kitab.traditionalHeader.border ? "text-primary" : "text-on-surface-variant")}
                  >
                    <Icon name={kitab.traditionalHeader.border ? "toggle_on" : "toggle_off"} size={24} />
                  </button>
                </label>
              </>
            )}
          </div>

          {/* Page Numbering & Basmala */}
          <div className="space-y-2">
            <h3 className="text-headline-ui-md text-on-surface flex items-center gap-2">
              <Icon name="format_list_numbered" size={18} />
              Page Numbering & Basmala
            </h3>
            <label className="flex cursor-pointer items-center justify-between rounded border border-outline-variant px-3 py-2">
              <span className="text-body-ui-md text-on-surface">Arabic-Indic page numbers (٠١٢٣)</span>
              <button
                type="button"
                onClick={() => {
                  const arabicPageNumbers = !kitab.arabicPageNumbers;
                  onUpdate({
                    kitab: { ...kitab, arabicPageNumbers },
                    pageSettings: {
                      ...settings.pageSettings,
                      pageNumberFormat: arabicPageNumbers ? "arabic-indic" : "decimal",
                    },
                  });
                }}
                className={cn(kitab.arabicPageNumbers ? "text-primary" : "text-on-surface-variant")}
              >
                <Icon name={kitab.arabicPageNumbers ? "toggle_on" : "toggle_off"} size={24} />
              </button>
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded border border-outline-variant px-3 py-2">
              <span className="text-body-ui-md text-on-surface">Basmala at start of each chapter</span>
              <button
                type="button"
                onClick={() => updateKitab({ basmalaPerChapter: !kitab.basmalaPerChapter })}
                className={cn(kitab.basmalaPerChapter ? "text-primary" : "text-on-surface-variant")}
              >
                <Icon name={kitab.basmalaPerChapter ? "toggle_on" : "toggle_off"} size={24} />
              </button>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   TOC Preview
   ================================================================ */

function TocPreview({ bookId }: { bookId: string }) {
  const { data: toc, isLoading } = useBookToc(bookId);

  return (
    <div className="space-y-3">
      <h2 className="text-headline-ui-md text-on-surface">Table of Contents Preview</h2>
      {isLoading ? (
        <p className="text-body-ui-md text-on-surface-variant">Generating TOC…</p>
      ) : !toc || toc.entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-outline-variant p-6 text-center">
          <Icon name="format_list_numbered" size={24} className="text-outline-variant" />
          <p className="text-body-ui-md mt-2 text-on-surface-variant">
            No TOC entries yet. Add chapters with headings to build the TOC.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-outline-variant bg-surface p-4">
          <ol className="space-y-1">
            {toc.entries.map((entry, i) => (
              <li
                key={entry.id}
                className="flex items-baseline gap-2 text-body-ui-md"
                style={{ paddingLeft: `${(entry.level - 1) * 20}px` }}
              >
                <span className="text-on-surface-variant">
                  {entry.isChapter ? <Icon name="menu_book" size={14} className="mr-1 inline" /> : null}
                  {entry.title}
                </span>
                <span className="flex-1 border-b border-dotted border-outline-variant" />
                <span className="text-mono-ui text-on-surface-variant">
                  {entry.pageNumber ?? "—"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
