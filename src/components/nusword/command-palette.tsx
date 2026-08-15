"use client";

/**
 * CommandPalette — PRD §10 power-user command palette.
 *
 * Opens with Ctrl/Cmd+K (registered in `useKeyboardShortcuts`). The open
 * state lives in the Zustand UI store (`commandPaletteOpen`) so any part
 * of the app can toggle it.
 *
 * Uses the shadcn `Command` primitive (cmdk) for fuzzy search + keyboard
 * navigation, rendered inside a Radix Dialog. Commands span navigation,
 * document/book creation, editor actions, and quick switching via the
 * `useDocuments()` / `useBooks()` TanStack Query hooks.
 *
 * Design system: bg-surface / border-outline-variant / text-on-surface,
 * rounded-lg soft-modular shape, Material Symbols icons via <Icon />.
 */
import * as React from "react";

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Icon } from "./icon";
import { useNuswordStore } from "@/stores/nusword-store";
import { useDocuments, useCreateDocument } from "@/hooks/use-documents";
import { useBooks, useCreateBook } from "@/hooks/use-books";
import { toast } from "sonner";

export function CommandPalette() {
  const open = useNuswordStore((s) => s.commandPaletteOpen);
  const setOpen = useNuswordStore((s) => s.setCommandPaletteOpen);

  const view = useNuswordStore((s) => s.view);
  const editorMode = useNuswordStore((s) => s.editorMode);
  const exitToDashboard = useNuswordStore((s) => s.exitToDashboard);
  const setDashboardNav = useNuswordStore((s) => s.setDashboardNav);
  const openDocument = useNuswordStore((s) => s.openDocument);
  const openBook = useNuswordStore((s) => s.openBook);
  const setEditorMode = useNuswordStore((s) => s.setEditorMode);
  const toggleFindReplace = useNuswordStore((s) => s.toggleFindReplace);
  const setExportDialogOpen = useNuswordStore((s) => s.setExportDialogOpen);

  const { data: documents = [] } = useDocuments();
  const { data: books = [] } = useBooks();
  const createDocument = useCreateDocument();
  const createBook = useCreateBook();

  // Close-on-select helper: runs the action, then closes the palette.
  // Wrapped in useCallback so cmdk's item onSelect identity is stable.
  const close = React.useCallback(() => setOpen(false), [setOpen]);
  const run = React.useCallback(
    (fn: () => void) => {
      return () => {
        try {
          fn();
        } finally {
          close();
        }
      };
    },
    [close],
  );

  const goToDashboard = React.useCallback(
    (section: string) =>
      run(() => {
        exitToDashboard();
        setDashboardNav(section);
      }),
    [exitToDashboard, run, setDashboardNav],
  );

  const handleNewDocument = React.useCallback(
    () =>
      run(() => {
        createDocument.mutate(
          { title: "Untitled" },
          {
            onSuccess: (doc) => {
              openDocument(doc.id, doc.title);
              toast.success("New document created");
            },
            onError: () => toast.error("Failed to create document"),
          },
        );
      }),
    [createDocument, openDocument, run],
  );

  const handleNewBook = React.useCallback(
    () =>
      run(() => {
        createBook.mutate(
          { title: "Untitled Book" },
          {
            onSuccess: (book) => {
              openBook(book.id, book.title);
              toast.success("New book created");
            },
            onError: () => toast.error("Failed to create book"),
          },
        );
      }),
    [createBook, openBook, run],
  );

  const handleTogglePreview = React.useCallback(
    () =>
      run(() => {
        if (view !== "editor") {
          toast.message("Open a document to toggle preview");
          return;
        }
        setEditorMode(editorMode === "edit" ? "preview" : "edit");
      }),
    [editorMode, run, setEditorMode, view],
  );

  const handleToggleFindReplace = React.useCallback(
    () =>
      run(() => {
        if (view !== "editor") {
          toast.message("Open a document to use Find & Replace");
          return;
        }
        toggleFindReplace();
      }),
    [run, toggleFindReplace, view],
  );

  const handleExport = React.useCallback(
    () =>
      run(() => {
        if (view !== "editor") {
          toast.message("Open a document to export");
          return;
        }
        setExportDialogOpen(true);
      }),
    [run, setExportDialogOpen, view],
  );

  const handleOpenSettings = React.useCallback(
    () => goToDashboard("settings"),
    [goToDashboard],
  );

  // Recent items for quick switching (capped for the list height).
  const recentDocuments = React.useMemo(
    () => documents.slice(0, 6),
    [documents],
  );
  const recentBooks = React.useMemo(() => books.slice(0, 6), [books]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogHeader className="sr-only">
        <DialogTitle>Command Palette</DialogTitle>
        <DialogDescription>
          Search for a command or document to run.
        </DialogDescription>
      </DialogHeader>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden rounded-lg border border-outline-variant bg-surface p-0 text-on-surface shadow-lg sm:max-w-xl"
      >
        <Command
          loop
          className="rounded-lg bg-surface text-on-surface **:[data-slot=command-input-wrapper]:border-outline-variant"
        >
          <CommandInput placeholder="Type a command or search…" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Navigation */}
            <CommandGroup heading="Navigation">
              <CommandItem
                value="go to dashboard"
                onSelect={goToDashboard("recent")}
              >
                <Icon name="space_dashboard" size={18} />
                <span>Go to Dashboard</span>
              </CommandItem>
              <CommandItem
                value="go to recent"
                onSelect={goToDashboard("recent")}
              >
                <Icon name="history" size={18} />
                <span>Go to Recent</span>
              </CommandItem>
              <CommandItem
                value="go to templates"
                onSelect={goToDashboard("templates")}
              >
                <Icon name="dashboard_customize" size={18} />
                <span>Go to Templates</span>
              </CommandItem>
              <CommandItem
                value="go to organizations"
                onSelect={goToDashboard("organizations")}
              >
                <Icon name="groups" size={18} />
                <span>Go to Organizations</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Create */}
            <CommandGroup heading="Create">
              <CommandItem
                value="new document"
                onSelect={handleNewDocument}
                disabled={createDocument.isPending}
              >
                <Icon
                  name={createDocument.isPending ? "progress_activity" : "add"}
                  size={18}
                />
                <span>New Document</span>
                <CommandShortcut>Blank canvas</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="new book"
                onSelect={handleNewBook}
                disabled={createBook.isPending}
              >
                <Icon
                  name={createBook.isPending ? "progress_activity" : "menu_book"}
                  size={18}
                />
                <span>New Book</span>
                <CommandShortcut>Chapters + imposition</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            {/* Recent documents — quick switching */}
            {recentDocuments.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Recent Documents">
                  {recentDocuments.map((doc) => (
                    <CommandItem
                      key={doc.id}
                      value={`document ${doc.title}`}
                      onSelect={run(() => openDocument(doc.id, doc.title))}
                    >
                      <Icon name="description" size={18} />
                      <span className="truncate">
                        {doc.title || "Untitled"}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Recent books — quick switching */}
            {recentBooks.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Recent Books">
                  {recentBooks.map((book) => (
                    <CommandItem
                      key={book.id}
                      value={`book ${book.title}`}
                      onSelect={run(() => openBook(book.id, book.title))}
                    >
                      <Icon name="auto_stories" size={18} />
                      <span className="truncate">{book.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />

            {/* Editor actions */}
            <CommandGroup heading="Editor">
              <CommandItem
                value="toggle preview"
                onSelect={handleTogglePreview}
              >
                <Icon name="visibility" size={18} />
                <span>Toggle Preview</span>
                <CommandShortcut>⌘⇧P</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="toggle find replace"
                onSelect={handleToggleFindReplace}
              >
                <Icon name="find_in_page" size={18} />
                <span>Toggle Find &amp; Replace</span>
                <CommandShortcut>⌘F</CommandShortcut>
              </CommandItem>
              <CommandItem value="export" onSelect={handleExport}>
                <Icon name="download" size={18} />
                <span>Export</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Settings */}
            <CommandGroup heading="Settings">
              <CommandItem
                value="open settings"
                onSelect={handleOpenSettings}
              >
                <Icon name="settings" size={18} />
                <span>Open Settings</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
