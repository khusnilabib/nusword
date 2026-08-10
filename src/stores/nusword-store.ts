/**
 * NUSWORD UI store — client state for the workspace shell.
 *
 * Phase 2: now tracks the active document ID (server state lives in TanStack
 * Query). The store holds UI-only concerns: which view, which doc is open,
 * sidebar/properties tabs, zoom, RTL, mobile overlay open states, and the
 * find/replace panel visibility.
 */
import { create } from "zustand";

export type NuswordView = "dashboard" | "editor";

export type EditorSidebarTab = "outline" | "pages";
export type EditorPropertiesTab = "typography" | "layout";

interface NuswordUiState {
  view: NuswordView;
  /** The document currently open in the editor (null on dashboard). */
  activeDocumentId: string | null;
  /** Cache of the active doc title for the top nav (updated from query data). */
  activeDocTitle: string;
  editorSidebarTab: EditorSidebarTab;
  editorPropertiesTab: EditorPropertiesTab;
  isRtl: boolean;
  zoom: number;
  /** Mobile-only: left (navigation) sidebar overlay open state */
  mobileLeftOpen: boolean;
  /** Mobile-only: right (properties) sidebar overlay open state */
  mobileRightOpen: boolean;
  /** Find & replace panel visibility */
  showFindReplace: boolean;

  openDocument: (id: string, title?: string) => void;
  setActiveDocTitle: (title: string) => void;
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
}

export const useNuswordStore = create<NuswordUiState>((set) => ({
  view: "dashboard",
  activeDocumentId: null,
  activeDocTitle: "Untitled",
  editorSidebarTab: "outline",
  editorPropertiesTab: "typography",
  isRtl: false,
  zoom: 100,
  mobileLeftOpen: false,
  mobileRightOpen: false,
  showFindReplace: false,

  openDocument: (id, title) =>
    set({
      view: "editor",
      activeDocumentId: id,
      activeDocTitle: title ?? "Untitled",
      mobileLeftOpen: false,
      mobileRightOpen: false,
      showFindReplace: false,
    }),
  setActiveDocTitle: (activeDocTitle) => set({ activeDocTitle }),
  exitToDashboard: () =>
    set({
      view: "dashboard",
      activeDocumentId: null,
      mobileLeftOpen: false,
      mobileRightOpen: false,
      showFindReplace: false,
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
}));
