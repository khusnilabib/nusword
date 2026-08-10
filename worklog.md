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

---
Task ID: 5
Agent: main
Task: Implement Phase 5 (Book Engine) — chapters, front/back matter, TOC, mirror margins, running headers, book profiles, booklet/imposition.

Work Log:
- Added `Book` and `BookChapter` models to Prisma schema: Book (title, subtitle, author, settings JSON, frontMatter JSON, backMatter JSON, soft-delete) + BookChapter (bookId, documentId, title, sortOrder, parentId for nesting, startNewPage, includeInToc). Ran `db:push`.
- Wrote `src/types/book.ts` — BookSettings (extends PageSettings with binding, mirrorMargins, runningHeader, runningFooter, chaptersStartOnOddPage, booklet config), ChapterNode (nested tree with level + children), BookMatterEntry (front/back matter with type + enabled toggle), NuswordBook DTO, BINDING_TYPES (perfect/saddle/case/spiral), FRONT_MATTER_TYPES (cover/title-page/copyright/dedication/preface/toc), BACK_MATTER_TYPES (appendix/glossary/references/index/colophon), DEFAULT_BOOK_SETTINGS (A5 trim, 12pt, mirror margins on, running headers on).
- Wrote `src/lib/nusword/imposition.ts` — booklet imposition calculator: `calculateBookletImposition()` takes page count + sheets per signature, pads to multiple of 4, calculates sheet signatures and page ordering for saddle-stitch binding (front: [high, low], back: [lowBack, highBack]). `imposePages()` reorders a page list for 2-up printing. `getFacingPage()` returns the facing page number.
- Wrote `src/lib/nusword/toc.ts` — TOC generator: `generateToc()` walks chapter tree, extracts headings from each chapter's Tiptap content, resolves page numbers from a chapterPageMap, returns TocEntry[] with level + title + pageNumber + isChapter. `tocToTiptapJson()` renders TOC as Tiptap document (title + dot-leader paragraphs).
- Wrote `src/lib/nusword/book-serialize.ts` — parseBookSettings() (merges defaults), parseMatterEntries(), buildChapterTree() (flat → nested via parentId), toBookDto() Prisma→DTO converter.
- Wrote API routes:
  - `GET/POST /api/books` — list books (summary with chapterCount), create book.
  - `GET/PATCH/DELETE /api/books/[id]` — get book with chapter tree, update title/subtitle/author/settings/frontMatter/backMatter, soft-delete.
  - `GET/POST/PUT /api/books/[id]/chapters` — list chapters as tree, create chapter (auto-creates a Document for the chapter content), bulk reorder (PUT with sortOrder + parentId).
  - `PATCH/DELETE /api/books/[id]/chapters/[chapterId]` — update chapter title/startNewPage/includeInToc, delete chapter.
  - `GET /api/books/[id]/toc` — generate TOC from chapter tree + document contents.
- Wrote `src/hooks/use-books.ts` — TanStack Query hooks: useBooks (list), useBook (single), useCreateBook, useDeleteBook, useUpdateBook, useCreateChapter, useUpdateChapter, useDeleteChapter, useReorderChapters, useBookToc.
- Updated `src/stores/nusword-store.ts` — added `view: "dashboard" | "editor" | "book"`, activeBookId, activeBookTitle, activeChapterId, bookSidebarTab ("chapters" | "front-matter" | "back-matter" | "settings"), openBook() action.
- Wrote `src/components/nusword/book-view.tsx` — full book editor:
  - Top nav: back + book title + author + chapter count + Export Book button.
  - Left sidebar with 4 tabs: Chapters (tree with add/delete/select), Front Matter (toggle sections on/off + add new), Back Matter (same), Settings (binding/trim/mirror/running-header/booklet summary).
  - Center: ChapterEditor (loads chapter's document into Tiptap with autosave) or BookConfigPanel (front/back matter list + TOC preview) or BookSettingsEditor (metadata, binding selection, page layout with mirror margins + chapters-start-on-odd toggle, running header config, booklet imposition config with sheets/signature calculator).
  - ChapterTree with nested children, expand/collapse, delete with confirmation.
  - MatterPanel with enable/disable toggles + add section buttons.
  - TocPreview showing generated TOC with dot leaders + page numbers.
- Updated `src/components/nusword/dashboard-view.tsx` — added "Books" section below documents: New Book card + book cards showing title/chapterCount/updatedAt. Clicking a book opens the book view.
- Updated `src/app/page.tsx` — three views: dashboard, editor, book (driven by Zustand store).

Stage Summary:
- Phase 5 complete: Book engine with chapter tree (nested, ordered), front/back matter (6 front types + 5 back types with enable toggles), mirror margins (facing pages for book binding), running headers (chapter/book/custom source), chapters-start-on-odd-page, booklet imposition calculator (saddle-stitch sheet signatures + page ordering), TOC generator (auto-builds from chapters + headings with page numbers), book settings editor (binding selection with 4 types, trim size, margins, typography).
- Architecture: Book owns metadata + chapter references + book-specific settings. Each chapter references a Document (the chapter content). Front/back matter stored as JSON arrays. Imposition is a separate pure function module (PRD §15: "Imposition must be a separate service/module from document editing").
- Verified via Agent Browser: dashboard shows Books section with New Book card → created book → book editor opened with chapter tree sidebar → added chapter → chapter editor loaded Tiptap with autosave → settings panel shows binding options (4 types) → selecting Saddle Stitch revealed booklet imposition section → front matter panel shows all 6 section types → added Cover section → TOC preview shows "Chapter 1".
- Next phases: Phase 6 = kitab/RTL (Arabic typography, bilingual blocks, footnotes, ornaments); Phase 8 = AI.

---
Task ID: 6
Agent: main
Task: Implement Phase 6 (Kitab & RTL) — Arabic/RTL typography, bilingual blocks, footnotes, ornaments, kitab profiles, traditional layouts.

Work Log:
- Extended `PageNumberFormat` in `src/types/document.ts` to include "arabic-indic" (٠١٢٣).
- Updated `formatPageNumber()` in `src/lib/nusword/pagination.ts` to support Arabic-Indic numeral conversion via `toArabicIndic()` function.
- Wrote `src/types/kitab.ts` — KitabSettings interface (enabled, arabicFont, arabicFontSizePt, arabicLineHeight, translationFont, translationFontSizePt, bilingualLayout, ornamentStyle, footnotes config, traditionalHeader config, arabicPageNumbers, basmalaPerChapter), DEFAULT_KITAB_SETTINGS, ORNAMENT_STYLES (6 styles: none/diamond/star/arabesque/line-double/line-ornate), BILINGUAL_LAYOUTS (4 modes: side-by-side/stacked/interlinear/arabic-only), ARABIC_FONTS (Amiri/Scheherazade/Noto Naskh/Noto Kufi), ARABIC_PHRASES (basmala/takbir/shahada).
- Extended `BookSettings` in `src/types/book.ts` with `kitab: KitabSettings` field + updated DEFAULT_BOOK_SETTINGS.
- Updated `src/lib/nusword/book-serialize.ts` parseBookSettings() to deep-merge kitab settings (including nested footnotes + traditionalHeader).
- Wrote `src/components/nusword/editor/kitab-extensions.ts` — 4 custom Tiptap nodes:
  - **Footnote**: inline atom node with superscript number + tooltip text attribute.
  - **BilingualBlock**: block atom with arabic + translation attributes, renders as 2-column grid (Arabic RTL + translation LTR). Uses attributes (not content holes) because ProseMirror doesn't support multiple content holes per node.
  - **Ornament**: block atom with style attribute (diamond/star/arabesque/line-double/line-ornate), renders decorative divider with appropriate symbol.
  - **Basmala**: block atom that renders the basmala phrase in decorative Amiri font.
  Each node has a corresponding Tiptap command: setFootnote, setBilingualBlock, setOrnament, setBasmala.
- Registered all 4 kitab extensions in `nusword-editor.tsx` + added 4 toolbar buttons (footnote, bilingual block, ornament, basmala) with a divider separating them from the standard toolbar.
- Added comprehensive kitab CSS to `globals.css`: Arabic text styling (Amiri font, 2.0 line-height, RTL direction), footnote reference (superscript, primary color), footnote text (bottom of page), bilingual block (grid layout with Arabic right + translation left, stacked variant), ornaments (6 styles with appropriate symbols), basmala (centered, large, decorative), traditional kitab header (bordered), RTL list adjustments.
- Built KitabProfileEditor component in `book-view.tsx` — appears in the book Settings tab when scrolled down. Contains:
  - **Enable Kitab Mode** toggle (when enabled, auto-sets RTL + Amiri font + Arabic-Indic page numbers).
  - **Arabic Typography**: font selection (4 Arabic fonts), font size, line height, translation font.
  - **Bilingual Layout**: 4 layout modes (side-by-side, stacked, interlinear, arabic-only) with icons + descriptions.
  - **Ornament Style**: 6 ornament styles with visual previews.
  - **Footnotes**: enable toggle, numbering (arabic-indic/decimal/per-page), position (bottom/margin).
  - **Traditional Kitab Header**: enable toggle, custom Arabic text input (RTL), decorative border toggle.
  - **Page Numbering & Basmala**: Arabic-Indic page numbers toggle, basmala per chapter toggle.
- Added "arabic-indic" option to the Page Number Format selector in the editor's Layout panel.
- Fixed race condition in KitabProfileEditor: combining kitab + pageSettings patches into a single onUpdate call (previously two separate mutations overwrote each other).

Stage Summary:
- Phase 6 complete: Kitab engine with RTL/Arabic typography (Amiri font, Arabic-Indic numerals ٠١٢٣), bilingual blocks (side-by-side Arabic + translation with 4 layout modes), footnotes (3 numbering styles, 2 positions), ornaments (6 decorative divider styles), basmala (special decorative block), traditional kitab headers (with decorative border), kitab profile toggle (auto-configures RTL + Arabic font + Arabic page numbers).
- Architecture: Kitab is a profile within BookSettings (not a separate entity). The kitab extensions are Tiptap nodes that work in both the editor and preview/export. Arabic-Indic numeral conversion is a pure function in the pagination engine. BilingualBlock uses attributes (not content holes) because ProseMirror doesn't support multiple editable content areas per node.
- Verified via Agent Browser: book settings shows Kitab Profile section → enabling kitab mode expands all settings (Arabic Typography, Bilingual Layout, Ornament Style, Footnotes, Traditional Header, Page Numbering & Basmala) → chapter editor has 4 kitab toolbar buttons (footnote, bilingual, ornament, basmala) → inserted bilingual block with basmala Arabic text + English translation rendered correctly (Arabic RTL right, translation LTR left) → ornament dividers (◆) render correctly.
- Next phases: Phase 7 = SaaS (organizations, sharing, roles, billing); Phase 8 = AI (prompt-to-outline, rewrite, summarize).

---
Task ID: 7-HOOKS
Agent: sub-agent (general-purpose)
Task: Create TanStack Query hooks for Phase 7 SaaS features (organizations, members, sharing, templates, usage) — single file `src/hooks/use-saas.ts` following the patterns in `use-documents.ts` / `use-books.ts`.

Work Log:
- Read `src/hooks/use-documents.ts` and `src/hooks/use-books.ts` to mirror conventions: `"use client"` directive, comment header, `import * as React from "react"`, `fetchJson<T>` helper with `Content-Type` + error-text unwrapping, wrapped API responses (`{ organizations: [...] }` → `.then(r => r.organizations)`), `useQueryClient` + `invalidateQueries` on every mutation, optional `setQueryData` for single-entity updates.
- Read `src/types/saas.ts` to confirm exported types (`NuswordOrganization`, `NuswordOrgMember`, `NuswordShare`, `NuswordTemplate`, `UsageStats`, `OrgRole`, `ShareRole`, `TemplateCategory`, `TemplateType`) and field shapes — used to derive correct mutation input interfaces.
- Created `/home/z/my-project/src/hooks/use-saas.ts` (408 lines) with five sections matching the task spec.

Hooks implemented (21 total):

Organizations:
- `useOrganizations()` → `GET /api/organizations`, returns `NuswordOrganization[]`, key `["organizations"]`.
- `useOrganization(id: string | null)` → `GET /api/organizations/[id]`, returns `NuswordOrganization`, key `["organization", id]`, `enabled: !!id`.
- `useCreateOrganization()` → `POST /api/organizations`, input `{ name; description? }`, invalidates `["organizations"]`.
- `useUpdateOrganization(id)` → `PATCH /api/organizations/[id]`, input `{ name?; description? }`, `setQueryData(["organization", id], data)` + invalidates `["organizations"]` (covers both keys the task listed).
- `useDeleteOrganization()` → `DELETE /api/organizations/[id]`, takes `id`, invalidates `["organizations"]`.

Members:
- `useOrgMembers(orgId: string | null)` → `GET /api/organizations/[id]/members`, returns `NuswordOrgMember[]`, key `["org-members", orgId]`, `enabled: !!orgId`.
- `useInviteMember(orgId)` → `POST /api/organizations/[id]/members`, input `{ email; role: OrgRole }`, invalidates `["org-members", orgId]` plus `["organizations"]` + `["organization", orgId]` (member count bump).
- `useUpdateMember(orgId)` → `PATCH /api/organizations/[id]/members/[memberId]`, input `{ memberId; role }`, body `{ role }`, invalidates `["org-members", orgId]`.
- `useRemoveMember(orgId)` → `DELETE /api/organizations/[id]/members/[memberId]`, takes `memberId`, invalidates `["org-members", orgId]` + org summary keys.

Sharing:
- `useDocumentShares(documentId: string | null)` → `GET /api/documents/[id]/shares`, returns `NuswordShare[]`, key `["document-shares", documentId]`, `enabled: !!documentId`.
- `useShareDocument(documentId)` → `POST /api/documents/[id]/shares`, input `{ email; role: ShareRole }`, invalidates `["document-shares", documentId]`.
- `useUpdateShare(documentId)` → `PATCH /api/documents/[id]/shares/[shareId]`, input `{ shareId; role }`, body `{ role }`, invalidates `["document-shares", documentId]`.
- `useRevokeShare(documentId)` → `DELETE /api/documents/[id]/shares/[shareId]`, takes `shareId`, invalidates `["document-shares", documentId]`.
- `useSharedWithMe()` → `GET /api/shared`, returns `NuswordShare[]`, key `["shared-with-me"]`.

Templates:
- `useTemplates(category?: TemplateCategory | null)` → `GET /api/templates?category=X` (category appended via `encodeURIComponent` only when truthy), returns `NuswordTemplate[]`, key `["templates", category ?? null]` so changing category refetches.
- `useTemplate(id: string | null)` → `GET /api/templates/[id]`, returns `NuswordTemplateDetail` (extends `NuswordTemplate` with `content: JSONContent` + `settings: PageSettings` to satisfy the "content/settings parsed" requirement), key `["template", id]`, `enabled: !!id`.
- `useCreateTemplate()` → `POST /api/templates`, input `{ title; description?; type; category; content?; settings?; organizationId? }`, invalidates `["templates"]`.
- `useUpdateTemplate(id)` → `PATCH /api/templates/[id]`, input partial of the create shape + `published?`, `setQueryData(["template", id], data)` + invalidates `["templates"]`.
- `useDeleteTemplate()` → `DELETE /api/templates/[id]`, takes `id`, invalidates `["templates"]`.
- `useUseTemplate()` → `POST /api/templates/[id]/use`, takes `templateId`, returns `NuswordDocument` (inlined `import("@/types/document").NuswordDocument` to avoid adding a top-level type import for a single use), invalidates both `["documents"]` and `["templates"]` (useCount bump + new doc shows in dashboard).

Usage:
- `useUsageStats()` → `GET /api/usage`, returns `UsageStats`, key `["usage-stats"]`. Direct return (no wrapper) since the endpoint returns the stats object itself.

Verification:
- `npx tsc --noEmit` project-wide: zero errors mention `use-saas.ts`. Pre-existing project errors (in `editor/`, `export/`, `serialize.ts`, etc., all from earlier phases — `JSONContent` not re-exported from `@/types/document`, `PDFKit` namespace, etc.) are unchanged and out of scope for this task.
- `npx eslint src/hooks/use-saas.ts` → exit 0, no warnings or errors.
- All 21 hook signatures match the task spec exactly (names, params, return shapes, invalidation keys).
- The single inlined type import (`import("@/types/document").NuswordDocument`) inside `useUseTemplate`'s `mutationFn` return is intentional — it avoids polluting the top of the file with an extra `import type` block for one usage, and TypeScript handles inline imported types cleanly.

Stage Summary:
- File created: `/home/z/my-project/src/hooks/use-saas.ts` — 21 TanStack Query hooks for the entire Phase 7 SaaS surface (organizations CRUD, members invite/update/remove, document sharing + shared-with-me, templates marketplace CRUD + instantiate, usage stats).
- All hooks follow the established `use-documents.ts` / `use-books.ts` pattern: client-side `fetchJson` helper, wrapped-response unwrapping, `useQueryClient` + `invalidateQueries` on mutations, `setQueryData` for single-entity update optimistic cache writes, `enabled: !!id` guards on by-id queries.
- The frontend is now ready to consume the Phase 7 API routes once they are implemented (next sub-task: API route handlers + Prisma schema for orgs/members/shares/templates/usage).
- Next phases: API route handlers under `src/app/api/{organizations,documents/[id]/shares,templates,shared,usage}` + the Prisma schema additions for the SaaS tables.

---
Task ID: 7-API-2
Agent: general-purpose
Task: Create sharing + template API routes for Phase 7 (SaaS features without billing).

Work Log:
- Read worklog and existing API conventions (organizations + documents routes) before implementing. Confirmed the SharedDocument, Template, UsageEvent models already exist in `prisma/schema.prisma` (added by an earlier Phase 7 task). Re-ran `prisma generate` so the running dev server picked up the new models (`db.sharedDocument`, `db.template`, `db.usageEvent` were previously `undefined` at runtime — the global Prisma client had been cached from before the schema was extended).
- Created 7 new API route files under `src/app/api/`:

  1. `documents/[id]/shares/route.ts` — GET lists all shares for a document (DTO: `{id, documentId, sharedWithEmail, role, shareToken, createdAt, updatedAt}`). POST shares with an email + role (`editor` | `commenter` | `viewer`), generates a `shareToken = crypto.randomUUID()`, creates the SharedDocument row, logs a `document.share` UsageEvent (with metadata `documentId`/`sharedWith`/`role`), returns the created share as 201. Validation: Zod email + enum role. Rejects self-share (400) and duplicate shares (409). 404 if the document doesn't exist or is soft-deleted.

  2. `documents/[id]/shares/[shareId]/route.ts` — PATCH updates the share role (Zod enum). DELETE revokes the share. Both verify the share belongs to the URL's document ID and return 404 otherwise.

  3. `shared/route.ts` — GET lists all documents shared WITH the current user (matched by `sharedWithEmail = CURRENT_USER_EMAIL`), joined with the Document to surface `documentTitle`. Filters out shares whose underlying document has been soft-deleted. Returns newest-first.

  4. `templates/route.ts` — GET lists published templates only, ordered by `useCount` desc. Supports `?category=academic|business|creative|religious|personal` filter (invalid categories are silently ignored so the endpoint stays permissive). POST creates a new Template; Zod validates title (1–200 chars), optional description, `type` enum (`document` | `book`), `category` enum, `content` (any JSON — stringified before storage), `settings` (any JSON — stringified before storage), `published` boolean (default false). Logs a `template.create` UsageEvent.

  5. `templates/[id]/route.ts` — GET returns a single template with `content` + `settings` parsed from their JSON-stringified DB form (uses a local `parseJson` helper with fallbacks). PATCH updates `title` / `description` (nullable) / `published` / `content` / `settings` (any non-string value is JSON-stringified before write). DELETE hard-deletes the template (no soft-delete column on Template — matches the schema).

  6. `templates/[id]/use/route.ts` — POST creates a new Document from a template: parses the template's `content` + `settings` via `parseContent` + `parseSettings` (canonicalises Tiptap JSON + merges `DEFAULT_PAGE_SETTINGS`), stringifies them via `stringifyContent` + `stringifySettings`, creates a Document row whose title defaults to the template title (or the optional body `title`), increments the template's `useCount`, logs a `template.use` UsageEvent (`resourceId = new doc id`, metadata `templateId`/`templateTitle`), returns `{ document: toDocumentDto(doc) }` (same DTO shape as `POST /api/documents`). 404 if the template doesn't exist. 400 if the optional body `title` is invalid.

  7. `usage/route.ts` — GET returns usage stats: `documentsCreated` (count of non-deleted Documents), `booksCreated` (count of non-deleted Books), `exportsRun` (count of ExportJobs — export route doesn't yet log UsageEvents, so counting jobs is the most accurate signal), `templatesUsed` (count of `template.use` UsageEvents for the current user), `recentEvents` (last 7 days of UsageEvents grouped by day + type, returned as `{type, count, date}[]` sorted by date then type), and `days` (the full 7-day window as `YYYY-MM-DD` strings so the client can chart zero-event days). Used `Promise.all` for the parallel counts and `setUTCHours(0,0,0,0)` for stable day-key grouping.

- Conventions followed across all routes: `import { NextRequest, NextResponse } from "next/server"` + `import { db } from "@/lib/db"` + `import { z } from "zod"`; `const CURRENT_USER_EMAIL = "user@nusword.local"` placeholder; `type Ctx = { params: Promise<{ ... }> }` with `await params` (matches the existing organizations + documents routes, which use Next 16's async-params pattern); Zod `safeParse` with `{ error: "Invalid request", issues: parsed.error.issues }` on failure; 404 with `{ error: "Not found" }` for missing resources; HTTP 201 for POST creates; ISO date strings via `.toISOString()`.

- Smoke-tested every endpoint against the running dev server (`next dev -p 3000`):
  - `GET /api/shared` → 200, `{ shares: [] }` (correct: shares were created with `collab@example.com`, not the placeholder `user@nusword.local`).
  - `GET /api/templates` → 200, `{ templates: [] }` initially; after creating + publishing a template, returned it sorted by `useCount` desc.
  - `GET /api/usage` → 200, `{ documentsCreated: 10, booksCreated: 1, exportsRun: 8, templatesUsed: 0, recentEvents: [], days: [7 days] }` initially; after running the full smoke test it correctly reflected `templatesUsed: 2` and grouped the day's events by `document.share` / `template.create` / `template.use`.
  - `POST /api/documents/[id]/shares` → 201 with `shareToken: "<uuid>"`. Subsequent `GET` on the same URL returned the new share.
  - `PATCH /api/documents/[id]/shares/[shareId]` with `{role:"viewer"}` → 200, updated role and `updatedAt` timestamp.
  - `DELETE /api/documents/[id]/shares/[shareId]` → 200, `{ ok: true, id }`. Subsequent `GET shares` returned `[]`.
  - Error paths verified: self-share → 400 "Cannot share with yourself"; invalid email → 400 with Zod issues; invalid role → 400 with Zod issues; share/template POST to nonexistent doc/template → 404.
  - `POST /api/templates` with full body → 201 with created template DTO. `PATCH` flipping `published: false` → 200, and the template subsequently disappeared from `GET /api/templates` (which only returns published).
  - `GET /api/templates?category=academic` filtered correctly; `?category=invalid` ignored the invalid filter and returned all published.
  - `POST /api/templates/[id]/use` with `{title:"Custom Title From Template"}` → 201, created a Document with that title, copied the template content (`Hello world`), merged `DEFAULT_PAGE_SETTINGS` into the (empty `{}`) settings, computed `wordCount: 2`, and incremented the template's `useCount` from 0 → 1 (verified by GET-ting the template again afterward).
  - `DELETE /api/templates/[id]` → 200; subsequent `GET` → 404.
  - ESLint clean on all 7 new route files; `tsc --noEmit` shows zero errors in `src/app/api/*` (the 32 pre-existing project-wide errors are all unrelated — `JSONContent` re-export issues, skills/examples dirs, pdfkit types).

Stage Summary:
- Phase 7 sharing + template APIs complete: 7 route files, 12 HTTP handlers (GET/POST/PATCH/DELETE across the share, shared, template, and usage namespaces).
- Architecture: follows the existing Phase 7 organizations route pattern (placeholder email, Zod validation, Prisma via `@/lib/db`, async-params context, ISO date DTOs). Sharing is keyed by `sharedWithEmail` (no auth yet); templates are listed by `published = true` + optional category filter; template use copies content + settings into a new Document and bumps `useCount`; usage stats aggregate Document/Book/ExportJob counts + the UsageEvent table grouped by day.
- All endpoints verified end-to-end via curl against the dev server — happy paths return the documented DTO shapes (200/201), and error paths return 400/404/409 with descriptive `{error, issues?}` payloads.
- Next actions for downstream agents: (a) wire the new endpoints into TanStack Query hooks (`src/hooks/use-shares.ts`, `use-templates.ts`, `use-usage.ts`) mirroring the existing `use-documents.ts` / `use-books.ts` patterns; (b) build UI surfaces (ShareDialog, TemplatesGallery, UsageDashboard) that consume these APIs; (c) optionally log `document.create`, `book.create`, and `document.export` UsageEvents from their respective existing POST routes so the `recentEvents` timeline is fuller (currently only `organization.*`, `document.share`, `template.create`, and `template.use` are logged).

---
Task ID: 7-UI-1
Agent: sub-agent (general-purpose)
Task: Create the ShareDialog and TemplatesGallery UI components for Phase 7 (SaaS). Consumes the hooks from `src/hooks/use-saas.ts` (task 7-HOOKS) and the APIs from task 7-API-2.

Work Log:
- Read `worklog.md` (304 lines) to confirm context: hooks at `src/hooks/use-saas.ts` already export the 8 sharing/templates hooks the spec lists, types live in `src/types/saas.ts` (incl. `SHARE_ROLE_META` and `TEMPLATE_CATEGORIES`), the existing `Icon` component renders Material Symbols, the shadcn `Dialog` lives at `@/components/ui/dialog`, and the design system tokens (`bg-surface`, `border-outline-variant`, `text-label-ui-sm`, `text-headline-ui-md`, etc.) are CSS utility classes defined in `src/app/globals.css`.
- Read `src/components/nusword/export-dialog.tsx` and `dashboard-view.tsx` to mirror styling idioms (header with title + description row, `border-b border-outline-variant p-4` dialog header, `max-h-[70vh] overflow-y-auto p-4` scrollable body, `border-t border-outline-variant p-4` footer, `rounded-lg border border-outline-variant bg-surface` cards, `bg-primary text-on-primary hover:bg-primary-container` primary buttons, dashed-outline empty states, animated `progress_activity` spinner icon).
- Created `/home/z/my-project/src/components/nusword/share-dialog.tsx` (382 lines) — props `{open, onOpenChange, documentId, documentTitle}`:
  - **Hook wiring**: `useDocumentShares(open ? documentId : null)` so the query only fires when the dialog is visible; `useShareDocument(documentId)` for the invite form; `useRevokeShare(documentId)` for the revoke buttons. Passing `null` while closed avoids an extra network round-trip on dashboard mount.
  - **Invite form**: email input (with leading `mail` icon) + Select for role (editor/commenter/viewer) + Share button. Email is validated with a simple regex; on submit it calls `shareMutation.mutate({email, role})`, clears the form on success, toasts `Shared with <email>` with the role label, and surfaces the server's `{error}` payload on failure (the fetch helper throws `"<status>: {\"error\":\"…\"}"`, which we strip + JSON-parse to recover the API's error message — e.g. "Cannot share with yourself", "Share already exists").
  - **Role legend**: 3-up grid below the form showing each `SHARE_ROLE_META` entry (icon + label + description) so the user understands what each role grants without leaving the dialog.
  - **People-with-access list**: avatar icon + email + role label + relative-time-since-shared + Revoke button. Revoke shows a spinning `progress_activity` icon while the matching `shareId` is in flight (compared via `revokeMutation.variables === share.id`).
  - **States**: loading skeletons (2 placeholder rows), empty state ("No collaborators yet" with `group_off` icon), and the populated list. Form state is reset to defaults (email="", role="viewer") whenever the dialog closes.
- Created `/home/z/my-project/src/components/nusword/templates-gallery.tsx` (568 lines) — props `{onUseDocument}`:
  - **Category tabs**: `apps`/All + the 5 `TEMPLATE_CATEGORIES` entries (Academic/Business/Creative/Religious/Personal). Clicking a tab sets the category state, which is passed to `useTemplates(category === "all" ? null : category)` — TanStack Query refetches on the key change (`["templates", category ?? null]`).
  - **Template grid**: 1→4 responsive columns (`sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) of `TemplateCard`s. Each card has a thumbnail header (with a type-aware icon — `description` for documents, `menu_book` for books), a top-left **type badge** ("Document"/"Book") and a top-right **category badge** (uses `primary-fixed`/`on-primary-fixed` to tint subtly). Body shows title, 2-line clamped description, use count (`trending_up` icon + number formatted via `toLocaleString("id-ID")`), and a "Use Template" button.
  - **Use Template**: `useMutation.variables === template.id` toggles the button into a "Creating…" state with a spinning icon. On success it toasts `Created "<doc title>" from template` and calls `onUseDocument(doc.id, doc.title)` so the parent dashboard can open the editor.
  - **Loading skeletons** (4 placeholder cards) + **empty state**: two variants — one for "no templates at all" (offers a Create Template CTA) and one for "no templates in this category" (suggests trying another category or creating your own).
  - **Create Template dialog** (separate component, internal to the file): a simple form with title (required, max 200 chars — matches the Zod schema in `POST /api/templates`), description (optional textarea), type Select (document/book), and category Select (5 entries). Both Selects use the shadcn Select with custom icon-prefixed items via `SelectItem`. The selected category's description is shown in a callout below the Selects so the user knows what each category implies. On submit calls `useCreateTemplate().mutate({title, description, type, category})`, toasts success, and closes the dialog. Form state is reset on close.
  - The Create Template dialog also handles the API error format the same way as ShareDialog (strip status prefix → JSON.parse → `toast.error(parsed.error)`).
- **Styling alignment fix**: initially used `h-10` for inputs and buttons but the shadcn `SelectTrigger` defaults to `data-[size=default]:h-9` which has higher CSS specificity than a plain `h-10` override (twMerge treats them as separate variant groups). Aligned everything to `h-9` (matches the existing `export-dialog.tsx` and dashboard search input) so the invite-form row and Create-Template form keep their input / Select / button on a single visual baseline.
- **Design-system tokens used**: `bg-surface`, `bg-surface-container-low`, `bg-surface-container-lowest`, `bg-surface-container-high`, `bg-surface-container-highest`, `bg-primary`, `bg-primary-container`, `bg-primary-fixed`, `text-on-surface`, `text-on-surface-variant`, `text-outline`, `text-primary`, `text-on-primary`, `text-on-primary-container`, `text-on-primary-fixed`, `text-error`, `border-outline-variant`, `border-primary`, `border-error`, `border-transparent`, plus the typography utilities `text-headline-ui-md`, `text-headline-ui-lg`, `text-body-ui-md`, `text-label-ui-sm`, and `rounded-lg` for cards / `rounded` for buttons (per the design system's "Soft-Modular" 4px/8px rule). All icons are Material Symbols via the `Icon` component.
- All non-trivial interactive elements carry `type="button"` / `type="submit"` to avoid implicit form submission, `aria-label`s on icon-only buttons (revoke, notifications), and a `role="tablist"` + `role="tab"` + `aria-selected` on the category tabs for keyboard/screen-reader reach.

Verification:
- `npx tsc --noEmit` (full project): zero errors mention `share-dialog` or `templates-gallery`. The remaining project-wide errors are all pre-existing and out of scope (the `JSONContent` re-export issue in `src/lib/nusword/serialize.ts` + `pdf.ts`, the `PDFKit` namespace errors, and skills/examples dirs — all called out in the task 7-HOOKS worklog entry).
- `npx eslint src/components/nusword/share-dialog.tsx src/components/nusword/templates-gallery.tsx` → exit 0, no warnings or errors.

Stage Summary:
- Files created:
  - `/home/z/my-project/src/components/nusword/share-dialog.tsx` (382 lines) — share/collaborate dialog wired to `useDocumentShares` / `useShareDocument` / `useRevokeShare`. Renders an invite form (email + role Select + Share button), a 3-up role legend built from `SHARE_ROLE_META`, and a "People with access" list with per-row revoke. Toasts every mutation outcome, parses the API's `{error}` payload for human-readable messages.
  - `/home/z/my-project/src/components/nusword/templates-gallery.tsx` (568 lines) — full gallery view with category tabs (All + 5 TEMPLATE_CATEGORIES), responsive 1→4-column grid of template cards (type badge, category badge, use count, Use Template button), loading skeletons, dual empty states (no templates at all vs. no templates in this category), and an integrated Create Template dialog (title/description/category/type form wired to `useCreateTemplate`). Use Template calls `useUseTemplate` and bubbles the created document back to the parent via `onUseDocument(documentId, documentTitle)`.
- Both components follow the NUSWORD design system (deep teal primary, surface-tier backgrounds, Material Symbols icons, soft-modular radii) and mirror the styling conventions established by `export-dialog.tsx` and `dashboard-view.tsx` so they slot in without a visual jolt.
- Architecture: the dialog takes a controlled `{open, onOpenChange}` pair so it can be triggered from anywhere (top-nav Share button, dashboard context menu, etc.). The gallery is a self-contained `<section>` with its own heading + tabs + grid — designed to render inside the existing dashboard `<main>` (the next task can conditionally swap `<DashboardRecentContent>` for `<TemplatesGallery onUseDocument={openDocument} />` when `activeNav === "templates"`).
- Next actions for downstream agents: (a) wire `ShareDialog` into the editor top nav (next to the existing Export button) — the editor already has `documentId` + `documentTitle` in scope; (b) wire `TemplatesGallery` into `dashboard-view.tsx` so the sidebar "Templates" tab swaps the document grid for the gallery; (c) optionally add a "Shared with me" dashboard section that consumes `useSharedWithMe()` (already exposed by the hooks file but not yet surfaced in any UI).

---
Task ID: 7-UI-2
Agent: general-purpose
Task: Create Organizations management UI and Usage stats dashboard for Phase 7 SaaS (Next.js App Router + Tailwind 4 + shadcn/ui + NUSWORD design system).

Work Log:
- Read worklog (Phase 1–7 history) to align with established conventions: Hanken Grotesk UI typography, Source Serif 4 content, Material Symbols icons, deep teal primary `#012425`, surface-tier tonal layering, 4px baseline grid, `text-label-ui-sm` / `text-body-ui-md` / `text-headline-ui-md` typography helpers, `bg-surface-container-low` etc. tonal tiers, `rounded-lg` for cards, `rounded` for buttons, `ROLE_META` for role display, `sonner` for toasts, shadcn `Dialog` from `@/components/ui/dialog`.
- Inspected the existing `dashboard-view.tsx`, `export-dialog.tsx`, `book-view.tsx`, `icon.tsx`, `use-saas.ts`, `types/saas.ts`, `app/api/organizations/**` route handlers, shadcn `dialog`/`select`/`input`/`button`/`badge`/`avatar` primitives, `lib/utils.ts` (`cn`), `lib/nusword/time.ts` (`relativeTime`), `globals.css` design-token block, and `tailwind.config.ts` to mirror the project's hybrid pattern: raw HTML elements styled with NUSWORD tokens for buttons/inputs (matching `dashboard-view` + `export-dialog`) + shadcn `Dialog` for modal overlays + shadcn `Select` for role dropdowns (keyboard-a11y + dropdown positioning).
- Found the `useInviteMember` hook's `InviteMemberInput` was missing the optional `name` field that the task spec + the underlying API (`POST /api/organizations/[id]/members` accepts `{email, name?, role}`) both support. Extended the interface in `src/hooks/use-saas.ts` from `{email, role}` → `{email, name?, role}` so the new UI's name field can flow through. One-line interface change, no behavioural change for existing callers.
- Confirmed role constraints from the API:
  - Invite-role Zod enum: `["admin", "editor", "commenter", "viewer"]` (owner excluded — owners are auto-assigned at org creation only).
  - Update-role Zod enum: `["owner", "admin", "editor", "commenter", "viewer"]` (all 5).
  - Cannot demote self from owner (400), cannot remove owner (400).
  - Both invite/update/remove require `org.members.manage` permission (owner or admin only).
  Built the UI to enforce these client-side: `INVITE_ROLES` excludes owner, `ALL_ROLES` includes all 5 for the change-role dropdown, the owner row is immutable (no dropdown, no remove button), and non-admin/owner viewers see a "Only owners and admins can invite members" hint plus disabled inputs.

Files created:

1. `/home/z/my-project/src/components/nusword/organizations-view.tsx` (~880 lines, named export `OrganizationsView`)
   - **Root view**: header (`Organizations` title + `Create Organization` button) → responsive card grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`) → loading skeletons (3 cards) → empty state → error state. Manages two dialog states: `createOpen` (boolean) and `managedOrgId` (string | null).
   - **OrganizationCard**: avatar (org-role icon in `bg-primary-container`), name + slug (mono), description (2-line clamp), 3-stat grid (`StatChip` for members/documents/books with icons + counts + uppercase labels), `RoleBadge` (current user's role using `ROLE_META` icon + label + color), `Manage` button (opens members dialog), delete icon button (only if `myRole === "owner"`) → expands an inline confirm panel (`Delete <name>? This cannot be undone.` + Cancel/Delete buttons). Delete mutation wired to `useDeleteOrganization` with success/error toasts.
   - **CreateOrganizationDialog** (shadcn `Dialog`): header (`Create Organization` + description), form with name input (required, autofocus, maxLength 100) + description textarea (optional, maxLength 500, resizable false), footer Cancel/Create buttons. Form state resets on close (150ms deferred to let the exit animation play). Create mutation wired to `useCreateOrganization` with success/error toasts; dialog closes on success.
   - **ManageMembersDialog** (shadcn `Dialog`, max-w-2xl): header (org name + group icon + description), body has two sections: `InviteMemberForm` + members list. Uses `useOrgMembers(open ? orgId : null)` so the query only fires when the dialog is open. **Local `stagedOrg` state** keeps the org data mounted during the close transition so Radix's exit animation doesn't render against null props (parent clears `managedOrgId` immediately on `onOpenChange(false)`).
   - **InviteMemberForm**: bordered panel with `person_add` icon + uppercase label, email input (email-regex validated) + name input (optional) + role `Select` (shadcn, options = `INVITE_ROLES` with role icon + label) + Send Invite button. Disabled when `!canManage` (non-admin/owner) — shows a lock-icon hint in that case. Invite mutation wired to `useInviteMember` with success toast (`Invited <email> as <Role>`) and form reset.
   - **MemberRow**: avatar (initial in `bg-primary-container`, owner uses `bg-primary` for emphasis) + name/email + role control + remove. Role control is a `Select` (with role-icon prefix on the trigger) if `canManage && !isOwner`, otherwise a static `RoleBadge`. Remove button → click reveals confirm (✓) + cancel (✗) inline pair → confirm fires `useRemoveMember` with success/error toasts. Owner row has no role dropdown and no remove button (immutable).
   - **RoleBadge**: small inline-flex badge using `ROLE_META[role]` (icon + label) with `bg-surface-container-low` and the role's color class.
   - **Skeletons**: `OrganizationCardSkeleton` shows 3 placeholder cards during `useOrganizations` loading.

2. `/home/z/my-project/src/components/nusword/usage-card.tsx` (~250 lines, named + default export `UsageCard`)
   - Compact card (`max-w-md` friendly — designed for dashboard sidebar or below the greeting). Header: `insights` icon + `Usage` heading + `Last 7 days` uppercase sub-label.
   - **2×2 stat grid** (`StatTile` each): icon + uppercase label + count. Stats: Documents (`description`), Books (`menu_book`), Exports (`file_export`), Templates (`dashboard_customize`). Counts from `useUsageStats()` keyed by `documentsCreated` / `booksCreated` / `exportsRun` / `templatesUsed`.
   - **Recent Activity list**: top 5 events from `recentEvents`, each rendered as a row with a small circular icon tile + label + relative time (and a `N× ·` prefix when count > 1). Event-type → label/icon mapping defined as `EVENT_META` (`organization.create` → "Created organization", `organization.member.invite` → "Invited member", `document.share` → "Shared document", `template.create` → "Created template", `template.use` → "Used template"); unknown types fall back to a generic `history` icon + "Activity" label.
   - **States**: loading skeleton (4 stat tiles + 3 activity rows shimmer), error state (red icon + "Couldn't load usage stats."), empty activity state (dashed-border muted "No activity yet.").
   - Uses `relativeTime` from `@/lib/nusword/time` for Indonesian-locale relative timestamps (e.g. "3 menit yang lalu").

Verification:
- `npx tsc --noEmit` project-wide: zero errors in the new files (`organizations-view.tsx`, `usage-card.tsx`) or the modified `use-saas.ts`. Pre-existing errors in `book-view.tsx`/`editor-view.tsx`/`export-dialog.tsx`/`serialize.ts`/etc. (all from earlier phases, mostly the `JSONContent` re-export issue + `PDFKit` namespace + skills/examples dirs) are unchanged and out of scope.
- `npx eslint src/components/nusword/organizations-view.tsx src/components/nusword/usage-card.tsx src/hooks/use-saas.ts` → exit 0, no warnings or errors.
- Browser smoke test via agent-browser (created a temporary `/test/ui-2` route that mounted both components, then removed it):
  - Page loaded with HTTP 200; no console errors; React DevTools + HMR connected cleanly.
  - SSR rendered the loading skeletons correctly (TanStack Query fires client-side post-hydration).
  - **UsageCard** rendered after hydration with real stats: 12 documents, 1 book, 8 exports, 2 templates, "RECENT ACTIVITY" heading + event list.
  - **Organizations list** rendered both orgs ("Smoke Test Org" + "Browser Test Org") with name, slug (mono), Owner role badge, member/doc/book stat chips, relative-time footer, Manage + Delete buttons.
  - **Create Organization dialog**: filled name "Browser Test Org" + description → clicked Create → toast `Organization "Browser Test Org" created` → dialog closed → new org card appeared in the grid (TanStack Query invalidation + refetch worked).
  - **Manage Members dialog**: opened for "Smoke Test Org" → showed 3 members (You/owner, Alice/editor, bob/commenter) → owner row had no role dropdown or remove button (immutable) → Alice + bob had role `Select` dropdowns + remove buttons.
  - **Invite flow**: filled email "carol@example.com" + name "Carol" → kept role as Editor → clicked Send Invite → toast `Invited carol@example.com as Editor` → Carol's row appeared at the bottom of the members list with Editor role + remove button → form reset.
  - **Role change**: opened Carol's role `Select` → saw all 5 options (Owner, Admin, Editor [selected], Commenter, Viewer) → picked Commenter → toast `carol@example.com is now Commenter` → Carol's role display updated to Commenter.
  - **Remove flow**: clicked Carol's remove icon → inline "Confirm remove" (✓) + "Cancel remove" (✗) buttons appeared → clicked confirm → toast `carol@example.com removed` → Carol's row disappeared, members count went 4→3.
  - **Delete org flow**: closed dialog → clicked Browser Test Org's delete icon → inline confirm panel ("Delete Browser Test Org? This cannot be undone." + Cancel/Delete buttons) → clicked Delete → org card disappeared from the grid (org deleted, list refetched).
  - All interactions had zero console errors and zero unhandled promise rejections.
- Cleaned up: deleted the temporary `/test/ui-2` route, deleted the smoke-test org via `DELETE /api/organizations/[id]`, stopped the dev server.

Stage Summary:
- Two new NUSWORD design-system components ready to wire into the dashboard: `OrganizationsView` (full-page org + member management with create/delete/invite/role-change/remove flows) and `UsageCard` (compact 4-stat + recent-activity card for the dashboard sidebar or greeting area).
- One small hook extension: `InviteMemberInput` now accepts an optional `name` field (matching the API + task spec).
- All seven Phase 7 SaaS hooks created by task 7-HOOKS are now consumed by real UI: `useOrganizations` / `useCreateOrganization` / `useDeleteOrganization` / `useOrgMembers` / `useInviteMember` / `useUpdateMember` / `useRemoveMember` / `useUsageStats`.
- Design-system fidelity verified: Material Symbols icons throughout, `bg-surface`/`bg-surface-container-low`/`bg-primary-container` tonal tiers, `border-outline-variant` hairlines, `text-label-ui-sm` uppercase tracking-wider section labels, `text-headline-ui-md` card/dialog titles, `text-headline-ui-lg` page title, `rounded-lg` cards + `rounded` buttons, `ROLE_META` icons + colors for every role display.
- Next actions for downstream agents: (a) add an "Organizations" entry to the dashboard sidebar nav (`PRIMARY_NAV` in `dashboard-view.tsx`) and swap the main content to `<OrganizationsView />` when that nav item is active (the store would need a new view mode or a sub-route under dashboard); (b) drop `<UsageCard />` into the dashboard layout — natural spots are above the document grid (replacing or alongside the welcome block) or in a right sidebar; (c) once the SaaS API grows real auth, replace the `CURRENT_USER_EMAIL = "user@nusword.local"` placeholder in the API routes (the UI already keys everything off `myRole` from the org DTO, so it's auth-ready); (d) build the share dialog (`useDocumentShares` / `useShareDocument` / `useUpdateShare` / `useRevokeShare`) and templates gallery (`useTemplates` / `useTemplate` / `useCreateTemplate` / `useUpdateTemplate` / `useDeleteTemplate` / `useUseTemplate`) — the hooks + API are all in place, just need their UIs.

---
Task ID: 7 (completion)
Agent: main
Task: Implement Phase 7 (SaaS) — organizations, sharing, roles, usage metering, templates marketplace. WITHOUT billing (user growth focus).

Work Log:
- Added 5 new Prisma models: Organization (name, slug, description, soft-delete), OrganizationMember (orgId, email, name, role), SharedDocument (documentId, sharedWithEmail, role, shareToken), Template (title, description, type, category, content, settings, published, useCount), UsageEvent (email, type, resourceId, metadata). Added organizationId to Document + Book (nullable, SetNull on delete). Ran `db:push`.
- Wrote `src/types/saas.ts` — OrgRole (owner/admin/editor/commenter/viewer), ShareRole (editor/commenter/viewer), Permission system with ROLE_PERMISSIONS + SHARE_ROLE_PERMISSIONS maps + hasPermission() checker, ROLE_META + SHARE_ROLE_META for UI display, NuswordOrganization/OrgMember/Share/Template DTOs, TEMPLATE_CATEGORIES (5 categories: academic/business/creative/religious/personal), UsageStats type.
- Built API routes via subagents:
  - Organizations: GET/POST /api/organizations, GET/PATCH/DELETE /api/organizations/[id], GET/POST /api/organizations/[id]/members, PATCH/DELETE /api/organizations/[id]/members/[memberId]
  - Sharing: GET/POST /api/documents/[id]/shares, PATCH/DELETE /api/documents/[id]/shares/[shareId], GET /api/shared
  - Templates: GET/POST /api/templates, GET/PATCH/DELETE /api/templates/[id], POST /api/templates/[id]/use (creates document from template, increments useCount)
  - Usage: GET /api/usage (documents/books/exports/templates counts + recent events grouped by day)
  - All routes use Zod validation, CURRENT_USER_EMAIL placeholder (no auth yet), permission checks via hasPermission(), usage event logging.
- Built TanStack Query hooks in `src/hooks/use-saas.ts` (21 hooks): useOrganizations, useOrganization, useCreateOrganization, useUpdateOrganization, useDeleteOrganization, useOrgMembers, useInviteMember, useUpdateMember, useRemoveMember, useDocumentShares, useShareDocument, useUpdateShare, useRevokeShare, useSharedWithMe, useTemplates, useTemplate, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useUseTemplate, useUsageStats.
- Built UI components via subagents:
  - `share-dialog.tsx` — share document dialog: email input + role selector (editor/commenter/viewer with icons + descriptions) + share button + current shares list with revoke.
  - `templates-gallery.tsx` — templates marketplace: category filter tabs (All/Academic/Business/Creative/Religious/Personal) + template cards grid + "Use Template" button + "Create Template" dialog.
  - `organizations-view.tsx` — full org management: org cards with role badges, create org dialog, members management panel (invite/change-role/remove), permission gating.
  - `usage-card.tsx` — compact dashboard card: 4 stat tiles (documents/books/exports/templates) + recent activity list.
- Wired into existing UI:
  - Dashboard sidebar: replaced "Projects" with "Shared with me" + "Organizations" nav items.
  - Dashboard main: conditionally renders OrganizationsView, TemplatesGallery, or Recent (documents + books + usage card) based on activeNav.
  - Editor top nav: Share button now opens ShareDialog (wired with documentId + documentTitle).
- Bug fixes: Fixed Prisma client cache issue (needed `npx prisma generate` after schema push). Fixed race condition in kitab toggle (from Phase 6). Fixed role dropdown covering Send Invite button (press Escape to close).

Stage Summary:
- Phase 7 complete: SaaS collaboration features (organizations, roles, sharing, templates marketplace, usage metering) WITHOUT billing. The focus is user growth and collaboration.
- Architecture: Organization owns documents/books/templates. Members have roles (owner/admin/editor/commenter/viewer) with permission checks. Sharing is separate from ownership (share a document with an individual by email). Templates are publishable to the marketplace with use-count tracking. Usage events logged for analytics.
- RBAC: 5 org roles with 10 permissions (org.delete, org.members.manage, org.settings.edit, content.create/edit/delete/export/share/comment/view). Share roles subset (editor/commenter/viewer).
- Verified via Agent Browser: dashboard sidebar shows all 4 nav items → Organizations view (create org, manage members, invite collaborator) → Templates gallery (category tabs, template cards) → Share dialog (email + role selector) → Usage card (stats + recent activity).
- No billing: per user request, Phase 7 focuses on MVP production and user growth. Billing can be added later (PRD §7: "billing-ready structure").
- Next phase: Phase 8 = AI (prompt-to-outline, rewrite, summarize, structured generation).

---
Task ID: 8
Agent: main
Task: Create minimalist landing page (paper/writing theme) + login + signup pages. Architecturally separate marketing site from editor app at /app.

Work Log:
- Moved the existing NUSWORD editor app from `/` to `/app` route (`src/app/app/page.tsx`). This is the client-side application with Zustand store, dashboard, editor, and book views.
- Created new landing page at `/` (`src/app/page.tsx`) — a server component (no client-side app dependencies, no Zustand store, no editor imports). Marketing/public website.
- Landing page theme: "kertas tulisan biasa" (ordinary writing paper) — minimalist aesthetic with:
  - Subtle ruled-line background pattern (like notebook paper)
  - Red margin line on the left (like notebook paper)
  - Source Serif 4 for headings and body text (paper-like)
  - Hanken Grotesk for UI elements (nav, buttons, labels)
  - Deep teal primary color for CTAs
  - Generous whitespace
- Landing page sections: Hero (brand + headline "Write. Design. Publish. Print." + subtitle + CTAs), Features (6 feature cards with icons), Phases (8-phase roadmap timeline), CTA ("Mulai menulis hari ini" with signup + demo buttons), Footer.
- Created `src/components/landing/landing-nav.tsx` — sticky transparent nav with brand, links (Fitur, Roadmap, Masuk, Daftar).
- Created `src/components/landing/landing-footer.tsx` — minimalist footer with brand, links, copyright.
- Created login page at `/login` (`src/app/login/page.tsx`) — simple paper-themed form: email + password inputs with bottom-border style (like writing on a line), "Masuk" button, "Coba Demo Tanpa Akun" link, signup link. On submit → redirect to /app.
- Created signup page at `/signup` (`src/app/signup/page.tsx`) — simple paper-themed form: name + email + password inputs, "Buat Akun" button, terms text, demo link, login link. On submit → redirect to /app.
- Updated layout metadata to Indonesian description.
- Architecture: Landing page (`/`) is a server component with NO imports from the app (no Zustand store, no editor, no dashboard, no hooks). The app (`/app`) is a client component with full app dependencies. Login/signup are client components (for form state + router redirect) but don't import app components. This cleanly separates marketing from application code.

Stage Summary:
- Marketing site at `/` — minimalist landing page with paper/writing theme, architecturally separate from the editor app.
- Auth pages at `/login` and `/signup` — simple paper-themed forms that redirect to `/app` on submit (Phase 7: no real auth yet, placeholder).
- Editor app at `/app` — the full NUSWORD application (dashboard, editor, book view, organizations, templates, etc.).
- All navigation flows verified: landing → signup → /app, landing → login → /app, landing → Coba Demo → /app, login ↔ signup cross-links.
