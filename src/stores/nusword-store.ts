/**
 * NUSWORD UI store — client state for the workspace shell.
 *
 * Phase 5: now supports a "book" view alongside "dashboard" and "editor".
 * The book view shows the chapter tree, front/back matter, and book settings.
 */
import { create } from "zustand";

export type NuswordView = "dashboard" | "editor" | "book";
export type EditorMode = "edit" | "preview";

export type EditorSidebarTab = "outline" | "pages" | "versions";
export type EditorPropertiesTab = "typography" | "layout";
export type BookSidebarTab = "chapters" | "front-matter" | "back-matter" | "settings";

interface NuswordUiState {
  view: NuswordView;
  /** The document currently open in the editor (null on dashboard). */
  activeDocumentId: string | null;
  /** Cache of the active doc title for the top nav (updated from query data). */
  activeDocTitle: string;
  /** The book currently open in the book view (null on dashboard). */
  activeBookId: string | null;
  activeBookTitle: string;
  /** Active chapter being edited within the book view. */
  activeChapterId: string | null;
  /** Edit vs Preview mode within the editor (PRD §3: preview). */
  editorMode: EditorMode;
  editorSidebarTab: EditorSidebarTab;
  editorPropertiesTab: EditorPropertiesTab;
  bookSidebarTab: BookSidebarTab;
  isRtl: boolean;
  zoom: number;
  mobileLeftOpen: boolean;
  mobileRightOpen: boolean;
  showFindReplace: boolean;
  activePageIndex: number;

  /**
   * Active section within the dashboard view (Recent / Shared / Templates /
   * Organizations / Settings). Lifted from local DashboardView state so the
   * command palette can navigate to a specific dashboard section.
   */
  dashboardNav: string;
  setDashboardNav: (key: string) => void;

  /**
   * Global command palette (Ctrl/Cmd+K) — PRD §10 power-user palette.
   * Open state lives in the store so the keyboard-shortcuts hook can
   * toggle it from anywhere in the /app route.
   */
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  /**
   * Export dialog open state. Lifted out of EditorShell local state so
   * the keyboard shortcuts hook (Ctrl/Cmd+P) can open it from anywhere.
   * Only meaningful while a document is open in the editor view.
   */
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;

  /**
   * Monotonic nonce bumped by Ctrl/Cmd+S. EditorShell watches this and
   * triggers an autosave flush + "Saved" toast. Using a nonce (instead of
   * a direct callback) keeps the shortcut hook decoupled from the editor
   * component lifecycle.
   */
  saveRequestNonce: number;
  requestSave: () => void;

  openDocument: (id: string, title?: string) => void;
  setActiveDocTitle: (title: string) => void;
  setEditorMode: (mode: EditorMode) => void;
  openBook: (id: string, title?: string) => void;
  setActiveBookTitle: (title: string) => void;
  setActiveChapterId: (id: string | null) => void;
  setBookSidebarTab: (tab: BookSidebarTab) => void;
  exitToDashboard: () => void;
  setEditorSidebarTab: (tab: EditorSidebarTab) => void;
  setEditorPropertiesTab: (tab: EditorPropertiesTab) => void;
  toggleRtl: () => void;
  setRtl: (rtl: boolean) => void;
  setZoom: (zoom: number) => void;
  setMobileLeftOpen: (open: boolean) => void;
  setMobileRightOpen: (open: boolean) => void;
  toggleFindReplace: () => void;
  setShowFindReplace: (open: boolean) => void;
  setActivePageIndex: (idx: number) => void;
}

export const useNuswordStore = create<NuswordUiState>((set) => ({
  view: "dashboard",
  activeDocumentId: null,
  activeDocTitle: "Untitled",
  activeBookId: null,
  activeBookTitle: "Untitled Book",
  activeChapterId: null,
  editorMode: "edit",
  editorSidebarTab: "outline",
  editorPropertiesTab: "typography",
  bookSidebarTab: "chapters",
  isRtl: false,
  zoom: 100,
  mobileLeftOpen: false,
  mobileRightOpen: false,
  showFindReplace: false,
  activePageIndex: 0,
  dashboardNav: "recent",
  commandPaletteOpen: false,
  exportDialogOpen: false,
  saveRequestNonce: 0,

  setDashboardNav: (dashboardNav) => set({ dashboardNav }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setExportDialogOpen: (exportDialogOpen) => set({ exportDialogOpen }),
  requestSave: () => set((s) => ({ saveRequestNonce: s.saveRequestNonce + 1 })),

  openDocument: (id, title) =>
    set({
      view: "editor",
      activeDocumentId: id,
      activeDocTitle: title ?? "Untitled",
      editorMode: "edit",
      mobileLeftOpen: false,
      mobileRightOpen: false,
      showFindReplace: false,
      activePageIndex: 0,
      exportDialogOpen: false,
    }),
  setActiveDocTitle: (activeDocTitle) => set({ activeDocTitle }),
  setEditorMode: (editorMode) => set({ editorMode }),
  openBook: (id, title) =>
    set({
      view: "book",
      activeBookId: id,
      activeBookTitle: title ?? "Untitled Book",
      activeChapterId: null,
      bookSidebarTab: "chapters",
      mobileLeftOpen: false,
      mobileRightOpen: false,
    }),
  setActiveBookTitle: (activeBookTitle) => set({ activeBookTitle }),
  setActiveChapterId: (activeChapterId) => set({ activeChapterId }),
  setBookSidebarTab: (bookSidebarTab) => set({ bookSidebarTab }),
  exitToDashboard: () =>
    set({
      view: "dashboard",
      activeDocumentId: null,
      activeBookId: null,
      activeChapterId: null,
      editorMode: "edit",
      mobileLeftOpen: false,
      mobileRightOpen: false,
      showFindReplace: false,
      activePageIndex: 0,
      exportDialogOpen: false,
    }),
  setEditorSidebarTab: (editorSidebarTab) => set({ editorSidebarTab }),
  setEditorPropertiesTab: (editorPropertiesTab) => set({ editorPropertiesTab }),
  toggleRtl: () => set((s) => ({ isRtl: !s.isRtl })),
  setRtl: (isRtl) => set({ isRtl }),
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(400, zoom)) }),
  setMobileLeftOpen: (mobileLeftOpen) => set({ mobileLeftOpen }),
  setMobileRightOpen: (mobileRightOpen) => set({ mobileRightOpen }),
  toggleFindReplace: () => set((s) => ({ showFindReplace: !s.showFindReplace })),
  setShowFindReplace: (showFindReplace) => set({ showFindReplace }),
  setActivePageIndex: (activePageIndex) => set({ activePageIndex }),
}));
