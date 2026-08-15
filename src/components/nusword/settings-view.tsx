"use client";

/**
 * NUSWORD Settings View.
 *
 * Four sections:
 *  - Profile: current user email + name (editable).
 *  - Preferences: theme, default page size, default font.
 *  - Keyboard Shortcuts: list of all the editor shortcuts.
 *  - About: NUSWORD version + external links.
 *
 * Uses the NUSWORD design system (bg-surface, border-outline-variant, etc.).
 * Theme is stored in localStorage because the project has next-themes
 * installed but no ThemeProvider mounted — we keep things simple and just
 * toggle the `dark` class on <html> + persist the choice.
 */
import * as React from "react";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import {
  PAPER_SIZES,
  type PaperSizeKey,
} from "@/types/document";

const NUSWORD_VERSION = "0.2.1";

const DEFAULT_FONTS = [
  "Source Serif 4",
  "Hanken Grotesk",
  "JetBrains Mono",
  "Amiri",
  "Arial",
  "Times New Roman",
] as const;

const KEYBOARD_SHORTCUTS: Array<{
  keys: string;
  description: string;
  group: "Editor" | "Navigation" | "Document";
}> = [
  { keys: "Ctrl + K", description: "Open command palette", group: "Navigation" },
  { keys: "Ctrl + S", description: "Save document (autosave also runs)", group: "Document" },
  { keys: "Ctrl + P", description: "Open export dialog", group: "Document" },
  { keys: "Ctrl + F", description: "Find & replace", group: "Editor" },
  { keys: "Ctrl + B", description: "Bold", group: "Editor" },
  { keys: "Ctrl + I", description: "Italic", group: "Editor" },
  { keys: "Ctrl + U", description: "Underline", group: "Editor" },
  { keys: "Ctrl + Z", description: "Undo", group: "Editor" },
  { keys: "Ctrl + Shift + Z", description: "Redo", group: "Editor" },
  { keys: "Ctrl + Enter", description: "Insert page break", group: "Editor" },
  { keys: "Ctrl + Shift + 1–6", description: "Apply heading level 1–6", group: "Editor" },
  { keys: "Esc", description: "Close dialog / panel", group: "Navigation" },
];

type ThemeKey = "light" | "dark" | "system";

const THEME_KEY = "nusword-theme";

function useStoredTheme(): [ThemeKey, (next: ThemeKey) => void] {
  const [theme, setThemeState] = React.useState<ThemeKey>("system");

  React.useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as ThemeKey | null) ?? "system";
    setThemeState(stored);
  }, []);

  const setTheme = React.useCallback((next: ThemeKey) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore quota errors */
    }
    applyTheme(next);
    toast.success(`Theme set to ${next}`);
  }, []);

  return [theme, setTheme];
}

function applyTheme(theme: ThemeKey) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  const effective = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  root.classList.toggle("dark", effective === "dark");
}

export function SettingsView() {
  return (
    <div className="mx-auto max-w-[960px] space-y-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-display-doc text-on-surface">Settings</h1>
        <p className="text-body-ui-md text-on-surface-variant">
          Manage your profile, preferences, and shortcuts.
        </p>
      </div>

      <ProfileSection />
      <PreferencesSection />
      <ShortcutsSection />
      <AboutSection />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section shell                                                        */
/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface">
      <header className="flex items-start gap-3 border-b border-outline-variant bg-surface-container-low/40 px-6 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Icon name={icon} size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-headline-ui-md text-on-surface">{title}</h2>
          {description && (
            <p className="text-body-ui-md text-on-surface-variant">
              {description}
            </p>
          )}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Profile                                                              */
/* ------------------------------------------------------------------ */

interface AuthUserShape {
  email?: string | null;
  name?: string | null;
  createdAt?: string;
}

function ProfileSection() {
  const { user, isDevMode } = useAuth();
  // The auth provider returns a Supabase User object cast shape; in Next.js
  // mode the actual fields live on the top level (id, email, name, createdAt).
  // user_metadata.name also works in some flows — try both.
  const initialName =
    (user as unknown as AuthUserShape)?.name ??
    user?.user_metadata?.name ??
    "";
  const [name, setName] = React.useState(initialName);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const email = user?.email ?? "—";

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update profile");
      }
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Profile"
      description="Your identity across NUSWORD documents."
      icon="person"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email">
          <input
            type="email"
            value={email}
            disabled
            readOnly
            className="h-10 w-full cursor-not-allowed rounded border border-outline-variant bg-surface-container-low px-3 text-body-ui-md text-on-surface-variant"
          />
        </Field>

        <Field label="Display name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            placeholder="Your name"
            className="h-10 w-full rounded border border-outline-variant bg-surface px-3 text-body-ui-md text-on-surface transition-colors focus:border-primary focus:outline-none"
          />
        </Field>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-label-ui-sm text-on-surface-variant">
          {isDevMode
            ? "Dev mode — profile edits are not persisted."
            : "Email changes require signing out and re-signing up."}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || name === initialName || name.trim().length === 0}
          className="flex cursor-pointer items-center gap-2 rounded bg-primary px-4 py-2 text-body-ui-md text-on-primary transition-colors hover:bg-primary-container disabled:cursor-wait disabled:opacity-50"
        >
          <Icon
            name={saving ? "progress_activity" : "save"}
            size={16}
            className={saving ? "animate-spin" : ""}
          />
          Save changes
        </button>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Preferences                                                          */
/* ------------------------------------------------------------------ */

function PreferencesSection() {
  const [theme, setTheme] = useStoredTheme();
  const [pageSize, setPageSize] = useLocalStorage<PaperSizeKey>(
    "nusword-default-page-size",
    "A4",
  );
  const [font, setFont] = useLocalStorage<string>(
    "nusword-default-font",
    "Source Serif 4",
  );

  return (
    <SectionCard
      title="Preferences"
      description="Defaults applied to new documents and the editor canvas."
      icon="tune"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Theme">
          <SegmentedControl
            value={theme}
            onChange={(v) => setTheme(v as ThemeKey)}
            options={[
              { value: "light", label: "Light", icon: "light_mode" },
              { value: "dark", label: "Dark", icon: "dark_mode" },
              { value: "system", label: "System", icon: "brightness_auto" },
            ]}
          />
        </Field>

        <Field label="Default page size">
          <Select
            value={pageSize}
            onChange={(v) => setPageSize(v as PaperSizeKey)}
            options={Object.entries(PAPER_SIZES).map(([key, def]) => ({
              value: key as PaperSizeKey,
              label: def.label,
            }))}
          />
        </Field>

        <Field label="Default body font">
          <Select
            value={font}
            onChange={setFont}
            options={DEFAULT_FONTS.map((f) => ({ value: f, label: f }))}
          />
        </Field>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Keyboard shortcuts                                                   */
/* ------------------------------------------------------------------ */

function ShortcutsSection() {
  const groups = React.useMemo(() => {
    const byGroup: Record<string, typeof KEYBOARD_SHORTCUTS> = {};
    for (const sc of KEYBOARD_SHORTCUTS) {
      (byGroup[sc.group] ??= []).push(sc);
    }
    return byGroup;
  }, []);

  return (
    <SectionCard
      title="Keyboard Shortcuts"
      description="Speed up your workflow. Mac users: swap Ctrl for ⌘ Cmd."
      icon="keyboard"
    >
      <div className="space-y-6">
        {Object.entries(groups).map(([group, shortcuts]) => (
          <div key={group}>
            <h3 className="text-label-ui-sm mb-2 uppercase tracking-wider text-on-surface-variant">
              {group}
            </h3>
            <ul className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant">
              {shortcuts.map((sc) => (
                <li
                  key={sc.keys}
                  className="flex items-center justify-between gap-4 px-4 py-2.5"
                >
                  <span className="text-body-ui-md text-on-surface">
                    {sc.description}
                  </span>
                  <kbd className="text-mono-ui rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-on-surface-variant">
                    {sc.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

function AboutSection() {
  return (
    <SectionCard
      title="About"
      description="NUSWORD — write, design, publish, print."
      icon="info"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <KeyValue label="Version" value={`v${NUSWORD_VERSION}`} />
        <KeyValue label="Schema version" value="Document v1 · Book v1" />
        <KeyValue
          label="Documentation"
          value={
            <a
              href="https://github.com/nusword/nusword"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              github.com/nusword
              <Icon name="open_in_new" size={14} />
            </a>
          }
        />
        <KeyValue
          label="Report an issue"
          value={
            <a
              href="https://github.com/nusword/nusword/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Issue tracker
              <Icon name="open_in_new" size={14} />
            </a>
          }
        />
      </div>
      <p className="text-label-ui-sm mt-6 text-on-surface-variant">
        Built with Next.js, Prisma, Tiptap, and the NUSWORD design system.
      </p>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-label-ui-sm mb-1.5 block uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      {children}
    </label>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low/40 px-4 py-3">
      <div className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
        {label}
      </div>
      <div className="text-body-ui-md mt-1 text-on-surface">{value}</div>
    </div>
  );
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; icon: string }>;
}) {
  return (
    <div className="flex rounded-lg border border-outline-variant bg-surface-container-low p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-body-ui-md transition-colors",
            value === opt.value
              ? "bg-surface text-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <Icon name={opt.icon} size={16} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded border border-outline-variant bg-surface px-3 pr-9 text-body-ui-md text-on-surface transition-colors focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="arrow_drop_down"
        size={20}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* localStorage hook                                                    */
/* ------------------------------------------------------------------ */

function useLocalStorage<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [stored, setStored] = React.useState<T>(fallback);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setStored(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
  }, [key]);

  const setValue = React.useCallback(
    (v: T) => {
      setStored(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* ignore quota */
      }
    },
    [key],
  );

  return [stored, setValue];
}
