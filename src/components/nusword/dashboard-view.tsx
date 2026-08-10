"use client";

/**
 * NUSWORD Dashboard View (Phase 1 — Foundation).
 * Based on design 2 (Dashboard). UI only — no mock data.
 *
 * Layout:
 *  - Top nav: brand + search + notifications + avatar
 *  - Left sidebar: Recent / Templates / Projects / Settings
 *  - Main: time-aware greeting + document grid (New Document card + empty state)
 */
import * as React from "react";
import { Icon } from "./icon";
import { useNuswordStore } from "@/stores/nusword-store";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  label: string;
  icon: string;
  active?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { key: "recent", label: "Recent", icon: "history", active: true },
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
  const openEditor = useNuswordStore((s) => s.openEditor);
  const [activeNav, setActiveNav] = React.useState("recent");

  // Defer the time-based greeting until after hydration to avoid SSR/CSR
  // mismatch (server clock vs client clock can yield different hours).
  const [greetingText, setGreetingText] = React.useState<string | null>(null);
  React.useEffect(() => {
    setGreetingText(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-on-surface">
      <DashboardTopNav />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          activeNav={activeNav}
          onNavChange={setActiveNav}
        />
        <main className="flex-1 overflow-y-auto bg-background p-margin-mobile md:p-margin-desktop">
          <div className="mx-auto max-w-6xl">
            {/* Welcome */}
            <div className="mb-10 flex flex-col gap-1 md:mb-12">
              <h1 className="text-display-doc text-on-surface">
                {/* Render a stable placeholder during SSR + before mount,
                    then the real greeting after hydration. */}
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
              </h2>
            </div>

            {/* Document grid */}
            <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* New Document card */}
              <button
                type="button"
                onClick={() => openEditor("Untitled.docx")}
                className="group flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface p-6 text-center transition-all hover:border-primary hover:bg-surface-container-low"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container transition-transform group-hover:scale-110">
                  <Icon name="add" size={24} />
                </div>
                <span className="text-headline-ui-md mb-1 text-primary">
                  New Document
                </span>
                <span className="text-body-ui-md text-sm text-on-surface-variant">
                  Blank canvas or template
                </span>
              </button>

              {/* Empty state placeholder (no mock data) */}
              <EmptyDocumentSlot />
              <EmptyDocumentSlot />
              <EmptyDocumentSlot />
            </div>

            {/* Empty-state helper */}
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
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function DashboardTopNav() {
  return (
    <header className="z-50 flex h-toolbar-height w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile md:px-margin-desktop">
      <div className="flex items-center gap-8">
        <span className="text-headline-ui-lg font-headline-ui-lg tracking-tight text-primary">
          NUSWORD
        </span>
        {/* Search */}
        <div className="relative hidden w-96 md:block">
          <Icon
            name="search"
            size={20}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
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

/** Empty document slot — visual rhythm placeholder, not real data. */
function EmptyDocumentSlot() {
  return (
    <div
      aria-hidden="true"
      className="flex h-64 flex-col overflow-hidden rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low/40"
    >
      <div className="flex h-40 items-center justify-center border-b border-outline-variant/30 p-4">
        <Icon name="draft" size={28} className="text-outline-variant" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 p-4">
        <div className="h-3 w-2/3 rounded bg-surface-container-high" />
        <div className="h-2 w-1/3 rounded bg-surface-container" />
      </div>
    </div>
  );
}
