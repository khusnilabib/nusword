# NUSWORD — Project Worklog

This file tracks all agent work for the NUSWORD project.

---
Task ID: 1
Agent: main
Task: Analyze PRD (`NUSWORD_PRD_Product_Architecture.docx`) and two design files (`design 1.zip`, `desgn 2.zip`), then implement Phase 1 (Foundation) UI without mock data.

Work Log:
- Extracted both design zips into `/home/z/my-project/upload/design1/` and `/home/z/my-project/upload/design2/`.
- Read `DESIGN.md` (identical in both) — NUSWORD design system: Deep Teal primary `#012425`, surface tier palette (lowest → highest), dual-typeface strategy (Hanken Grotesk for UI, Source Serif 4 for content, JetBrains Mono for technical, Amiri for Arabic), 4px baseline grid, "Soft-Modular" shapes (4px button radius, 8px cards), tonal-layer elevation (no heavy shadows), Material Symbols icons.
- Read `design1/code.html` — Document Editor view: top nav (doc name + save state + Share/Export), left sidebar (Outline/Pages tabs), centered paper canvas with top ruler + A4 paper (210×297mm), right sidebar (Typography/Layout properties), bottom status bar (page count, word count, zoom, RTL toggle).
- Read `design2/code.html` — Dashboard view: top nav (NUSWORD brand + search + notifications + avatar), left sidebar (Recent / Templates / Projects / Settings), main content (welcome heading + document grid with "New Document" card + document cards).
- Converted PRD `.docx` → markdown via pandoc. PRD §28 Roadmap: **Phase 1 — Foundation** = Monorepo, Next.js, auth, Supabase, design system, CI/CD, environments, observability, **basic dashboard and document CRUD**. §10 Editor UX = top bar / left outline / center canvas / right properties / bottom status bar.
- Decision: implement only the UI shell for Phase 1 (no backend, no mock data). Build two views — Dashboard and Editor — switchable via Zustand client state at the single `/` route (project constraint: only `/` is user-visible).

Stage Summary:
- Phase 1 UI scope = Dashboard (Design 2) + Document Editor (Design 1), empty states only.
- Design system to be encoded in `src/app/globals.css` (surface tiers, deep teal primary, dual fonts).
- Next: write design tokens → fonts/icons in layout → Zustand store + Material Symbols icon helper → Dashboard view → Editor view → wire `/` route.

---
Task ID: 1 (completion)
Agent: main
Task: Implement Phase 1 (Foundation) UI for NUSWORD — Dashboard + Document Editor, no mock data, responsive.

Work Log:
- Wrote `src/app/globals.css` — full NUSWORD design system: deep-teal primary (#012425), 8 surface tiers (lowest→highest), dual typeface tokens (Hanken Grotesk UI / Source Serif 4 content / JetBrains Mono technical / Amiri Arabic), soft-modular radii (4px default, 8px cards), tonal-layer elevation, Material Symbols baseline, dual-gradient ruler ticks (minor 10px + major 50px), hidden number-input spinners, contenteditable placeholder helper, light + dark palettes.
- Wrote `src/app/layout.tsx` — next/font for Hanken Grotesk, Source Serif 4, JetBrains Mono, Amiri; Material Symbols stylesheet link; NUSWORD metadata (title, description, keywords); lang="id".
- Wrote `src/stores/nusword-store.ts` — Zustand store: `view` ("dashboard"|"editor"), `activeDocName`, editor sidebar/properties tabs, `isRtl`, `zoom`, mobile sidebar overlay open states + setters.
- Wrote `src/components/nusword/icon.tsx` — Material Symbols `<Icon>` wrapper (variable FILL/wght/opsz via font-variation-settings).
- Wrote `src/components/nusword/dashboard-view.tsx` — Design 2: top nav (brand + search + notifications + account), left sidebar (Recent/Templates/Projects/Settings), time-aware greeting, "DOCUMENTS" grid with "New Document" card + empty-state slots + "No documents yet" helper. No mock document data.
- Wrote `src/components/nusword/editor-view.tsx` — Design 1: top nav (back + doc name + Saved + Share/Export + mobile menu/tune toggles), left sidebar (Outline/Pages tabs, empty states), center canvas (sticky ruler + A4 210×297mm paper with contenteditable title + body, zoom transform, RTL dir), right sidebar (Typography/Layout tabs, font/size/weight/line-height/alignment + page-size/orientation/margins/columns/bleed controls), bottom status bar (page/word/zoom/RTL, responsive). Word count bridges via custom event.
- Wrote `src/app/page.tsx` — switches between DashboardView and EditorView via Zustand `view` state (single `/` route constraint).
- Agent Browser verification: dashboard renders all elements (greeting, nav, New Document card); clicking New Document switches to editor; editor ruler/sidebars/paper/status-bar all present; Outline↔Pages and Typography↔Layout tabs switch; RTL toggle + zoom work; back button returns to dashboard; Material Symbols render as glyphs (not raw text, verified via computed widths 18-28px); contenteditable word count flows to status bar.
- Fixed two bugs found during verification: (1) ruler collapsed to 1px height because flex-col main shrank it (paper has min-h-[297mm]) — added `shrink-0`; (2) redundant sidebar-width filler divs made ruler too narrow — removed them.
- Made editor responsive per DESIGN.md "Mobile Adaptation": sidebars become slide-in overlays (translate-x) with backdrop on <md; top nav gains menu/tune icon buttons; canvas becomes overflow-auto so the 210mm paper is horizontally scrollable; status bar hides word count and zoom +/- on small screens.

Stage Summary:
- Phase 1 UI complete: Dashboard (Design 2) + Document Editor (Design 1), both empty-state only (no mock data).
- Design system encoded in `globals.css` (deep-teal palette + dual typeface + surface tiers).
- Files: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/stores/nusword-store.ts`, `src/components/nusword/{icon,dashboard-view,editor-view}.tsx`.
- Verified: desktop dashboard + editor golden path, mobile responsive overlays, no runtime errors, lint passes (1 expected warning for Material Symbols font link).
- Next phases (not in scope): Phase 2 = Tiptap editor + structured doc schema + autosave; Phase 3 = pagination renderer; Phase 4 = export.

---
Task ID: 2
Agent: main
Task: Implement Phase 2 (Core Editor) — Tiptap/ProseMirror integration, structured document schema, autosave, versions, blocks, tables, images, search, page settings.

Work Log:
- Installed Tiptap v3 packages: @tiptap/react, @tiptap/pm, @tiptap/starter-kit, extension-text-align, extension-table (+row/header/cell), extension-image, extension-link, extension-placeholder, extension-typography, extension-underline, extension-text-style, extension-color, extension-highlight.
- Wrote `prisma/schema.prisma` — Document model (id, title, content as Tiptap JSON string, settings as PageSettings JSON string, soft-delete via deletedAt) + DocumentVersion model (immutable snapshots with version number + message). Ran `db:push`.
- Wrote `src/types/document.ts` — canonical document model: PageSettings interface (pageSize, orientation, margins, bleed, columns, languageDirection, typography), PAPER_SIZES map, resolvePaperDimensions(), DEFAULT_PAGE_SETTINGS, NuswordDocument + NuswordDocumentVersion DTOs, SaveState type.
- Wrote `src/lib/nusword/serialize.ts` — parse/stringify helpers for Tiptap JSON + PageSettings, countWords(), toDocumentDto()/toVersionDto() Prisma→DTO converters.
- Wrote API routes: `GET/POST /api/documents` (list + create), `GET/PATCH/DELETE /api/documents/[id]` (get + autosave + soft-delete), `GET/POST/PUT /api/documents/[id]/versions` (list + create snapshot + restore). All use Zod validation at boundary.
- Wrote `src/hooks/use-documents.ts` — TanStack Query hooks: useDocuments (list), useDocument (single), useCreateDocument, useUpdateDocument (autosave), useDeleteDocument, useDocumentVersions, useCreateVersion, useRestoreVersion. All mutations unwrap API response envelopes and update query cache.
- Wrote `src/hooks/use-autosave.ts` — debounced autosave (1.5s after last change): tracks draft signature, flushes via useUpdateDocument mutation, exposes saveState (idle/saving/saved/error) + manual flush(), flushes on beforeunload.
- Wrote `src/components/providers/query-provider.tsx` — React Query client provider. Added to layout.tsx alongside Sonner toaster.
- Wrote `src/components/nusword/editor/nusword-editor.tsx` — Tiptap editor with StarterKit (heading 1-3, lists, blockquote, code block, hr), TextAlign, Underline, Link, Image (base64 upload), Placeholder, Typography, Highlight, TextStyle, Color, Table (resizable). Formatting toolbar with undo/redo, headings, inline formatting, lists, alignment, link/image/table insertion. Exposes editor via onReady callback + editorRef. Fixed Tiptap v3 issues: `immediatelyRender: true`, disabled StarterKit's built-in Link/Underline to avoid duplicate extension errors, used named imports for `{TextStyle}` and `{Table}` (no default exports in v3).
- Wrote `src/components/nusword/editor/find-replace.tsx` — find & replace panel: searches Tiptap doc text nodes, highlights matches, step through with prev/next, replace current / replace all, match-case toggle.
- Wrote `src/lib/nusword/outline.ts` — extractOutline() walks Tiptap JSON for heading nodes, returns {id, level, text} entries with slugified ids for scroll-to-heading. countWordsInDoc() for word count.
- Wrote `src/lib/nusword/time.ts` — relativeTime() (Indonesian locale via date-fns) + absoluteDateTime() for version timestamps.
- Rewrote `src/components/nusword/dashboard-view.tsx` — wired to real data: useDocuments() for list, useCreateDocument() for New Document, useDeleteDocument() for trash, search filter, document cards show title + page-size badge + relative time + word count, loading skeletons, empty state, no-results state.
- Rewrote `src/components/nusword/editor-view.tsx` — full Phase 2 integration: loads document via useDocument(), local draft state (title + content + settings), autosave via useAutosave(), Tiptap editor with key={documentId} for per-doc remount, title input (separate from body, stored as metadata), page settings wired to Layout panel (paper dimensions/margins/columns update in real-time + persist), outline panel (headings extracted from Tiptap doc, click to scroll), pages panel (estimated page count), versions panel (save/list/restore), find & replace panel, status bar (word count + page estimate + zoom + RTL). Responsive mobile overlays retained.
- Added ProseMirror content styling to globals.css (.nusword-prose): Source Serif 4 font, heading scale (H1 36px, H2 24px, H3 20px), lists, blockquote, code blocks, tables, images, text alignment, search highlights, toolbar buttons.
- Updated `src/stores/nusword-store.ts` — replaced activeDocName with activeDocumentId + activeDocTitle, added showFindReplace state, openDocument(id, title) sets both view + active id.
- Bug fixes during verification: (1) useCreateDocument returned `{document}` envelope but caller treated it as `NuswordDocument` directly — fixed all mutation hooks to unwrap `.then(r => r.document)`. (2) Tiptap v3 `@tiptap/extension-text-style` and `@tiptap/extension-table` have no default export — switched to named imports. (3) StarterKit v3 includes Link + Underline — disabled them in StarterKit config to avoid duplicate extension warnings. (4) `immediatelyRender` warning — added `immediatelyRender: true` since editor is client-only. (5) `editorInstance` used in EditorCanvas but defined in EditorShell — passed as prop.

Stage Summary:
- Phase 2 complete: Tiptap rich-text editor with structured JSON content, autosave (debounced 1.5s with saving/saved/error states), version history (create + restore immutable snapshots), blocks (headings/paragraphs/lists/quotes/code/tables/images/links), find & replace, page settings (paper size A4/A5/B5/Letter/Legal/F4/Custom, orientation, margins, bleed, columns, RTL direction — all persisted), outline panel (live heading extraction + click-to-scroll), word count + page estimation, dashboard with real document CRUD + search + delete.
- Architecture: canonical document model (Tiptap JSON content + PageSettings JSON) stored in Prisma/SQLite, API routes with Zod validation, TanStack Query for server state, Zustand for UI state, debounced autosave hook.
- Verified via Agent Browser: create document → editor loads → type text → heading insertion → outline updates → autosave persists to DB → version save → find/replace works → page size change (A4→A5) applies + persists → dashboard shows real documents with metadata.
- Next phases: Phase 3 = deterministic pagination renderer; Phase 4 = PDF/DOCX/SVG/PNG export; Phase 5 = book engine; Phase 6 = kitab/RTL; Phase 8 = AI.

---
Task ID: 3
Agent: main
Task: Implement Phase 3 (Paper & Layout) — deterministic pagination engine, multi-page preview, headers/footers, page numbering, page thumbnails, page break support.

Work Log:
- Extended `src/types/document.ts` PageSettings with: `gutterMm` (binding gutter), `mirrorMargins` (book binding), `header`/`footer` (HeaderFooterConfig with enabled + left/center/right text slots), `pageNumberFormat` (decimal/roman/none), `pageNumberStart`, `differentFirstPage` (suppress header/footer on first page). Updated DEFAULT_PAGE_SETTINGS.
- Wrote `src/lib/nusword/pagination.ts` — deterministic pagination engine (PURE function, no DOM): `paginateDocument()` takes Tiptap doc + block height measurements + content area height, returns PaginatedPage[] with blocks distributed across pages. Rules: explicit page breaks force new page, blocks that don't fit start new page, headings have keep-with-next (widow/orphan control), overflow blocks tracked as warnings. Also: `pageContentArea()` (computes px dimensions from mm settings), `formatPageNumber()` (decimal/roman), `resolveTemplate()` (replaces {{page}}/{{pages}}/{{title}}), MM_TO_PX / PT_TO_PX constants.
- Wrote `src/components/nusword/editor/page-break.ts` — custom Tiptap block node for explicit page breaks. Renders as a visible dashed divider labelled "Page Break" in the editor; the pagination engine treats it as a hard page boundary. Added `setPageBreak` command.
- Wrote `src/hooks/use-pagination.ts` — measurement + pagination hook: renders each top-level Tiptap block into a hidden measurement container (sized to exact page content width), measures offsetHeight + margins via DOM, passes measurements to `paginateDocument()`. Debounced via requestAnimationFrame. Re-measures on content/settings change and image load.
- Wrote `src/components/nusword/editor/preview-canvas.tsx` — multi-page preview renderer: renders paginated document as stacked paper sheets, each with header (left/center/right slots with template variables resolved), content area (read-only HTML via generateHTML), footer (with page numbering). Shows layout warnings. Clicking a page sets it active.
- Wrote `src/components/nusword/editor/page-thumbnails.tsx` — sidebar thumbnail panel: renders scaled-down mini previews of each paginated page with page number labels. Clicking a thumbnail switches to preview mode and navigates to that page. Shows page count + warning count.
- Updated `src/stores/nusword-store.ts` — added `editorMode` ("edit" | "preview"), `activePageIndex`, and their setters. `openDocument` resets to edit mode + page 0.
- Updated `src/components/nusword/editor-view.tsx`:
  - EditorShell now runs usePagination hook, passes results to sidebar thumbnails + status bar + preview.
  - EditorTopNav: added Edit/Preview segmented toggle (shows page count in Preview label).
  - EditorLeftSidebar: Pages tab now renders PageThumbnails (replaces the old estimated-pages heuristic).
  - EditorCanvas: accepts onMeasureNonce, re-measures pagination after images load (capture-phase load listener).
  - EditorStatusBar: uses real totalPages from pagination (not estimated).
  - LayoutPanel: added Gutter, Page Number Start, Page Number Format (decimal/roman/none), Different First Page toggle, Header editor (collapsible: enable toggle + left/center/right text fields with template variable hints), Footer editor (same).
- Registered PageBreak extension in `nusword-editor.tsx` + added "Insert page break" toolbar button.
- Added CSS in `globals.css`: page break node styling (dashed divider with label), preview page styling (paper shadow, header/footer absolute positioning), thumbnail styling (border, hover/active states, scaled content).
- Bug fixes during verification: (1) useNuswordStore hooks called after early return in EditorShell — moved before the isLoading/isError guards. (2) React.useMemo called after early return in PageBlocks — moved before the conditional return.

Stage Summary:
- Phase 3 complete: deterministic pagination engine (pure function, independent of UI rendering per PRD §14), DOM-based block measurement, multi-page preview mode with headers/footers/page numbering, page thumbnails in sidebar, explicit page break node, gutter + page number format + different-first-page support.
- Architecture: pagination engine is a pure function (testable, deterministic), measurement is a separate concern (DOM-based via hidden container), preview rendering uses generateHTML for read-only output. This separation satisfies PRD §14: "Keep pagination independent from UI rendering so exported output is deterministic."
- Verified via Agent Browser: opened document → inserted 30 paragraphs → pagination computed 30 pages → preview mode rendered 30 stacked paper sheets with "1 / 30" ... "30 / 30" footers → sidebar showed 30 thumbnails → clicking thumbnail #5 navigated to page 5 → enabled header with "My Document Title" → header rendered on preview pages → inserted explicit page break → visible in editor.
- Next phases: Phase 4 = PDF/DOCX/SVG/PNG export (the pagination engine now provides the deterministic page list needed for export); Phase 5 = book engine; Phase 6 = kitab/RTL.

---
Task ID: 4
Agent: main
Task: Implement Phase 4 (Export) — PDF/DOCX/HTML export, export job system, preflight checks, print presets, download.

Work Log:
- Installed `pdfkit` (PDF generation) and `docx` (DOCX generation) npm packages.
- Added `ExportJob` model to Prisma schema: id, documentId, format, preset, status (pending/processing/completed/failed), artifactPath, artifactSize, checksum (SHA-256), preflightReport (JSON), errorMessage, createdAt, completedAt, expiresAt (7-day retention). Ran `db:push`.
- Wrote `src/lib/nusword/preflight.ts` — preflight checker: runs before export to detect empty content, overflow, blank pages, margin/bleed issues, font size warnings, page count info. Returns structured PreflightReport with severity levels (info/warning/error) + summary.
- Wrote `src/lib/nusword/export/presets.ts` — export format definitions (PDF/DOCX/HTML with icons, extensions, MIME types) + print presets (Screen PDF 72 DPI, Standard Print 150 DPI, High Quality Print 300 DPI, Booklet, Custom) with imageQuality, embedFonts, includeBleed, dpi settings.
- Wrote `src/lib/nusword/export/pdf.ts` — PDF generation via pdfkit: creates multi-page PDF from paginated content. Each page gets correct dimensions (mm→pt), margins, header (left/center/right with template variables), content blocks (headings, paragraphs, lists, blockquotes, code blocks, horizontal rules, images, tables), footer (page numbers). Uses Helvetica built-in font.
- Wrote `src/lib/nusword/export/docx.ts` — DOCX generation via `docx` package: converts Tiptap JSON to DOCX structure. Maps heading levels, paragraphs (with bold/italic/underline/strike/code marks), bullet/numbered lists, blockquotes (with left border), code blocks (with shading), horizontal rules, page breaks, images (base64), tables (with header rows). Sets page size + margins from settings.
- Wrote `src/lib/nusword/export/html.ts` — standalone HTML export: generates complete HTML document with @page CSS rules for page size/margins, inline CSS for all block types, header/footer slots with template variables, paginated page sections. Print-ready (can be printed to PDF from any browser).
- Wrote API routes:
  - `POST /api/documents/[id]/export` — creates export job, runs preflight, generates artifact (PDF/DOCX/HTML), writes to disk, computes SHA-256 checksum, returns job + download URL + preflight report.
  - `GET /api/documents/[id]/export` — lists recent export jobs for a document.
  - `GET /api/export-jobs/[id]/download` — serves the artifact file with correct Content-Type + Content-Disposition headers.
- Wrote `src/components/nusword/export-dialog.tsx` — export dialog UI: format selection (PDF/DOCX/HTML cards), print preset selection (for PDF), preflight summary (issues with severity icons), export button (shows "Exporting…" spinner), export result (success banner with file size + download button), recent exports history (with download links + error states). Uses shadcn Dialog component.
- Wired Export button in editor top nav to open the ExportDialog, passing documentId, title, content, settings, and pagination data.
- Added `serverExternalPackages: ["pdfkit", "docx"]` to `next.config.ts` — these packages use fs/path at runtime and must not be bundled by Turbopack (their __dirname resolution breaks otherwise, causing ENOENT errors for pdfkit's font data files).
- Bug fix during verification: pdfkit's built-in font path resolution broke under Turbopack bundling (`ENOENT: no such file or directory, open '/ROOT/node_modules/pdfkit/js/data/Helvetica.afm'`). Fixed by adding pdfkit + docx to `serverExternalPackages` in next.config.ts so they run as native Node.js modules.

Stage Summary:
- Phase 4 complete: PDF/DOCX/HTML export with preflight, print presets, export job tracking (status, checksum, retention), download, and export history.
- Architecture: client sends paginated page list (from Phase 3 pagination engine) to server → server runs preflight → generates artifact → writes to disk → returns download URL. This satisfies PRD §14 (deterministic pagination independent of UI) and §16 (export creates a job with progress, artifact metadata, checksum, retention).
- Verified via Agent Browser + curl: PDF export (44.7 KB, valid PDF v1.3), DOCX export (8.8 KB), HTML export (2.9 KB). Download route serves files with correct MIME types. Export dialog shows preflight summary, export result with download button, and recent exports history.
- Next phases: Phase 5 = book engine (chapters, front/back matter, TOC, mirror margins, running headers, booklet/imposition); Phase 6 = kitab/RTL; Phase 8 = AI.
