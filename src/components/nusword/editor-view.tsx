"use client";

/**
 * NUSWORD Document Editor View (Phase 1 — Foundation).
 * Based on design 1 (Document Editor). UI only — no mock content.
 *
 * Layout (matches PRD §10 Editor UX):
 *  - Top bar: doc name, save state, Share, Export (+ back to dashboard)
 *  - Left sidebar: Outline / Pages tabs (empty state)
 *  - Center: top ruler + A4 paper (empty contenteditable)
 *  - Right sidebar: Typography / Layout properties
 *  - Bottom status bar: page count, word count, zoom, RTL toggle
 */
import * as React from "react";
import { Icon } from "./icon";
import { useNuswordStore } from "@/stores/nusword-store";
import { cn } from "@/lib/utils";

export function EditorView() {
  const exitToDashboard = useNuswordStore((s) => s.exitToDashboard);
  const mobileLeftOpen = useNuswordStore((s) => s.mobileLeftOpen);
  const mobileRightOpen = useNuswordStore((s) => s.mobileRightOpen);
  const setMobileLeftOpen = useNuswordStore((s) => s.setMobileLeftOpen);
  const setMobileRightOpen = useNuswordStore((s) => s.setMobileRightOpen);
  const anyMobileOpen = mobileLeftOpen || mobileRightOpen;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-container-low text-on-surface">
      <EditorTopNav onBack={exitToDashboard} />
      <div className="relative flex flex-1 overflow-hidden">
        <EditorLeftSidebar />
        <EditorCanvas />
        <EditorRightSidebar />

        {/* Mobile backdrop — closes whichever overlay is open */}
        {anyMobileOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Close panels"
            onClick={() => {
              setMobileLeftOpen(false);
              setMobileRightOpen(false);
            }}
            className="absolute inset-0 z-30 cursor-pointer bg-inverse-surface/40 backdrop-blur-[1px] md:hidden"
          />
        )}
      </div>
      <EditorStatusBar />
    </div>
  );
}

/* ================================================================
   Top Nav
   ================================================================ */

function EditorTopNav({ onBack }: { onBack: () => void }) {
  const docName = useNuswordStore((s) => s.activeDocName);
  const setMobileLeftOpen = useNuswordStore((s) => s.setMobileLeftOpen);
  const setMobileRightOpen = useNuswordStore((s) => s.setMobileRightOpen);

  return (
    <nav className="z-50 flex h-toolbar-height w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile md:px-gutter">
      {/* Left: back + doc info */}
      <div className="flex min-w-0 items-center gap-2 md:gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to dashboard"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        {/* Mobile: open navigation sidebar */}
        <button
          type="button"
          onClick={() => setMobileLeftOpen(true)}
          aria-label="Open navigation"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary md:hidden"
        >
          <Icon name="menu" size={22} />
        </button>
        <span className="text-body-ui-md truncate text-base italic text-on-surface-variant md:text-lg">
          {docName}
        </span>
        <span className="text-label-ui-sm hidden items-center gap-1 text-outline lg:flex">
          <Icon name="cloud_done" size={14} />
          Saved
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Mobile: open properties sidebar */}
        <button
          type="button"
          onClick={() => setMobileRightOpen(true)}
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
   Left Sidebar — Outline / Pages
   ================================================================ */

function EditorLeftSidebar() {
  const tab = useNuswordStore((s) => s.editorSidebarTab);
  const setTab = useNuswordStore((s) => s.setEditorSidebarTab);
  const mobileOpen = useNuswordStore((s) => s.mobileLeftOpen);
  const setMobileOpen = useNuswordStore((s) => s.setMobileLeftOpen);

  return (
    <aside
      className={cn(
        "z-40 flex h-full w-sidebar-width shrink-0 flex-col border-r border-outline-variant bg-surface",
        // Mobile: slide-in overlay; Desktop: static
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

      {/* Tabs */}
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
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "outline" ? <OutlinePanel /> : <PagesPanel />}
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
        "flex flex-1 cursor-pointer items-center justify-center gap-2 py-2 transition-all text-label-ui-sm",
        active
          ? "border-b-2 border-primary bg-surface-container-low font-bold text-primary"
          : "border-b-2 border-transparent text-on-surface-variant hover:text-primary",
      )}
    >
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </button>
  );
}

function OutlinePanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Icon name="format_list_bulleted" size={28} className="text-outline-variant" />
      <p className="text-body-ui-md text-on-surface-variant">No headings yet</p>
      <p className="text-label-ui-sm text-outline">
        Add a Heading block to build your outline.
      </p>
    </div>
  );
}

function PagesPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Icon name="layers" size={28} className="text-outline-variant" />
      <p className="text-body-ui-md text-on-surface-variant">No pages</p>
      <p className="text-label-ui-sm text-outline">
        Pages will appear here once content is added.
      </p>
    </div>
  );
}

/* ================================================================
   Center Canvas — Ruler + Paper
   ================================================================ */

function EditorCanvas() {
  const isRtl = useNuswordStore((s) => s.isRtl);
  const zoom = useNuswordStore((s) => s.zoom);
  const [words, setWords] = React.useState(0);

  const scale = zoom / 100;

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-auto bg-surface-container-low px-4 py-10">
      {/* Top ruler (sticky) — spans the center canvas width */}
      <div className="sticky top-0 z-10 flex h-6 w-full shrink-0 items-end overflow-hidden border-b border-outline-variant bg-surface px-gutter">
        <div className="ruler-h h-4 flex-1" />
      </div>

      {/* Paper */}
      <article
        className="paper-shadow relative z-0 mx-auto mt-6 mb-20 flex w-[210mm] min-h-[297mm] origin-top flex-col bg-white p-[25.4mm] transition-transform"
        style={{ transform: `scale(${scale})` }}
      >
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="flex flex-1 flex-col"
        >
          <h1
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Untitled document"
            className="text-display-doc mb-8 text-on-surface focus:outline-none"
          />
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              const text = (e.currentTarget.textContent ?? "").trim();
              setWords(text ? text.split(/\s+/).length : 0);
            }}
            data-placeholder="Start writing your document…"
            className="text-body-doc-main flex-1 text-justify text-on-surface focus:outline-none"
          />
        </div>
      </article>

      {/* hidden word-count sink for status bar */}
      <WordCountSink count={words} />
    </main>
  );
}

/** Bridges the canvas word count into the status bar via a custom event. */
function WordCountSink({ count }: { count: number }) {
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("nusword:wordcount", { detail: count }),
    );
  }, [count]);
  return null;
}

/* ================================================================
   Right Sidebar — Typography / Layout properties
   ================================================================ */

function EditorRightSidebar() {
  const tab = useNuswordStore((s) => s.editorPropertiesTab);
  const setTab = useNuswordStore((s) => s.setEditorPropertiesTab);
  const mobileOpen = useNuswordStore((s) => s.mobileRightOpen);
  const setMobileOpen = useNuswordStore((s) => s.setMobileRightOpen);

  return (
    <aside
      className={cn(
        "z-40 flex h-full w-sidebar-width shrink-0 flex-col border-l border-outline-variant bg-surface",
        // Mobile: slide-in overlay from right; Desktop: static
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

      {/* Tabs */}
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
        {tab === "typography" ? <TypographyPanel /> : <LayoutPanel />}
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

function TypographyPanel() {
  const [align, setAlign] = React.useState<
    "left" | "center" | "right" | "justify"
  >("justify");

  return (
    <>
      {/* Font Family */}
      <Field label="Font Family">
        <SelectInput defaultValue="Source Serif 4">
          <option>Source Serif 4</option>
          <option>Hanken Grotesk</option>
          <option>JetBrains Mono</option>
          <option>Amiri (Arabic)</option>
        </SelectInput>
      </Field>

      {/* Size & Weight */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Size">
          <div className="flex items-center border-b border-outline-variant focus-within:border-primary">
            <input
              type="number"
              defaultValue={18}
              className="text-mono-ui w-0 flex-1 border-none bg-transparent p-0 text-on-surface focus:ring-0 focus:outline-none"
            />
            <span className="text-mono-ui shrink-0 pr-1 text-outline-variant">pt</span>
          </div>
        </Field>
        <Field label="Weight">
          <SelectInput defaultValue="Regular" bare>
            <option>Regular</option>
            <option>Medium</option>
            <option>SemiBold</option>
            <option>Bold</option>
          </SelectInput>
        </Field>
      </div>

      {/* Line height */}
      <Field label="Line Height">
        <div className="flex items-center border-b border-outline-variant focus-within:border-primary">
          <input
            type="text"
            defaultValue="1.6"
            className="text-mono-ui w-0 flex-1 border-none bg-transparent p-0 text-on-surface focus:ring-0 focus:outline-none"
          />
          <Icon name="format_line_spacing" size={16} className="text-outline-variant shrink-0" />
        </div>
      </Field>

      {/* Alignment */}
      <Field label="Alignment">
        <div className="flex gap-1">
          {(["left", "center", "right", "justify"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-label={`Align ${a}`}
              onClick={() => setAlign(a)}
              className={cn(
                "cursor-pointer rounded p-1 transition-colors",
                align === a
                  ? "bg-surface-container-high text-primary"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              <Icon name={`format_align_${a}`} size={20} />
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

function LayoutPanel() {
  return (
    <>
      <Field label="Page Size">
        <SelectInput defaultValue="A4 (210 × 297 mm)">
          <option>A4 (210 × 297 mm)</option>
          <option>A5 (148 × 210 mm)</option>
          <option>B5 (176 × 250 mm)</option>
          <option>Letter (8.5 × 11 in)</option>
          <option>Legal (8.5 × 14 in)</option>
          <option>F4 (210 × 330 mm)</option>
          <option>Custom…</option>
        </SelectInput>
      </Field>

      <Field label="Orientation">
        <div className="flex gap-1">
          <button className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-ui-md text-primary">
            <Icon name="stay_primary_portrait" size={18} />
            Portrait
          </button>
          <button className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded border border-outline-variant px-3 py-1.5 text-body-ui-md text-on-surface-variant hover:bg-surface-container-lowest">
            <Icon name="stay_primary_landscape" size={18} />
            Landscape
          </button>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Margin Top">
          <MonoInput defaultValue="25.4" suffix="mm" />
        </Field>
        <Field label="Margin Bottom">
          <MonoInput defaultValue="25.4" suffix="mm" />
        </Field>
        <Field label="Margin Left">
          <MonoInput defaultValue="25.4" suffix="mm" />
        </Field>
        <Field label="Margin Right">
          <MonoInput defaultValue="25.4" suffix="mm" />
        </Field>
      </div>

      <Field label="Columns">
        <div className="flex gap-1">
          {["1", "2", "3"].map((c, i) => (
            <button
              key={c}
              className={cn(
                "flex-1 cursor-pointer rounded border py-1.5 text-body-ui-md transition-colors",
                i === 0
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
        <MonoInput defaultValue="0" suffix="mm" />
      </Field>
    </>
  );
}

/* ================================================================
   Small reusable property controls
   ================================================================ */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
  defaultValue,
  children,
  bare,
}: {
  defaultValue: string;
  children: React.ReactNode;
  bare?: boolean;
}) {
  return (
    <div className="relative">
      <select
        defaultValue={defaultValue}
        className={cn(
          "text-body-ui-md w-full cursor-pointer appearance-none bg-transparent py-1.5 text-on-surface focus:outline-none",
          bare
            ? "border-b border-outline-variant px-0 focus:border-primary"
            : "border-b border-outline-variant bg-surface-container-lowest px-0 pr-8 focus:border-primary",
        )}
      >
        {children}
      </select>
      <Icon
        name="arrow_drop_down"
        size={20}
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-outline"
      />
    </div>
  );
}

function MonoInput({
  defaultValue,
  suffix,
}: {
  defaultValue: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center border-b border-outline-variant focus-within:border-primary">
      <input
        type="text"
        defaultValue={defaultValue}
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

function EditorStatusBar() {
  const isRtl = useNuswordStore((s) => s.isRtl);
  const toggleRtl = useNuswordStore((s) => s.toggleRtl);
  const zoom = useNuswordStore((s) => s.zoom);
  const setZoom = useNuswordStore((s) => s.setZoom);
  const [words, setWords] = React.useState(0);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<number>;
      setWords(ce.detail ?? 0);
    };
    window.addEventListener("nusword:wordcount", handler as EventListener);
    return () =>
      window.removeEventListener("nusword:wordcount", handler as EventListener);
  }, []);

  return (
    <footer className="text-mono-ui z-50 flex h-statusbar-height w-full shrink-0 items-center justify-between border-t border-outline-variant bg-surface-container px-margin-mobile text-on-surface-variant md:px-4">
      <div className="flex items-center gap-2 md:gap-4">
        <span>Page 1 of 1</span>
        <span className="hidden size-1 rounded-full bg-outline-variant sm:block" />
        <span className="hidden sm:inline">{words.toLocaleString()} words</span>
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
          onClick={toggleRtl}
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
