/**
 * NUSWORD UI store — lightweight client state for Phase 1 (Foundation).
 * Holds the active workspace view ("dashboard" | "editor") and basic
 * editor UI toggles. No document data is held here in Phase 1 (UI-only).
 */
import { create } from "zustand";

export type NuswordView = "dashboard" | "editor";

export type EditorSidebarTab = "outline" | "pages";
export type EditorPropertiesTab = "typography" | "layout";

interface NuswordUiState {
  view: NuswordView;
  activeDocName: string;
  editorSidebarTab: EditorSidebarTab;
  editorPropertiesTab: EditorPropertiesTab;
  isRtl: boolean;
  zoom: number;
  /** Mobile-only: left (navigation) sidebar overlay open state */
  mobileLeftOpen: boolean;
  /** Mobile-only: right (properties) sidebar overlay open state */
  mobileRightOpen: boolean;

  setView: (view: NuswordView) => void;
  openEditor: (docName?: string) => void;
  exitToDashboard: () => void;
  setEditorSidebarTab: (tab: EditorSidebarTab) => void;
  setEditorPropertiesTab: (tab: EditorPropertiesTab) => void;
  toggleRtl: () => void;
  setZoom: (zoom: number) => void;
  setMobileLeftOpen: (open: boolean) => void;
  setMobileRightOpen: (open: boolean) => void;
}

export const useNuswordStore = create<NuswordUiState>((set) => ({
  view: "dashboard",
  activeDocName: "Untitled.docx",
  editorSidebarTab: "outline",
  editorPropertiesTab: "typography",
  isRtl: false,
  zoom: 100,
  mobileLeftOpen: false,
  mobileRightOpen: false,

  setView: (view) => set({ view }),
  openEditor: (docName) =>
    set({
      view: "editor",
      activeDocName: docName ?? "Untitled.docx",
      mobileLeftOpen: false,
      mobileRightOpen: false,
    }),
  exitToDashboard: () =>
    set({ view: "dashboard", mobileLeftOpen: false, mobileRightOpen: false }),
  setEditorSidebarTab: (editorSidebarTab) => set({ editorSidebarTab }),
  setEditorPropertiesTab: (editorPropertiesTab) => set({ editorPropertiesTab }),
  toggleRtl: () => set((s) => ({ isRtl: !s.isRtl })),
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(400, zoom)) }),
  setMobileLeftOpen: (mobileLeftOpen) => set({ mobileLeftOpen }),
  setMobileRightOpen: (mobileRightOpen) => set({ mobileRightOpen }),
}));
