-- =============================================================================
-- Migration 1: Create books + book_chapters tables
-- =============================================================================
-- Service: books
-- Purpose: Stores books (PRD §15 — Book & Kitab Architecture) and their
--          nested chapter tree. Chapter content is held in the documents
--          service (book_chapters.document_id → documents.id).
-- Notes:
--   - Settings + front/back matter stored as TEXT (JSON strings).
--   - Soft-delete via deleted_at (NULL = live row).
--   - owner_email for multi-user ownership (Phase 9).
--   - Idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS books (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_email     TEXT NOT NULL,
    title           TEXT NOT NULL DEFAULT 'Untitled Book',
    subtitle        TEXT,
    author          TEXT,
    -- BookSettings JSON (stringified): binding, mirrorMargins, kitab, etc.
    settings        TEXT NOT NULL DEFAULT '{}',
    -- Front/back matter JSON arrays (stringified).
    front_matter    TEXT NOT NULL DEFAULT '[]',
    back_matter     TEXT NOT NULL DEFAULT '[]',
    organization_id TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_books_owner_email
    ON books (owner_email);
CREATE INDEX IF NOT EXISTS idx_books_deleted_at
    ON books (deleted_at);
CREATE INDEX IF NOT EXISTS idx_books_updated_at
    ON books (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_organization_id
    ON books (organization_id);

COMMENT ON TABLE books IS 'NUSWORD Book — collection of chapters with front/back matter, binding, kitab profile (PRD §15).';
COMMENT ON COLUMN books.owner_email IS 'Email of the book owner (Phase 9: multi-user).';
COMMENT ON COLUMN books.settings IS 'BookSettings JSON, stringified.';
COMMENT ON COLUMN books.front_matter IS 'Array of BookMatterEntry JSON, stringified.';
COMMENT ON COLUMN books.back_matter IS 'Array of BookMatterEntry JSON, stringified.';

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS book_chapters (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    book_id         TEXT NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    -- The document containing this chapter's content (lives in the documents service).
    document_id     TEXT,
    -- Chapter title (may differ from the linked document title).
    title           TEXT NOT NULL DEFAULT 'Untitled Chapter',
    -- Sort order within the parent (0-based).
    sort_order      INTEGER NOT NULL DEFAULT 0,
    -- Parent chapter id (NULL = top-level). Enables nested chapters.
    parent_id       TEXT,
    -- Whether this chapter starts on a new page (default true for books).
    start_new_page  BOOLEAN NOT NULL DEFAULT TRUE,
    -- Whether to include this chapter in the TOC.
    include_in_toc  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_chapters_book_id
    ON book_chapters (book_id);
CREATE INDEX IF NOT EXISTS idx_book_chapters_parent_id
    ON book_chapters (parent_id);
CREATE INDEX IF NOT EXISTS idx_book_chapters_sort_order
    ON book_chapters (book_id, sort_order);

COMMENT ON TABLE book_chapters IS 'Chapter tree nodes for a book (PRD §15 — nested chapters with ordering).';
COMMENT ON COLUMN book_chapters.document_id IS 'FK to documents.id (cross-service — chapters store content in the documents service).';
COMMENT ON COLUMN book_chapters.parent_id IS 'Parent chapter id; NULL = top-level chapter.';
