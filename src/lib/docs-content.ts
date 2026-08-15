/**
 * NUSWORD Documentation Content
 *
 * Single source of truth for all feature documentation.
 * When a new feature is added, add its documentation here.
 *
 * Structure: sections → subsections → content blocks.
 */

export interface DocBlock {
  type: "paragraph" | "heading" | "list" | "code" | "table" | "callout";
  text?: string;
  level?: number;
  items?: string[];
  rows?: string[][];
  variant?: "info" | "warning" | "tip";
}

export interface DocSubsection {
  id: string;
  title: string;
  blocks: DocBlock[];
}

export interface DocSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  subsections: DocSubsection[];
}

export const ALL_SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "rocket_launch",
    description: "Mulai menggunakan NUSWORD dalam hitungan menit.",
    subsections: [
      {
        id: "overview",
        title: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "NUSWORD adalah platform dokumen, publishing, buku, kitab, dan print-ready document. Buat, edit, paginasi, dan ekspor — dari satu sumber canonical.",
          },
          {
            type: "heading",
            text: "Fitur Utama",
            level: 3,
          },
          {
            type: "list",
            items: [
              "Rich text editor multi-page dengan autosave dan version history",
              "Page engine presisi untuk ukuran kertas, margin, header/footer",
              "Export PDF, DOCX, dan HTML dengan preflight checks",
              "Book engine dengan chapter tree, TOC, dan booklet imposition",
              "Kitab engine untuk Arabic/RTL, bilingual blocks, footnotes, ornaments",
              "Organizations dengan role-based sharing (editor/commenter/viewer)",
              "Template marketplace untuk reuse document patterns",
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "NUSWORD gratis untuk tahap awal. Tanpa kartu kredit, tanpa billing. Daftar dan langsung mulai menulis.",
          },
        ],
      },
      {
        id: "create-account",
        title: "Membuat Akun",
        blocks: [
          {
            type: "paragraph",
            text: "Untuk mulai menggunakan NUSWORD, Anda perlu membuat akun gratis.",
          },
          {
            type: "list",
            items: [
              "Buka halaman Daftar di /signup",
              "Masukkan nama, email, dan password (minimal 6 karakter)",
              "Klik 'Buat Akun' — Anda akan langsung diarahkan ke aplikasi",
              "Tidak perlu verifikasi email untuk tahap awal",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            text: "Ingin coba tanpa akun? Klik 'Coba Demo Tanpa Akun' di halaman login atau daftar untuk akses langsung ke aplikasi.",
          },
        ],
      },
      {
        id: "first-document",
        title: "Membuat Dokumen Pertama",
        blocks: [
          {
            type: "paragraph",
            text: "Setelah masuk ke aplikasi (/app), Anda akan melihat dashboard dengan grid dokumen dan books.",
          },
          {
            type: "list",
            items: [
              "Klik tombol 'New Document' (kartu dengan border dashed)",
              "Editor akan terbuka dengan halaman A4 kosong",
              "Mulai mengetik di area paper — autosave aktif otomatis",
              "Gunakan toolbar di atas paper untuk formatting (bold, italic, heading, dll.)",
              "Klik tombol back (←) di top nav untuk kembali ke dashboard",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            text: "Tekan Ctrl+K (Cmd+K di Mac) untuk membuka Command Palette — navigasi cepat tanpa mouse.",
          },
        ],
      },
    ],
  },
  {
    id: "editor",
    title: "Editor",
    icon: "edit_document",
    description: "Rich text editor dengan Tiptap, autosave, version history, dan formatting lengkap.",
    subsections: [
      {
        id: "rich-text",
        title: "Rich Text Formatting",
        blocks: [
          {
            type: "paragraph",
            text: "NUSWORD menggunakan Tiptap (ProseMirror) sebagai editor foundation. Konten disimpan sebagai structured JSON, bukan HTML — ini memastikan ekspor yang deterministik.",
          },
          {
            type: "heading",
            text: "Block Types",
            level: 3,
          },
          {
            type: "table",
            rows: [
              ["Block Type", "Toolbar Button", "Shortcut"],
              ["Paragraph", "¶", "Ctrl+Shift+0"],
              ["Heading 1", "H1", "Ctrl+Alt+1"],
              ["Heading 2", "H2", "Ctrl+Alt+2"],
              ["Heading 3", "H3", "Ctrl+Alt+3"],
              ["Bullet List", "☰", "Ctrl+Shift+8"],
              ["Numbered List", "1.", "Ctrl+Shift+7"],
              ["Blockquote", "❝", "Ctrl+Shift+B"],
              ["Code Block", "</>", "Ctrl+E"],
              ["Table", "▦", "—"],
              ["Image", "🖼", "—"],
              ["Page Break", "⋯", "—"],
            ],
          },
          {
            type: "heading",
            text: "Inline Formatting",
            level: 3,
          },
          {
            type: "table",
            rows: [
              ["Format", "Shortcut", "Notes"],
              ["Bold", "Ctrl+B", "—"],
              ["Italic", "Ctrl+I", "—"],
              ["Underline", "Ctrl+U", "—"],
              ["Strikethrough", "—", "Toolbar button"],
              ["Highlight", "—", "Yellow background mark"],
              ["Inline Code", "—", "Monospace font"],
              ["Link", "—", "URL with target=_blank"],
              ["Text Color", "—", "Color picker"],
            ],
          },
        ],
      },
      {
        id: "autosave",
        title: "Autosave & Save State",
        blocks: [
          {
            type: "paragraph",
            text: "Editor secara otomatis menyimpan perubahan Anda. Tidak perlu klik 'Save' — cukup berhenti mengetik dan perubahan akan tersimpan dalam 2 detik.",
          },
          {
            type: "heading",
            text: "Save State Indicator",
            level: 3,
          },
          {
            type: "list",
            items: [
              "Idle — tidak ada perubahan yang belum disimpan",
              "Saving… — sedang menyimpan ke server (muncul saat debounce timer fires)",
              "Saved — berhasil disimpan (muncul 2 detik lalu kembali ke idle)",
              "Save failed — error, perubahan belum tersimpan",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            text: "Tekan Ctrl+S (Cmd+S) untuk force save tanpa menunggu debounce. Editor akan langsung flush ke server.",
          },
          {
            type: "callout",
            variant: "warning",
            text: "Pastikan koneksi internet stabil saat editing. Jika koneksi terputus saat save, status akan berubah ke 'Save failed' dan Anda bisa mencoba lagi.",
          },
        ],
      },
      {
        id: "versions",
        title: "Version History",
        blocks: [
          {
            type: "paragraph",
            text: "NUSWORD menyimpan version history yang immutable. Anda bisa membuat snapshot kapan saja dan restore ke versi sebelumnya.",
          },
          {
            type: "list",
            items: [
              "Buka sidebar kiri → tab 'Versions'",
              "Klik 'Save version' untuk membuat snapshot",
              "Opsional: tambahkan label (misal: 'Sebelum AI rewrite')",
              "Setiap version menampilkan: nomor, tanggal, jumlah kata, label",
              "Klik 'Restore' untuk mengembalikan dokumen ke versi tersebut",
              "Version tidak bisa dihapus — immutable untuk audit trail",
            ],
          },
        ],
      },
      {
        id: "find-replace",
        title: "Find & Replace",
        blocks: [
          {
            type: "paragraph",
            text: "Cari dan ganti teks di seluruh dokumen. Buka dengan tombol search di top nav atau Ctrl+F (Cmd+F).",
          },
          {
            type: "list",
            items: [
              "Masukkan kata yang dicari di field 'Find'",
              "Masukkan kata pengganti di field 'Replace with'",
              "Match case: toggle untuk case-sensitive search",
              "Navigate: ↑/↓ untuk berpindah antar hasil",
              "Replace: ganti satu instance",
              "All: ganti semua instance sekaligus",
            ],
          },
        ],
      },
      {
        id: "keyboard-shortcuts",
        title: "Keyboard Shortcuts",
        blocks: [
          {
            type: "table",
            rows: [
              ["Shortcut", "Action", "Available In"],
              ["Ctrl+K (Cmd+K)", "Open Command Palette", "Dashboard, Editor, Book"],
              ["Ctrl+S (Cmd+S)", "Save (force flush autosave)", "Editor"],
              ["Ctrl+P (Cmd+P)", "Open Export dialog", "Editor"],
              ["Ctrl+F (Cmd+F)", "Toggle Find & Replace", "Editor"],
              ["Ctrl+Shift+P", "Toggle Preview mode", "Editor"],
              ["Ctrl+B (Cmd+B)", "Bold", "Editor"],
              ["Ctrl+I (Cmd+I)", "Italic", "Editor"],
              ["Ctrl+U (Cmd+U)", "Underline", "Editor"],
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "Shortcuts tidak aktif saat mengetik di input fields (kecuali Ctrl+K untuk Command Palette).",
          },
        ],
      },
    ],
  },
  {
    id: "page-layout",
    title: "Page & Layout",
    icon: "description",
    description: "Paper generator, margins, header/footer, page numbering, dan pagination deterministik.",
    subsections: [
      {
        id: "page-settings",
        title: "Page Settings",
        blocks: [
          {
            type: "paragraph",
            text: "Konfigurasi halaman tersedia di sidebar kanan → tab 'Layout'. Semua perubahan langsung terlihat di preview dan tersimpan otomatis.",
          },
          {
            type: "heading",
            text: "Available Settings",
            level: 3,
          },
          {
            type: "table",
            rows: [
              ["Setting", "Options", "Default"],
              ["Page Size", "A4, A5, B5, Letter, Legal, F4, Custom", "A4"],
              ["Orientation", "Portrait, Landscape", "Portrait"],
              ["Margins", "Top, Bottom, Left, Right (mm)", "25.4mm each"],
              ["Bleed", "0–50mm", "0mm"],
              ["Gutter", "0–20mm (binding offset)", "0mm"],
              ["Columns", "1, 2, 3", "1"],
              ["Mirror Margins", "On/Off (facing pages)", "Off"],
            ],
          },
        ],
      },
      {
        id: "header-footer",
        title: "Header & Footer",
        blocks: [
          {
            type: "paragraph",
            text: "Tambahkan header dan footer ke setiap halaman dengan template variables.",
          },
          {
            type: "heading",
            text: "Template Variables",
            level: 3,
          },
          {
            type: "table",
            rows: [
              ["Variable", "Replaced With"],
              ["{{page}}", "Current page number"],
              ["{{pages}}", "Total page count"],
              ["{{title}}", "Document title"],
            ],
          },
          {
            type: "paragraph",
            text: "Setiap header/footer punya 3 slot: Left, Center, Right. Aktifkan/disable via toggle di Layout panel.",
          },
          {
            type: "callout",
            variant: "tip",
            text: "Contoh: set footer center ke '{{page}} / {{pages}}' untuk menampilkan nomor halaman dalam format '3 / 12'.",
          },
        ],
      },
      {
        id: "page-numbering",
        title: "Page Numbering",
        blocks: [
          {
            type: "paragraph",
            text: "Format nomor halaman dapat dikustomisasi:",
          },
          {
            type: "list",
            items: [
              "Decimal: 1, 2, 3, 4, 5...",
              "Roman: i, ii, iii, iv, v...",
              "Arabic-Indic: ١, ٢, ٣, ٤, ٥... (untuk kitab)",
              "None: tanpa nomor halaman",
            ],
          },
          {
            type: "paragraph",
            text: "Anda juga bisa set starting page number (misal: mulai dari halaman 5) dan 'Different First Page' untuk menyembunyikan header/footer di halaman pertama.",
          },
        ],
      },
      {
        id: "pagination",
        title: "Pagination & Preview",
        blocks: [
          {
            type: "paragraph",
            text: "NUSWORD mempunyai pagination engine deterministik yang independent dari UI rendering (PRD §14). Ini memastikan output ekspor konsisten dengan preview.",
          },
          {
            type: "list",
            items: [
              "Edit mode: menampilkan single paper untuk editing",
              "Preview mode: menampilkan multi-page paginated view",
              "Toggle via tombol Edit/Preview di top nav",
              "Page thumbnails di sidebar 'Pages' tab",
              "Layout warnings: overflow, blank pages, margin issues",
              "Explicit page breaks via toolbar (page break node)",
              "Widow/orphan control: headings tidak akan ditinggalkan di bottom of page",
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "Pagination menggunakan DOM-based measurement: setiap block di-render di hidden container, tingginya diukur, lalu blocks di-distribute ke pages. Ini akurat tapi bisa lambat untuk dokumen sangat panjang.",
          },
        ],
      },
    ],
  },
  {
    id: "export",
    title: "Export",
    icon: "picture_as_pdf",
    description: "Export ke PDF, DOCX, dan HTML dengan preflight checks dan print presets.",
    subsections: [
      {
        id: "formats",
        title: "Export Formats",
        blocks: [
          {
            type: "paragraph",
            text: "NUSWORD mendukung tiga format ekspor utama:",
          },
          {
            type: "table",
            rows: [
              ["Format", "Best For", "Features"],
              ["PDF", "Print-ready output", "Multi-page, headers/footers, page numbers, embedded fonts"],
              ["DOCX", "Word interchange", "Semantic structure (headings, lists, tables, images)"],
              ["HTML", "Web publishing", "Standalone HTML with @page CSS rules, printable from browser"],
            ],
          },
        ],
      },
      {
        id: "presets",
        title: "Print Presets",
        blocks: [
          {
            type: "paragraph",
            text: "Untuk PDF, Anda bisa memilih print preset:",
          },
          {
            type: "table",
            rows: [
              ["Preset", "DPI", "Use Case"],
              ["Screen PDF", "72", "On-screen viewing, smallest file size"],
              ["Standard Print", "150", "Desktop printing, balanced quality"],
              ["High Quality Print", "300", "Professional printing, bleed marks"],
              ["Booklet", "300", "Saddle-stitch imposition (2-up)"],
              ["Custom", "—", "User-configurable"],
            ],
          },
        ],
      },
      {
        id: "preflight",
        title: "Preflight Checks",
        blocks: [
          {
            type: "paragraph",
            text: "Sebelum ekspor, NUSWORD menjalankan preflight checks untuk mendeteksi masalah layout:",
          },
          {
            type: "list",
            items: [
              "Empty document (error — nothing to export)",
              "Overflow blocks (warning — block taller than full page)",
              "Blank pages (warning — page has no content)",
              "Margin/bleed issues (warning — margin < bleed)",
              "Font size warnings (info — very small or large font)",
              "Page count info (info — document has > 100 pages)",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            text: "Preflight errors (red) akan mencegah ekspor. Warnings (amber) hanya informasi — ekspor tetap bisa dilanjutkan.",
          },
        ],
      },
      {
        id: "export-history",
        title: "Export History",
        blocks: [
          {
            type: "paragraph",
            text: "Setiap ekspor dicatat dengan metadata lengkap:",
          },
          {
            type: "list",
            items: [
              "Format + preset yang digunakan",
              "File size + SHA-256 checksum",
              "Timestamp (kapan ekspor dilakukan)",
              "Preflight report (JSON)",
              "Retention: artifacts expire setelah 7 hari",
            ],
          },
          {
            type: "paragraph",
            text: "Riwayat ekspor tersedia di Export dialog → 'Recent Exports' section. Anda bisa download ulang artifact yang masih valid.",
          },
        ],
      },
    ],
  },
  {
    id: "books",
    title: "Book Engine",
    icon: "menu_book",
    description: "Multi-chapter books dengan TOC, mirror margins, running headers, dan booklet imposition.",
    subsections: [
      {
        id: "creating-books",
        title: "Membuat Book",
        blocks: [
          {
            type: "paragraph",
            text: "Book adalah koleksi chapters dengan front/back matter, trim size, dan binding configuration.",
          },
          {
            type: "list",
            items: [
              "Dashboard → Books section → 'New Book'",
              "Book editor terbuka dengan sidebar chapters",
              "Klik 'Add Chapter' untuk membuat chapter pertama",
              "Setiap chapter adalah Document terpisah dengan autosave sendiri",
              "Klik chapter di sidebar untuk edit content-nya",
              "Tab 'Settings' untuk konfigurasi book (binding, margins, dll.)",
            ],
          },
        ],
      },
      {
        id: "chapter-tree",
        title: "Chapter Tree",
        blocks: [
          {
            type: "paragraph",
            text: "Chapters mendukung nesting (parent-child) untuk struktur book yang kompleks.",
          },
          {
            type: "list",
            items: [
              "Sort order: drag chapters untuk reorder",
              "Parent/child: nest chapters untuk sub-sections",
              "Per-chapter settings: start new page, include in TOC",
              "Delete chapter: hapus chapter + document-nya",
            ],
          },
        ],
      },
      {
        id: "toc",
        title: "Table of Contents",
        blocks: [
          {
            type: "paragraph",
            text: "TOC di-generate otomatis dari chapter tree + heading structure.",
          },
          {
            type: "list",
            items: [
              "Setiap chapter dengan includeInToc=true menjadi level-1 entry",
              "Headings (H2, H3) dalam chapter menjadi sub-entries",
              "Page numbers resolved dari pagination engine",
              "Preview TOC tersedia di book editor → Front Matter tab",
              "Format: title + dot leaders + page number",
            ],
          },
        ],
      },
      {
        id: "book-binding",
        title: "Binding & Imposition",
        blocks: [
          {
            type: "paragraph",
            text: "Pilih binding type yang sesuai dengan kebutuhan printing:",
          },
          {
            type: "table",
            rows: [
              ["Binding", "Description", "Imposition"],
              ["Perfect Bound", "Glued spine, paperback style", "No"],
              ["Saddle Stitch", "Folded sheets stapled at spine", "Yes (2-up)"],
              ["Case Bound", "Hardcover with signatures", "No"],
              ["Spiral Bound", "Coil binding, lays flat", "No"],
            ],
          },
          {
            type: "paragraph",
            text: "Saat Saddle Stitch dipilih, booklet imposition calculator tersedia — konfigurasikan sheets per signature dan lihat page ordering.",
          },
        ],
      },
    ],
  },
  {
    id: "kitab",
    title: "Kitab & RTL",
    icon: "auto_stories",
    description: "Arabic typography, bilingual blocks, footnotes, ornaments, dan kitab profiles.",
    subsections: [
      {
        id: "kitab-profile",
        title: "Kitab Profile",
        blocks: [
          {
            type: "paragraph",
            text: "Kitab adalah specialized book profile untuk Islamic/Arabic publishing. Aktifkan di Book Settings → 'Kitab Profile' → 'Enable Kitab Mode'.",
          },
          {
            type: "list",
            items: [
              "Auto-sets RTL direction + Amiri font + Arabic-Indic page numbers",
              "Arabic typography config (font, size, line height)",
              "Bilingual layout mode (side-by-side, stacked, interlinear)",
              "Ornament styles (diamond, star, arabesque, dll.)",
              "Footnotes dengan Arabic-Indic numbering",
              "Traditional kitab header dengan decorative border",
              "Basmala at start of each chapter",
            ],
          },
        ],
      },
      {
        id: "bilingual-blocks",
        title: "Bilingual Blocks",
        blocks: [
          {
            type: "paragraph",
            text: "Sisipkan bilingual block (Arabic + translation) menggunakan toolbar button. Pilih layout mode:",
          },
          {
            type: "table",
            rows: [
              ["Layout", "Description"],
              ["Side by Side", "Arabic right (RTL), translation left (LTR)"],
              ["Stacked", "Arabic top, translation below"],
              ["Interlinear", "Line-by-line alternation"],
              ["Arabic Only", "No translation column"],
            ],
          },
        ],
      },
      {
        id: "footnotes",
        title: "Footnotes",
        blocks: [
          {
            type: "paragraph",
            text: "Sisipkan footnote reference (superscript) menggunakan toolbar button. Footnote text disimpan sebagai attribute.",
          },
          {
            type: "list",
            items: [
              "Numbering: Arabic-Indic (٠١٢٣), Decimal (1234), or per-page reset",
              "Position: bottom of page atau margin (side notes)",
              "Separator line between footnotes and body text",
            ],
          },
        ],
      },
      {
        id: "ornaments",
        title: "Ornaments & Basmala",
        blocks: [
          {
            type: "paragraph",
            text: "Sisipkan decorative dividers dan basmala menggunakan toolbar buttons.",
          },
          {
            type: "table",
            rows: [
              ["Ornament", "Preview", "Description"],
              ["Diamond", "◆ ◆ ◆", "Three diamond symbols"],
              ["Star", "✦ ✦ ✦", "Three star symbols"],
              ["Arabesque", "﷽", "Large ornamental Bismillah"],
              ["Double Line", "═══════", "Double horizontal line"],
              ["Ornate Line", "─── ✦ ───", "Line with center star"],
            ],
          },
          {
            type: "paragraph",
            text: "Basmala: sisipkan 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' dalam decorative Amiri font. Dapat juga di-auto-insert di start setiap chapter.",
          },
        ],
      },
    ],
  },
  {
    id: "collaboration",
    title: "Collaboration",
    icon: "groups",
    description: "Organizations, role-based sharing, dan template marketplace.",
    subsections: [
      {
        id: "organizations",
        title: "Organizations",
        blocks: [
          {
            type: "paragraph",
            text: "Organizations adalah team workspace. Buat org, invite members, dan kelola akses.",
          },
          {
            type: "list",
            items: [
              "Dashboard → Organizations → 'Create Organization'",
              "Set org name + slug (unique URL identifier)",
              "Invite members by email dengan role",
              "Members dapat: owner, admin, editor, commenter, viewer",
              "Owner: full control (delete org, manage members)",
              "Admin: manage members + all content",
              "Editor: create/edit/delete content + share",
              "Commenter: view + comment only",
              "Viewer: view only",
            ],
          },
        ],
      },
      {
        id: "sharing",
        title: "Document Sharing",
        blocks: [
          {
            type: "paragraph",
            text: "Share document individual dengan email + role, tanpa perlu organization.",
          },
          {
            type: "list",
            items: [
              "Buka document di editor → klik 'Share' button",
              "Masukkan email + pilih role (Editor/Commenter/Viewer)",
              "Sharee akan menerima akses ke document",
              "Revoke share kapan saja via Share dialog",
              "Share token (UUID) untuk public link sharing",
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "Sharing terpisah dari ownership. Document bisa dimiliki oleh org dan dishare dengan individual users.",
          },
        ],
      },
      {
        id: "templates",
        title: "Template Marketplace",
        blocks: [
          {
            type: "paragraph",
            text: "Browse dan gunakan templates, atau publish template Anda sendiri.",
          },
          {
            type: "list",
            items: [
              "Dashboard → Templates → browse marketplace",
              "Filter by category: Academic, Business, Creative, Religious, Personal",
              "Klik 'Use Template' untuk buat document dari template",
              "Template content + settings di-copy ke document baru",
              "Use count: popular templates muncul lebih dulu",
              "Create Template: publish template Anda sendiri",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "command-palette",
    title: "Command Palette",
    icon: "keyboard_command_key",
    description: "Navigasi cepat dan actions dengan keyboard.",
    subsections: [
      {
        id: "using-palette",
        title: "Using Command Palette",
        blocks: [
          {
            type: "paragraph",
            text: "Tekan Ctrl+K (Cmd+K di Mac) untuk membuka Command Palette. Ini adalah cara tercepat untuk navigasi dan eksekusi actions.",
          },
          {
            type: "heading",
            text: "Available Commands",
            level: 3,
          },
          {
            type: "table",
            rows: [
              ["Command", "Action"],
              ["Go to Dashboard", "Navigasi ke dashboard"],
              ["Go to Recent", "Tab Recent documents"],
              ["Go to Templates", "Template marketplace"],
              ["Go to Organizations", "Org management"],
              ["New Document", "Buat dokumen baru"],
              ["New Book", "Buat book baru"],
              ["Toggle Preview", "Switch editor ke preview mode"],
              ["Toggle Find & Replace", "Buka find/replace panel"],
              ["Export", "Buka export dialog"],
              ["Open Settings", "Halaman settings"],
            ],
          },
          {
            type: "paragraph",
            text: "Command Palette juga menampilkan 6 dokumen dan books terbaru untuk quick switching.",
          },
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: "settings",
    description: "Profile, preferences, keyboard shortcuts, dan about.",
    subsections: [
      {
        id: "profile",
        title: "Profile",
        blocks: [
          {
            type: "paragraph",
            text: "View dan edit profile Anda: email, name. Perubahan name langsung tersimpan dan JWT di-refresh.",
          },
        ],
      },
      {
        id: "preferences",
        title: "Preferences",
        blocks: [
          {
            type: "paragraph",
            text: "Konfigurasi default preferences: theme (light/dark), default page size, default font.",
          },
        ],
      },
      {
        id: "trash",
        title: "Trash & Recovery",
        blocks: [
          {
            type: "paragraph",
            text: "Dokumen dan books yang dihapus (soft-delete) tersimpan di Trash. Anda bisa restore atau delete permanently.",
          },
          {
            type: "list",
            items: [
              "Dashboard → Trash untuk lihat deleted items",
              "Restore: kembalikan item yang dihapus",
              "Delete Permanently: hapus permanen (tidak bisa dikembalikan)",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "api",
    title: "API Reference",
    icon: "code",
    description: "REST API endpoints untuk integrasi.",
    subsections: [
      {
        id: "auth-api",
        title: "Authentication",
        blocks: [
          {
            type: "table",
            rows: [
              ["Endpoint", "Method", "Description"],
              ["/api/auth/signup", "POST", "Register new user"],
              ["/api/auth/login", "POST", "Login with email/password"],
              ["/api/auth/logout", "POST", "Clear session cookie"],
              ["/api/auth/me", "GET/PATCH", "Get/update current user"],
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "Auth menggunakan JWT (HS256, 7-day expiry) dalam httpOnly cookie. Tidak perlu Authorization header — cookie dikirim otomatis.",
          },
        ],
      },
      {
        id: "documents-api",
        title: "Documents",
        blocks: [
          {
            type: "table",
            rows: [
              ["Endpoint", "Method", "Description"],
              ["/api/documents", "GET/POST", "List/create documents"],
              ["/api/documents/:id", "GET/PATCH/DELETE", "Get/update/delete document"],
              ["/api/documents/:id/duplicate", "POST", "Duplicate document"],
              ["/api/documents/:id/versions", "GET/POST/PUT", "List/create/restore versions"],
              ["/api/documents/:id/shares", "GET/POST", "List/create shares"],
              ["/api/documents/:id/shares/:shareId", "PATCH/DELETE", "Update/revoke share"],
              ["/api/documents/:id/export", "GET/POST", "List/create export jobs"],
              ["/api/documents/trash", "GET/PATCH", "List/restore deleted documents"],
              ["/api/export-jobs/:id/download", "GET", "Download export artifact"],
            ],
          },
        ],
      },
      {
        id: "books-api",
        title: "Books",
        blocks: [
          {
            type: "table",
            rows: [
              ["Endpoint", "Method", "Description"],
              ["/api/books", "GET/POST", "List/create books"],
              ["/api/books/:id", "GET/PATCH/DELETE", "Get/update/delete book"],
              ["/api/books/:id/chapters", "GET/POST/PUT", "List/create/reorder chapters"],
              ["/api/books/:id/chapters/:chapterId", "PATCH/DELETE", "Update/delete chapter"],
              ["/api/books/:id/toc", "GET", "Generate TOC"],
              ["/api/books/trash", "GET/PATCH", "List/restore deleted books"],
            ],
          },
        ],
      },
      {
        id: "saas-api",
        title: "Organizations & Templates",
        blocks: [
          {
            type: "table",
            rows: [
              ["Endpoint", "Method", "Description"],
              ["/api/organizations", "GET/POST", "List/create organizations"],
              ["/api/organizations/:id", "GET/PATCH/DELETE", "Get/update/delete org"],
              ["/api/organizations/:id/members", "GET/POST", "List/invite members"],
              ["/api/organizations/:id/members/:memberId", "PATCH/DELETE", "Update/remove member"],
              ["/api/templates", "GET/POST", "List/create templates"],
              ["/api/templates/:id", "GET/PATCH/DELETE", "Get/update/delete template"],
              ["/api/templates/:id/use", "POST", "Create document from template"],
              ["/api/shared", "GET", "List documents shared with me"],
              ["/api/usage", "GET", "Get usage stats"],
            ],
          },
        ],
      },
    ],
  },
];
