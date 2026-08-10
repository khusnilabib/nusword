"use client";

/**
 * NUSWORD Document Editor View (Phase 2 — Core Editor).
 *
 * Integrates:
 *  - Tiptap rich-text editor (structured JSON content, not HTML)
 *  - Title input (document metadata, separate from body)
 *  - Autosave with save-state indicator (PRD §10)
 *  - Page settings (Layout panel → paper dimensions/margins, persisted)
 *  - Outline panel (headings extracted from Tiptap doc, click to scroll)
 *  - Basic page count estimation
 *  - Find & Replace panel
 *  - Version history (create + restore)
 *  - Responsive sidebars (mobile overlays)
 */
import * as React from "react";
import { Icon } from "./icon";
import { NuswordEditor, type NuswordEditorHandle } from "./editor/nusword-editor";
import { FindReplace } from "./editor/find-replace";
import { PreviewCanvas } from "./editor/preview-canvas";
import { PageThumbnails } from "./editor/page-thumbnails";
import { useNuswordStore } from "@/stores/nusword-store";
import { useDocument, useDocumentVersions, useCreateVersion, useRestoreVersion } from "@/hooks/use-documents";
import { useAutosave } from "@/hooks/use-autosave";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PAPER_SIZES,
  resolvePaperDimensions,
  mm,
  type JSONContent,
  type PageSettings,
  type PaperSizeKey,
  type Orientation,
  type HeaderFooterConfig,
} from "@/types/document";
import { extractOutline, countWordsInDoc, type OutlineEntry } from "@/lib/nusword/outline";
import { absoluteDateTime } from "@/lib/nusword/time";

export function EditorView() {
  const documentId = useNuswordStore((s) => s.activeDocumentId);
  const exitToDashboard = useNuswordStore((s) => s.exitToDashboard);
  const mobileLeftOpen = useNuswordStore((s) => s.mobileLeftOpen);
  const mobileRightOpen = useNuswordStore((s) => s.mobileRightOpen);
  const setMobileLeftOpen = useNuswordStore((s) => s.setMobileLeftOpen);
  const setMobileRightOpen = useNuswordStore((s) => s.setMobileRightOpen);
  const anyMobileOpen = mobileLeftOpen || mobileRightOpen;

  if (!documentId) {
    // Should not happen — dashboard opens editor with an id. Defensive fallback.
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

  return (
    <EditorShell
      documentId={documentId}
      onBack={exitToDashboard}
      mobileLeftOpen={mobileLeftOpen}
      mobileRightOpen={mobileRightOpen}
      setMobileLeftOpen={setMobileLeftOpen}
      setMobileRightOpen={setMobileRightOpen}
      anyMobileOpen={anyMobileOpen}
    />
  );
}

/* ================================================================
   Shell — loads document, manages draft state + autosave
   ================================================================ */

interface EditorShellProps {
  documentId: string;
  onBack: () => void;
  mobileLeftOpen: boolean;
  mobileRightOpen: boolean;
  setMobileLeftOpen: (v: boolean) => void;
  setMobileRightOpen: (v: boolean) => void;
  anyMobileOpen: boolean;
}

function EditorShell(props: EditorShellProps) {
  const { documentId, onBack } = props;
  const { data: doc, isLoading, isError } = useDocument(documentId);

  // Local draft state — the source of truth while editing.
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState<JSONContent | null>(null);
  const [settings, setSettings] = React.useState<PageSettings | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // Editor instance — stored in state (not ref) so FindReplace can read it
  // during render without violating the "no ref access during render" rule.
  const [editorInstance, setEditorInstance] =
    React.useState<import("@tiptap/react").Editor | null>(null);
  const editorRef = React.useRef<NuswordEditorHandle | null>(null);
  const onReady = React.useCallback(
    (editor: import("@tiptap/react").Editor | null) => {
      setEditorInstance(editor);
    },
    [],
  );

  // Hydrate draft from server data (once per document load).
  React.useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content);
      setSettings(doc.settings);
      setHydrated(true);
    } else {
      setHydrated(false);
    }
  }, [doc]);

  const { saveState, flush } = useAutosave({
    documentId,
    title,
    content,
    settings,
    ready: hydrated,
  });

  // Derive outline + word count from content (recomputed on each change).
  const outline = React.useMemo(() => extractOutline(content), [content]);
  const wordCount = React.useMemo(() => countWordsInDoc(content), [content]);

  // Pagination — run the deterministic engine on the current content + settings.
  const [measureNonce, setMeasureNonce] = React.useState(0);
  const pagination = usePagination({
    content,
    settings,
    measureNonce,
  });

  // Re-measure after images load (bump nonce).
  React.useEffect(() => {
    const handler = () => setMeasureNonce((n) => n + 1);
    window.addEventListener("load", handler);
    return () => window.removeEventListener("load", handler);
  }, []);

  const isRtl = settings?.languageDirection === "rtl";
  const setRtl = (rtl: boolean) => {
    setSettings((s) =>
      s ? { ...s, languageDirection: rtl ? "rtl" : "ltr" } : s,
    );
  };

  const updateSettings = React.useCallback(
    (patch: Partial<PageSettings>) => {
      setSettings((s) => (s ? { ...s, ...patch } : s));
    },
    [],
  );

  const editorMode = useNuswordStore((s) => s.editorMode);
  const setEditorMode = useNuswordStore((s) => s.setEditorMode);
  const activePageIndex = useNuswordStore((s) => s.activePageIndex);
  const setActivePageIndex = useNuswordStore((s) => s.setActivePageIndex);

  if (isLoading) {
    return <EditorLoading />;
  }
  if (isError || !doc || !content || !settings) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Icon name="error" size={32} className="text-error" />
        <p className="text-headline-ui-md text-on-surface">
          Couldn&apos;t load document
        </p>
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
      <EditorTopNav
        title={title}
        onTitleChange={setTitle}
        saveState={saveState}
        onBack={onBack}
        onFlush={flush}
        onOpenMobileLeft={() => props.setMobileLeftOpen(true)}
        onOpenMobileRight={() => props.setMobileRightOpen(true)}
        editorMode={editorMode}
        onToggleMode={() =>
          setEditorMode(editorMode === "edit" ? "preview" : "edit")
        }
        totalPages={pagination.totalPages}
      />
      <div className="relative flex flex-1 overflow-hidden">
        <EditorLeftSidebar
          outline={outline}
          wordCount={wordCount}
          onScrollToHeading={(id) => scrollToHeading(editorInstance, id)}
          content={content}
          settings={settings}
          pagination={pagination}
          activePageIndex={activePageIndex}
          onPageClick={(idx) => {
            setActivePageIndex(idx);
            setEditorMode("preview");
          }}
          onSwitchToPreview={() => setEditorMode("preview")}
        />
        {editorMode === "edit" ? (
          <EditorCanvas
            documentId={documentId}
            content={content}
            onChange={setContent}
            settings={settings}
            title={title}
            onTitleChange={setTitle}
            editorRef={editorRef}
            onReady={onReady}
            editorInstance={editorInstance}
            onMeasureNonce={() => setMeasureNonce((n) => n + 1)}
          />
        ) : (
          <PreviewCanvas
            title={title}
            content={content}
            settings={settings}
            pagination={pagination}
            zoom={useNuswordStore.getState().zoom}
            activePageIndex={activePageIndex}
            onPageClick={setActivePageIndex}
          />
        )}
        <EditorRightSidebar
          settings={settings}
          onUpdateSettings={updateSettings}
          isRtl={isRtl}
          onToggleRtl={() => setRtl(!isRtl)}
        />

        {/* Mobile backdrop */}
        {props.anyMobileOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Close panels"
            onClick={() => {
              props.setMobileLeftOpen(false);
              props.setMobileRightOpen(false);
            }}
            className="absolute inset-0 z-30 cursor-pointer bg-inverse-surface/40 backdrop-blur-[1px] md:hidden"
          />
        )}
      </div>
      <EditorStatusBar
        wordCount={wordCount}
        isRtl={isRtl}
        onToggleRtl={() => setRtl(!isRtl)}
        totalPages={pagination.totalPages}
      />
    </div>
  );
}

/* ================================================================
   Top Nav — title input + save state + actions
   ================================================================ */

function EditorTopNav({
  title,
  onTitleChange,
  saveState,
  onBack,
  onFlush,
  onOpenMobileLeft,
  onOpenMobileRight,
  editorMode,
  onToggleMode,
  totalPages,
}: {
  title: string;
  onTitleChange: (t: string) => void;
  saveState: "idle" | "saving" | "saved" | "error";
  onBack: () => void;
  onFlush: () => void;
  onOpenMobileLeft: () => void;
  onOpenMobileRight: () => void;
  editorMode: "edit" | "preview";
  onToggleMode: () => void;
  totalPages: number;
}) {
  const toggleFindReplace = useNuswordStore((s) => s.toggleFindReplace);

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Saved";
  const saveIcon =
    saveState === "saving"
      ? "progress_activity"
      : saveState === "error"
        ? "cloud_off"
        : "cloud_done";

  return (
    <nav className="z-50 flex h-toolbar-height w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile md:px-gutter">
      {/* Left: back + title + save state */}
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to dashboard"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <button
          type="button"
          onClick={onOpenMobileLeft}
          aria-label="Open navigation"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary md:hidden"
        >
          <Icon name="menu" size={22} />
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onFlush}
          placeholder="Untitled"
          aria-label="Document title"
          className="text-body-ui-md min-w-0 flex-1 truncate border-none bg-transparent text-base italic text-on-surface focus:outline-none md:text-lg"
        />
        <span
          className={cn(
            "text-label-ui-sm hidden items-center gap-1 lg:flex",
            saveState === "error" ? "text-error" : "text-outline",
            saveState === "saving" && "animate-pulse",
          )}
        >
          <Icon name={saveIcon} size={14} />
          {saveLabel}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Edit / Preview toggle */}
        <div className="flex shrink-0 items-center rounded border border-outline-variant bg-surface-container-low p-0.5">
          <button
            type="button"
            onClick={() => editorMode !== "edit" && onToggleMode()}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded px-2.5 py-1 text-label-ui-sm transition-colors",
              editorMode === "edit"
                ? "bg-surface-container-highest text-primary"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <Icon name="edit" size={14} />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            type="button"
            onClick={() => editorMode !== "preview" && onToggleMode()}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded px-2.5 py-1 text-label-ui-sm transition-colors",
              editorMode === "preview"
                ? "bg-surface-container-highest text-primary"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <Icon name="visibility" size={14} />
            <span className="hidden sm:inline">Preview</span>
            {totalPages > 0 && (
              <span className="text-mono-ui text-outline">({totalPages})</span>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={toggleFindReplace}
          aria-label="Find & replace"
          title="Find & replace"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
        >
          <Icon name="search" size={20} />
        </button>
        <button
          type="button"
          onClick={onOpenMobileRight}
          aria-label="Open properties"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary md:hidden"
        >
          <Icon name="tune" size={20} />
        </button>
        <button
          type="button"
          className="hidden cursor-pointer rounded border border-outline-variant px-3 py-1.5 text-body-ui-md text-primary transition-colors duration-200 hover:bg-surface-container-low sm:inline-flex"
        >
          Share
        </button>
        <button
          type="button"
          className="cursor-pointer rounded bg-primary px-3 py-1.5 text-body-ui-md text-on-primary transition-colors duration-200 hover:bg-primary-container sm:px-4"
        >
          Export
        </button>
      </div>
    </nav>
  );
}

/* ================================================================
   Left Sidebar — Outline / Pages + Versions
   ================================================================ */

function EditorLeftSidebar({
  outline,
  wordCount,
  onScrollToHeading,
  content,
  settings,
  pagination,
  activePageIndex,
  onPageClick,
  onSwitchToPreview,
}: {
  outline: OutlineEntry[];
  wordCount: number;
  onScrollToHeading: (id: string) => void;
  content: JSONContent;
  settings: PageSettings;
  pagination: import("@/lib/nusword/pagination").PaginationResult;
  activePageIndex: number;
  onPageClick: (idx: number) => void;
  onSwitchToPreview: () => void;
}) {
  const tab = useNuswordStore((s) => s.editorSidebarTab);
  const setTab = useNuswordStore((s) => s.setEditorSidebarTab);
  const mobileOpen = useNuswordStore((s) => s.mobileLeftOpen);
  const setMobileOpen = useNuswordStore((s) => s.setMobileLeftOpen);

  return (
    <aside
      className={cn(
        "z-40 flex h-full w-sidebar-width shrink-0 flex-col border-r border-outline-variant bg-surface",
        "fixed inset-y-0 left-0 top-0 transition-transform duration-300 md:static md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="flex items-center justify-between border-b border-outline-variant p-4">
        <h2 className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
          Navigation
        </h2>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="flex size-7 cursor-pointer items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-low md:hidden"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="flex border-b border-outline-variant">
        <SidebarTab
          active={tab === "outline"}
          onClick={() => setTab("outline")}
          icon="format_list_bulleted"
          label="Outline"
        />
        <SidebarTab
          active={tab === "pages"}
          onClick={() => setTab("pages")}
          icon="layers"
          label="Pages"
        />
        <SidebarTab
          active={tab === "versions"}
          onClick={() => setTab("versions")}
          icon="history"
          label="Versions"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "outline" ? (
          <OutlinePanel outline={outline} onScrollToHeading={onScrollToHeading} />
        ) : tab === "pages" ? (
          <PageThumbnails
            content={content}
            settings={settings}
            pagination={pagination}
            activePageIndex={activePageIndex}
            onPageClick={onPageClick}
            onSwitchToPreview={onSwitchToPreview}
          />
        ) : (
          <VersionsPanel />
        )}
      </div>
    </aside>
  );
}

function SidebarTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 cursor-pointer items-center justify-center gap-1 py-2 transition-all text-label-ui-sm",
        active
          ? "border-b-2 border-primary bg-surface-container-low font-bold text-primary"
          : "border-b-2 border-transparent text-on-surface-variant hover:text-primary",
      )}
    >
      <Icon name={icon} size={16} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function OutlinePanel({
  outline,
  onScrollToHeading,
}: {
  outline: OutlineEntry[];
  onScrollToHeading: (id: string) => void;
}) {
  if (outline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Icon name="format_list_bulleted" size={28} className="text-outline-variant" />
        <p className="text-body-ui-md text-on-surface-variant">No headings yet</p>
        <p className="text-label-ui-sm text-outline">
          Use H1–H3 in the toolbar to build your outline.
        </p>
      </div>
    );
  }
  return (
    <nav aria-label="Document outline" className="space-y-0.5">
      {outline.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onScrollToHeading(entry.id)}
          className={cn(
            "block w-full truncate border-l-2 py-1.5 text-left text-body-ui-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary",
            entry.level === 1
              ? "border-primary pl-2 font-semibold text-on-surface"
              : entry.level === 2
                ? "border-transparent pl-6"
                : "border-transparent pl-10",
          )}
          title={entry.text}
        >
          {entry.text}
        </button>
      ))}
    </nav>
  );
}

function VersionsPanel() {
  const documentId = useNuswordStore((s) => s.activeDocumentId);
  const { data: versions = [], isLoading } = useDocumentVersions(documentId);
  const createVersion = useCreateVersion(documentId ?? "");
  const restoreVersion = useRestoreVersion(documentId ?? "");
  const [message, setMessage] = React.useState("");

  const handleCreate = () => {
    createVersion.mutate(
      { message: message.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Version saved");
          setMessage("");
        },
        onError: () => toast.error("Failed to save version"),
      },
    );
  };

  const handleRestore = (versionId: string, version: number) => {
    restoreVersion.mutate(versionId, {
      onSuccess: () => toast.success(`Restored to version ${version}`),
      onError: () => toast.error("Failed to restore version"),
    });
  };

  return (
    <div className="space-y-4">
      {/* Create version */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
        <div className="text-label-ui-sm mb-2 text-on-surface-variant">
          Save a snapshot
        </div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional label…"
          className="mb-2 h-8 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={createVersion.isPending}
          className="w-full cursor-pointer rounded bg-primary px-3 py-1.5 text-body-ui-md text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          {createVersion.isPending ? "Saving…" : "Save version"}
        </button>
      </div>

      {/* Version list */}
      <div>
        <div className="text-label-ui-sm mb-2 text-on-surface-variant">
          History
        </div>
        {isLoading ? (
          <p className="text-body-ui-md text-on-surface-variant">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="text-body-ui-md text-on-surface-variant">
            No saved versions yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {versions.map((v) => (
              <li
                key={v.id}
                className="rounded-lg border border-outline-variant bg-surface p-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-ui-md font-semibold text-on-surface">
                    v{v.version}
                  </span>
                  <span className="text-label-ui-sm text-on-surface-variant">
                    {v.wordCount.toLocaleString("id-ID")} words
                  </span>
                </div>
                {v.message && (
                  <p className="text-body-ui-md mt-0.5 text-on-surface-variant">
                    {v.message}
                  </p>
                )}
                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className="text-label-ui-sm text-outline"
                    title={absoluteDateTime(v.createdAt)}
                  >
                    {new Date(v.createdAt).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRestore(v.id, v.version)}
                    disabled={restoreVersion.isPending}
                    className="cursor-pointer rounded border border-outline-variant px-2 py-0.5 text-label-ui-sm text-primary transition-colors hover:bg-surface-container-low disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Center Canvas — Ruler + Paper + Tiptap editor
   ================================================================ */

function EditorCanvas({
  documentId,
  content,
  onChange,
  settings,
  title,
  onTitleChange,
  editorRef,
  onReady,
  editorInstance,
  onMeasureNonce,
}: {
  documentId: string;
  content: JSONContent;
  onChange: (json: JSONContent) => void;
  settings: PageSettings;
  title: string;
  onTitleChange: (t: string) => void;
  editorRef: React.RefObject<NuswordEditorHandle | null>;
  onReady: (editor: import("@tiptap/react").Editor | null) => void;
  editorInstance: import("@tiptap/react").Editor | null;
  onMeasureNonce: () => void;
}) {
  const zoom = useNuswordStore((s) => s.zoom);
  const showFindReplace = useNuswordStore((s) => s.showFindReplace);
  const setShowFindReplace = useNuswordStore((s) => s.setShowFindReplace);

  const { widthMm, heightMm } = resolvePaperDimensions(settings);
  const scale = zoom / 100;

  // Re-measure pagination after images load inside the editor.
  React.useEffect(() => {
    const root = document.querySelector(".nusword-editor-root");
    if (!root) return;
    const handler = () => onMeasureNonce();
    root.addEventListener("load", handler, true); // capture for img load events
    return () => root.removeEventListener("load", handler, true);
  }, [onMeasureNonce]);

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-auto bg-surface-container-low px-4 py-10">
      {/* Top ruler */}
      <div className="sticky top-0 z-10 flex h-6 w-full shrink-0 items-end overflow-hidden border-b border-outline-variant bg-surface px-gutter">
        <div className="ruler-h h-4 flex-1" />
      </div>

      {/* Paper */}
      <article
        className="paper-shadow relative z-0 mx-auto mt-6 mb-20 flex origin-top flex-col bg-white transition-transform"
        style={{
          width: mm(widthMm),
          minHeight: mm(heightMm),
          paddingTop: mm(settings.marginTopMm),
          paddingBottom: mm(settings.marginBottomMm),
          paddingLeft: mm(settings.marginLeftMm),
          paddingRight: mm(settings.marginRightMm),
          transform: `scale(${scale})`,
          columnCount: settings.columns > 1 ? settings.columns : undefined,
          columnGap: settings.columns > 1 ? "8mm" : undefined,
        }}
      >
        <div dir={settings.languageDirection} className="flex flex-1 flex-col">
          {/* Title (document metadata, not part of Tiptap body) */}
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled document"
            aria-label="Document title"
            className="text-display-doc mb-8 w-full border-none bg-transparent text-on-surface focus:outline-none"
          />
          {/* Tiptap editor — keyed by documentId so it remounts per document */}
          <NuswordEditor
            key={documentId}
            initialContent={content}
            onChange={onChange}
            onReady={onReady}
            placeholder="Start writing your document…"
            fontSizePt={settings.fontSizePt}
            lineHeight={settings.lineHeight}
            dir={settings.languageDirection}
            editorRef={editorRef}
          />
        </div>
      </article>

      {/* Find & Replace overlay */}
      {showFindReplace && (
        <FindReplace
          editor={editorInstance}
          onClose={() => setShowFindReplace(false)}
        />
      )}
    </main>
  );
}

/* ================================================================
   Right Sidebar — Typography / Layout properties (wired to settings)
   ================================================================ */

function EditorRightSidebar({
  settings,
  onUpdateSettings,
  isRtl,
  onToggleRtl,
}: {
  settings: PageSettings;
  onUpdateSettings: (patch: Partial<PageSettings>) => void;
  isRtl: boolean;
  onToggleRtl: () => void;
}) {
  const tab = useNuswordStore((s) => s.editorPropertiesTab);
  const setTab = useNuswordStore((s) => s.setEditorPropertiesTab);
  const mobileOpen = useNuswordStore((s) => s.mobileRightOpen);
  const setMobileOpen = useNuswordStore((s) => s.setMobileRightOpen);

  return (
    <aside
      className={cn(
        "z-40 flex h-full w-sidebar-width shrink-0 flex-col border-l border-outline-variant bg-surface",
        "fixed inset-y-0 right-0 top-0 transition-transform duration-300 md:static md:translate-x-0",
        mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
      )}
    >
      <div className="flex items-center justify-between border-b border-outline-variant p-4">
        <h2 className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
          Properties
        </h2>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close properties"
          className="flex size-7 cursor-pointer items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-low md:hidden"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="flex border-b border-outline-variant px-2 pt-2">
        <PropertiesTab
          active={tab === "typography"}
          onClick={() => setTab("typography")}
          icon="text_fields"
          label="Typography"
        />
        <PropertiesTab
          active={tab === "layout"}
          onClick={() => setTab("layout")}
          icon="aspect_ratio"
          label="Layout"
        />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {tab === "typography" ? (
          <TypographyPanel settings={settings} onUpdate={onUpdateSettings} />
        ) : (
          <LayoutPanel
            settings={settings}
            onUpdate={onUpdateSettings}
            isRtl={isRtl}
            onToggleRtl={onToggleRtl}
          />
        )}
      </div>
    </aside>
  );
}

function PropertiesTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-1 px-3 pb-2 transition-all text-label-ui-sm",
        active
          ? "border-b-2 border-primary text-primary"
          : "border-b-2 border-transparent text-on-surface-variant hover:text-on-surface",
      )}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

function TypographyPanel({
  settings,
  onUpdate,
}: {
  settings: PageSettings;
  onUpdate: (patch: Partial<PageSettings>) => void;
}) {
  return (
    <>
      <Field label="Font Family">
        <SelectInput
          value={settings.fontFamily}
          onChange={(v) => onUpdate({ fontFamily: v })}
          options={[
            "Source Serif 4",
            "Hanken Grotesk",
            "JetBrains Mono",
            "Amiri (Arabic)",
          ]}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Size">
          <MonoNumberInput
            value={settings.fontSizePt}
            suffix="pt"
            min={8}
            max={96}
            onChange={(v) => onUpdate({ fontSizePt: v })}
          />
        </Field>
        <Field label="Weight">
          <SelectInput
            value="Regular"
            onChange={() => {}}
            options={["Regular", "Medium", "SemiBold", "Bold"]}
          />
        </Field>
      </div>

      <Field label="Line Height">
        <MonoNumberInput
          value={settings.lineHeight}
          step={0.1}
          min={1}
          max={3}
          onChange={(v) => onUpdate({ lineHeight: v })}
        />
      </Field>

      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
        <p className="text-label-ui-sm text-on-surface-variant">
          Inline formatting (bold, italic, alignment…) is available from the
          floating toolbar above the document.
        </p>
      </div>
    </>
  );
}

function LayoutPanel({
  settings,
  onUpdate,
  isRtl,
  onToggleRtl,
}: {
  settings: PageSettings;
  onUpdate: (patch: Partial<PageSettings>) => void;
  isRtl: boolean;
  onToggleRtl: () => void;
}) {
  const sizeOptions = (Object.keys(PAPER_SIZES) as Array<Exclude<PaperSizeKey, "Custom">>)
    .map((k) => ({ value: k, label: PAPER_SIZES[k].label }))
    .concat([{ value: "Custom", label: "Custom…" }]);

  return (
    <>
      <Field label="Page Size">
        <SelectInput
          value={settings.pageSize}
          onChange={(v) => onUpdate({ pageSize: v as PaperSizeKey })}
          options={sizeOptions.map((o) => o.label)}
          valueMap={sizeOptions.reduce<Record<string, string>>((acc, o) => {
            acc[o.label] = o.value;
            return acc;
          }, {})}
        />
      </Field>

      {settings.pageSize === "Custom" && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Custom Width">
            <MonoNumberInput
              value={settings.customWidthMm ?? 210}
              suffix="mm"
              onChange={(v) => onUpdate({ customWidthMm: v })}
            />
          </Field>
          <Field label="Custom Height">
            <MonoNumberInput
              value={settings.customHeightMm ?? 297}
              suffix="mm"
              onChange={(v) => onUpdate({ customHeightMm: v })}
            />
          </Field>
        </div>
      )}

      <Field label="Orientation">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onUpdate({ orientation: "portrait" as Orientation })}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded border px-3 py-1.5 text-body-ui-md transition-colors",
              settings.orientation === "portrait"
                ? "border-primary bg-surface-container-lowest text-primary"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest",
            )}
          >
            <Icon name="stay_primary_portrait" size={18} />
            Portrait
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ orientation: "landscape" as Orientation })}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded border px-3 py-1.5 text-body-ui-md transition-colors",
              settings.orientation === "landscape"
                ? "border-primary bg-surface-container-lowest text-primary"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest",
            )}
          >
            <Icon name="stay_primary_landscape" size={18} />
            Landscape
          </button>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Margin Top">
          <MonoNumberInput
            value={settings.marginTopMm}
            suffix="mm"
            step={1}
            min={0}
            onChange={(v) => onUpdate({ marginTopMm: v })}
          />
        </Field>
        <Field label="Margin Bottom">
          <MonoNumberInput
            value={settings.marginBottomMm}
            suffix="mm"
            step={1}
            min={0}
            onChange={(v) => onUpdate({ marginBottomMm: v })}
          />
        </Field>
        <Field label="Margin Left">
          <MonoNumberInput
            value={settings.marginLeftMm}
            suffix="mm"
            step={1}
            min={0}
            onChange={(v) => onUpdate({ marginLeftMm: v })}
          />
        </Field>
        <Field label="Margin Right">
          <MonoNumberInput
            value={settings.marginRightMm}
            suffix="mm"
            step={1}
            min={0}
            onChange={(v) => onUpdate({ marginRightMm: v })}
          />
        </Field>
      </div>

      <Field label="Columns">
        <div className="flex gap-1">
          {[1, 2, 3].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onUpdate({ columns: c })}
              className={cn(
                "flex-1 cursor-pointer rounded border py-1.5 text-body-ui-md transition-colors",
                settings.columns === c
                  ? "border-primary bg-surface-container-lowest text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Bleed">
        <MonoNumberInput
          value={settings.bleedMm}
          suffix="mm"
          step={1}
          min={0}
          onChange={(v) => onUpdate({ bleedMm: v })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Gutter">
          <MonoNumberInput
            value={settings.gutterMm ?? 0}
            suffix="mm"
            step={1}
            min={0}
            onChange={(v) => onUpdate({ gutterMm: v })}
          />
        </Field>
        <Field label="Page Number Start">
          <MonoNumberInput
            value={settings.pageNumberStart}
            step={1}
            min={0}
            onChange={(v) => onUpdate({ pageNumberStart: v })}
          />
        </Field>
      </div>

      <Field label="Page Number Format">
        <div className="flex gap-1">
          {(["decimal", "roman", "none"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => onUpdate({ pageNumberFormat: fmt })}
              className={cn(
                "flex-1 cursor-pointer rounded border py-1.5 text-body-ui-md capitalize transition-colors",
                settings.pageNumberFormat === fmt
                  ? "border-primary bg-surface-container-lowest text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest",
              )}
            >
              {fmt}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Different First Page">
        <button
          type="button"
          onClick={() => onUpdate({ differentFirstPage: !settings.differentFirstPage })}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between rounded border px-3 py-1.5 text-body-ui-md transition-colors",
            settings.differentFirstPage
              ? "border-primary bg-surface-container-high text-primary"
              : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
          )}
        >
          <span className="flex items-center gap-2">
            <Icon name="first_page" size={18} />
            {settings.differentFirstPage ? "On" : "Off"}
          </span>
          <Icon name={settings.differentFirstPage ? "toggle_on" : "toggle_off"} size={20} />
        </button>
      </Field>

      <HeaderFooterEditor
        label="Header"
        config={settings.header}
        onChange={(header) => onUpdate({ header })}
      />
      <HeaderFooterEditor
        label="Footer"
        config={settings.footer}
        onChange={(footer) => onUpdate({ footer })}
      />

      <Field label="Direction">
        <button
          type="button"
          onClick={onToggleRtl}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between rounded border px-3 py-1.5 text-body-ui-md transition-colors",
            isRtl
              ? "border-primary bg-surface-container-high text-primary"
              : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
          )}
        >
          <span className="flex items-center gap-2">
            <Icon name="translate" size={18} />
            {isRtl ? "RTL (Arabic)" : "LTR"}
          </span>
          <Icon name={isRtl ? "toggle_on" : "toggle_off"} size={20} />
        </button>
      </Field>
    </>
  );
}

/* ================================================================
   Header / Footer editor (3 text slots + enable toggle)
   ================================================================ */

function HeaderFooterEditor({
  label,
  config,
  onChange,
}: {
  label: string;
  config: HeaderFooterConfig;
  onChange: (config: HeaderFooterConfig) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="rounded-lg border border-outline-variant">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-body-ui-md text-on-surface hover:bg-surface-container-low"
      >
        <span className="flex items-center gap-2">
          <Icon name={label === "Header" ? "vertical_align_top" : "vertical_align_bottom"} size={16} />
          {label}
          {config.enabled && (
            <span className="text-label-ui-sm text-outline">on</span>
          )}
        </span>
        <Icon name={expanded ? "expand_less" : "expand_more"} size={18} />
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-outline-variant p-3">
          <button
            type="button"
            onClick={() => onChange({ ...config, enabled: !config.enabled })}
            className={cn(
              "flex w-full cursor-pointer items-center justify-between rounded border px-3 py-1.5 text-body-ui-md transition-colors",
              config.enabled
                ? "border-primary bg-surface-container-high text-primary"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
            )}
          >
            <span>{config.enabled ? "Enabled" : "Disabled"}</span>
            <Icon name={config.enabled ? "toggle_on" : "toggle_off"} size={20} />
          </button>
          <Field label="Left">
            <input
              type="text"
              value={config.left}
              onChange={(e) => onChange({ ...config, left: e.target.value })}
              placeholder="Left text…"
              className="h-8 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
            />
          </Field>
          <Field label="Center">
            <input
              type="text"
              value={config.center}
              onChange={(e) => onChange({ ...config, center: e.target.value })}
              placeholder="{{page}} / {{pages}}"
              className="h-8 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
            />
          </Field>
          <Field label="Right">
            <input
              type="text"
              value={config.right}
              onChange={(e) => onChange({ ...config, right: e.target.value })}
              placeholder="Right text…"
              className="h-8 w-full border border-outline-variant bg-surface-container-lowest px-2 text-body-ui-md text-on-surface focus:border-primary focus:outline-none"
            />
          </Field>
          <p className="text-label-ui-sm text-outline">
            Variables: <code className="text-mono-ui text-primary">{"{{page}}"}</code>{" "}
            <code className="text-mono-ui text-primary">{"{{pages}}"}</code>{" "}
            <code className="text-mono-ui text-primary">{"{{title}}"}</code>
          </p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Small reusable property controls (controlled, wired to settings)
   ================================================================ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-label-ui-sm mb-2 block text-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  valueMap,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  /** Optional map from option label → stored value (for enum keys). */
  valueMap?: Record<string, string>;
}) {
  // Find the label that corresponds to the current value.
  const currentLabel = valueMap
    ? Object.entries(valueMap).find(([, v]) => v === value)?.[0] ?? options[0]
    : value;

  return (
    <div className="relative">
      <select
        value={currentLabel}
        onChange={(e) => {
          const label = e.target.value;
          onChange(valueMap?.[label] ?? label);
        }}
        className="text-body-ui-md w-full cursor-pointer appearance-none border-b border-outline-variant bg-surface-container-lowest px-0 pr-8 py-1.5 text-on-surface focus:border-primary focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <Icon
        name="arrow_drop_down"
        size={20}
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-outline"
      />
    </div>
  );
}

function MonoNumberInput({
  value,
  onChange,
  suffix,
  step = 1,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center border-b border-outline-variant focus-within:border-primary">
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="text-mono-ui w-0 flex-1 border-none bg-transparent p-0 text-on-surface focus:ring-0 focus:outline-none"
      />
      {suffix && (
        <span className="text-mono-ui shrink-0 pr-1 text-outline-variant">{suffix}</span>
      )}
    </div>
  );
}

/* ================================================================
   Status Bar
   ================================================================ */

function EditorStatusBar({
  wordCount,
  isRtl,
  onToggleRtl,
  totalPages,
}: {
  wordCount: number;
  isRtl: boolean;
  onToggleRtl: () => void;
  totalPages: number;
}) {
  const zoom = useNuswordStore((s) => s.zoom);
  const setZoom = useNuswordStore((s) => s.setZoom);
  const pages = Math.max(1, totalPages);

  return (
    <footer className="text-mono-ui z-50 flex h-statusbar-height w-full shrink-0 items-center justify-between border-t border-outline-variant bg-surface-container px-margin-mobile text-on-surface-variant md:px-4">
      <div className="flex items-center gap-2 md:gap-4">
        <span>Page 1 of {pages}</span>
        <span className="hidden size-1 rounded-full bg-outline-variant sm:block" />
        <span className="hidden sm:inline">
          {wordCount.toLocaleString("id-ID")} words
        </span>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <button
          type="button"
          onClick={() => setZoom(Math.max(25, zoom - 10))}
          aria-label="Zoom out"
          className="hidden cursor-pointer items-center gap-1 transition-colors hover:text-primary sm:flex"
        >
          <Icon name="zoom_out" size={16} />
        </button>
        <span className="tabular-nums">{zoom}%</span>
        <button
          type="button"
          onClick={() => setZoom(Math.min(400, zoom + 10))}
          aria-label="Zoom in"
          className="hidden cursor-pointer items-center gap-1 transition-colors hover:text-primary sm:flex"
        >
          <Icon name="zoom_in" size={16} />
        </button>

        <span className="hidden h-4 w-px bg-outline-variant sm:block" />

        <button
          type="button"
          onClick={onToggleRtl}
          aria-label={isRtl ? "RTL On" : "Toggle RTL"}
          className={cn(
            "flex cursor-pointer items-center gap-1 rounded px-2 transition-colors hover:text-primary",
            isRtl ? "bg-surface-container-high text-primary" : "",
          )}
        >
          <Icon name="translate" size={16} />
          <span className="hidden sm:inline">{isRtl ? "RTL On" : "RTL"}</span>
        </button>
      </div>
    </footer>
  );
}

/* ================================================================
   Helpers + loading state
   ================================================================ */

function EditorLoading() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-surface-container-low">
      <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
      <p className="text-body-ui-md text-on-surface-variant">Loading document…</p>
    </div>
  );
}

/** Scroll the Tiptap editor to a heading by its slug id. */
function scrollToHeading(
  editor: import("@tiptap/react").Editor | null,
  id: string,
) {
  if (!editor) return;
  const { state } = editor;
  let foundPos: number | null = null;
  state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    const text = node.textContent;
    const slug =
      "h-" +
      text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 40);
    if (slug === id) {
      foundPos = pos;
      return false;
    }
  });
  if (foundPos !== null) {
    editor.commands.setTextSelection(foundPos);
    editor.commands.scrollIntoView();
  }
}
