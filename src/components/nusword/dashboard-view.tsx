"use client";

/**
 * NUSWORD Dashboard View (Phase 2 — Core Editor).
 * Based on design 2. Now wired to real document data via TanStack Query.
 *
 * Layout:
 *  - Top nav: brand + search + notifications + account
 *  - Left sidebar: Recent / Templates / Projects / Settings
 *  - Main: greeting + document grid (New Document card + real documents)
 */
import * as React from "react";
import { Icon } from "./icon";
import { useNuswordStore } from "@/stores/nusword-store";
import { cn } from "@/lib/utils";
import {
  useDocuments,
  useCreateDocument,
  useDeleteDocument,
} from "@/hooks/use-documents";
import { relativeTime } from "@/lib/nusword/time";
import { toast } from "sonner";

type NavItem = {
  key: string;
  label: string;
  icon: string;
};

const PRIMARY_NAV: NavItem[] = [
  { key: "recent", label: "Recent", icon: "history" },
  { key: "templates", label: "Templates", icon: "dashboard_customize" },
  { key: "projects", label: "Projects", icon: "folder_open" },
];

const FOOTER_NAV: NavItem[] = [
  { key: "settings", label: "Settings", icon: "settings" },
];

function greetingForHour(h: number): string {
  if (h < 11) return "Good morning";
  if (h < 15) return "Good afternoon";
  if (h < 19) return "Good evening";
  return "Good night";
}

export function DashboardView() {
  const openDocument = useNuswordStore((s) => s.openDocument);
  const createMutation = useCreateDocument();
  const deleteMutation = useDeleteDocument();
  const { data: documents = [], isLoading } = useDocuments();
  const [activeNav, setActiveNav] = React.useState("recent");
  const [search, setSearch] = React.useState("");

  // Defer greeting to after hydration.
  const [greetingText, setGreetingText] = React.useState<string | null>(null);
  React.useEffect(() => {
    setGreetingText(greetingForHour(new Date().getHours()));
  }, []);

  const handleNewDocument = () => {
    createMutation.mutate(
      { title: "Untitled" },
      {
        onSuccess: (doc) => {
          openDocument(doc.id, doc.title);
        },
        onError: () => toast.error("Failed to create document"),
      },
    );
  };

  const handleDelete = (id: string, title: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`"${title}" moved to trash`),
      onError: () => toast.error("Failed to delete document"),
    });
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.title.toLowerCase().includes(q));
  }, [documents, search]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-on-surface">
      <DashboardTopNav search={search} onSearch={setSearch} />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar activeNav={activeNav} onNavChange={setActiveNav} />
        <main className="flex-1 overflow-y-auto bg-background p-margin-mobile md:p-margin-desktop">
          <div className="mx-auto max-w-6xl">
            {/* Welcome */}
            <div className="mb-10 flex flex-col gap-1 md:mb-12">
              <h1 className="text-display-doc text-on-surface">
                {greetingText ? `${greetingText}.` : "Welcome."}
              </h1>
              <p className="text-body-ui-md text-on-surface-variant">
                Pick up where you left off or start a new publication.
              </p>
            </div>

            {/* Section label */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
                Documents
                {documents.length > 0 && (
                  <span className="ml-2 text-outline">{documents.length}</span>
                )}
              </h2>
            </div>

            {/* Document grid */}
            <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* New Document card */}
              <button
                type="button"
                onClick={handleNewDocument}
                disabled={createMutation.isPending}
                className="group flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface p-6 text-center transition-all hover:border-primary hover:bg-surface-container-low disabled:cursor-wait disabled:opacity-50"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container transition-transform group-hover:scale-110">
                  <Icon name={createMutation.isPending ? "progress_activity" : "add"} size={24} />
                </div>
                <span className="text-headline-ui-md mb-1 text-primary">
                  {createMutation.isPending ? "Creating…" : "New Document"}
                </span>
                <span className="text-body-ui-md text-sm text-on-surface-variant">
                  Blank canvas or template
                </span>
              </button>

              {/* Loading skeletons */}
              {isLoading &&
                [0, 1, 2].map((i) => <DocumentCardSkeleton key={i} />)}

              {/* Real documents */}
              {!isLoading &&
                filtered.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    id={doc.id}
                    title={doc.title}
                    updatedAt={doc.updatedAt}
                    wordCount={doc.wordCount}
                    pageSize={doc.settings.pageSize}
                    onDelete={() => handleDelete(doc.id, doc.title)}
                    onOpen={() => openDocument(doc.id, doc.title)}
                  />
                ))}
            </div>

            {/* Empty state when no documents at all */}
            {!isLoading && documents.length === 0 && (
              <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-lowest/50 px-6 py-12 text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                  <Icon name="description" size={22} />
                </div>
                <p className="text-headline-ui-md text-on-surface">
                  No documents yet
                </p>
                <p className="text-body-ui-md mt-1 max-w-sm text-on-surface-variant">
                  Create your first document to start writing. Your recent
                  documents will appear here.
                </p>
              </div>
            )}

            {/* No search results */}
            {!isLoading && documents.length > 0 && filtered.length === 0 && (
              <div className="mt-10 flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                  <Icon name="search_off" size={22} />
                </div>
                <p className="text-headline-ui-md text-on-surface">
                  No matches
                </p>
                <p className="text-body-ui-md mt-1 text-on-surface-variant">
                  No documents match “{search}”.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function DashboardTopNav({
  search,
  onSearch,
}: {
  search: string;
  onSearch: (v: string) => void;
}) {
  return (
    <header className="z-50 flex h-toolbar-height w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile md:px-margin-desktop">
      <div className="flex min-w-0 items-center gap-4 md:gap-8">
        <span className="text-headline-ui-lg font-headline-ui-lg shrink-0 tracking-tight text-primary">
          NUSWORD
        </span>
        {/* Search */}
        <div className="relative hidden w-64 md:block lg:w-96">
          <Icon
            name="search"
            size={20}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search documents..."
            className="h-9 w-full border-b border-outline-variant bg-transparent pl-10 pr-4 text-body-ui-md text-on-surface transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-surface-container-low active:opacity-80"
        >
          <Icon name="notifications" className="text-on-surface-variant" />
        </button>
        <button
          type="button"
          aria-label="Account"
          className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-outline-variant bg-surface-container-low transition-colors hover:bg-surface-container active:opacity-80"
        >
          <Icon name="person" size={20} className="text-on-surface-variant" />
        </button>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- */

function DashboardSidebar({
  activeNav,
  onNavChange,
}: {
  activeNav: string;
  onNavChange: (key: string) => void;
}) {
  return (
    <nav
      aria-label="Workspace navigation"
      className="z-40 hidden w-sidebar-width shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low md:flex"
    >
      <div className="p-6 pb-2">
        <div className="text-headline-ui-md mb-1 text-primary">Dashboard</div>
        <div className="text-label-ui-sm text-on-surface-variant">
          Manage Publications
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1 px-3">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink
            key={item.key}
            item={item}
            active={activeNav === item.key}
            onClick={() => onNavChange(item.key)}
          />
        ))}

        <div className="mb-4 mt-auto px-3 pt-8">
          {FOOTER_NAV.map((item) => (
            <SidebarLink
              key={item.key}
              item={item}
              active={activeNav === item.key}
              onClick={() => onNavChange(item.key)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function SidebarLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "flex items-center gap-4 rounded-r-lg border-l-4 px-6 py-3 transition-all text-label-ui-sm",
        active
          ? "border-primary bg-surface-container-highest text-primary"
          : "border-transparent text-on-surface-variant hover:bg-surface-container-high",
      )}
    >
      <Icon name={item.icon} size={20} />
      <span>{item.label}</span>
    </a>
  );
}

/* ---------------------------------------------------------------- */

function DocumentCard({
  id,
  title,
  updatedAt,
  wordCount,
  pageSize,
  onOpen,
  onDelete,
}: {
  id: string;
  title: string;
  updatedAt: string;
  wordCount: number;
  pageSize: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div
      className="group relative flex h-64 cursor-pointer flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface transition-all hover:border-outline hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="relative flex h-40 items-center justify-center overflow-hidden border-b border-outline-variant/50 bg-surface-container-low p-4">
        <div className="flex h-full w-full flex-col gap-2 border border-outline-variant/20 bg-white p-2 opacity-80 transition-opacity group-hover:opacity-100">
          <div className="h-2 w-3/4 rounded bg-surface-variant" />
          <div className="mt-2 h-1 w-full rounded bg-surface-container-high" />
          <div className="h-1 w-5/6 rounded bg-surface-container-high" />
          <div className="h-1 w-full rounded bg-surface-container-high" />
          <div className="h-1 w-2/3 rounded bg-surface-container-high" />
        </div>
        {/* Page size badge */}
        <span className="text-mono-ui absolute right-2 top-2 rounded bg-surface-container-highest/80 px-1.5 py-0.5 text-on-surface-variant backdrop-blur-sm">
          {pageSize}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <h3 className="text-headline-ui-md truncate text-on-surface">
          {title || "Untitled"}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-label-ui-sm flex items-center gap-1 text-on-surface-variant">
            <Icon name="edit" size={14} />
            {relativeTime(updatedAt)}
          </span>
          <span className="text-label-ui-sm text-on-surface-variant">
            {wordCount.toLocaleString("id-ID")} words
          </span>
        </div>
      </div>

      {/* More menu */}
      <button
        type="button"
        aria-label="Document actions"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-surface-container-highest/0 text-on-surface-variant opacity-0 transition-opacity hover:bg-surface-container-highest group-hover:opacity-100"
      >
        <Icon name="more_vert" size={18} />
      </button>
      {menuOpen && (
        <div
          className="absolute right-2 top-10 z-20 w-40 overflow-hidden rounded-lg border border-outline-variant bg-surface py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onOpen();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-ui-md text-on-surface hover:bg-surface-container-low"
          >
            <Icon name="open_in_new" size={16} /> Open
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-ui-md text-error hover:bg-error-container/30"
          >
            <Icon name="delete" size={16} /> Move to trash
          </button>
        </div>
      )}
      {/* click-away */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(false);
          }}
        />
      )}
      {/* keep id referenced for key uniqueness/debug */}
      <span className="sr-only">{id}</span>
    </div>
  );
}

function DocumentCardSkeleton() {
  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-lg border border-outline-variant/40 bg-surface">
      <div className="h-40 animate-pulse bg-surface-container-low" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-container" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container" />
      </div>
    </div>
  );
}
