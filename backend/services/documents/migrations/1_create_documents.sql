-- =============================================================================
-- Migration 1: Create documents + versions + shares + export_jobs tables
-- =============================================================================
-- Service: documents
-- Purpose: Stores documents (Tiptap JSON), immutable version snapshots,
--          shared-document grants, and export jobs.
-- Notes:
--   - Content + settings stored as JSONB (Postgres native) for queryability.
--   - Soft-delete via deleted_at (NULL = live row).
--   - owner_email replaces the single-user implicit ownership of the
--     Next.js prototype — Encore backend is multi-user via the auth service.
--   - Artifacts stored inline as BYTEA so the export endpoint is portable
--     across Encore replicas (no shared filesystem dependency).
--   - Idempotent: CREATE TABLE IF NOT EXISTS.
-- =============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_email     TEXT NOT NULL,
    title           TEXT NOT NULL DEFAULT 'Untitled',
    -- Tiptap/ProseMirror JSON document (stringified). See PRD §13.
    content         TEXT NOT NULL DEFAULT '{}',
    -- PageSettings JSON (stringified): pageSize, orientation, margins, etc.
    settings        TEXT NOT NULL DEFAULT '{}',
    organization_id TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Soft-delete: NULL = live, non-NULL = trashed (PRD §25).
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_owner_email
    ON documents (owner_email);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at
    ON documents (deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at
    ON documents (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id
    ON documents (organization_id);

COMMENT ON TABLE documents IS 'Canonical NUSWORD document — Tiptap JSON + PageSettings (replaces Prisma Document model).';
COMMENT ON COLUMN documents.owner_email IS 'Email of the document owner (Phase 9: multi-user).';
COMMENT ON COLUMN documents.content IS 'Tiptap/ProseMirror JSON document, stringified (PRD §13).';
COMMENT ON COLUMN documents.settings IS 'PageSettings JSON, stringified.';
COMMENT ON COLUMN documents.deleted_at IS 'Soft-delete timestamp; NULL = live (PRD §25).';

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS document_versions (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id  TEXT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    -- Snapshot of content + settings at version creation (immutable copy).
    content      TEXT NOT NULL,
    settings     TEXT NOT NULL,
    -- Sequential version number per document.
    version      INTEGER NOT NULL,
    -- Optional human-readable label (e.g. "Before AI rewrite").
    message      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id
    ON document_versions (document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version
    ON document_versions (document_id, version DESC);

COMMENT ON TABLE document_versions IS 'Immutable document version snapshots (PRD §13 — versions are immutable so users can restore).';
COMMENT ON COLUMN document_versions.content IS 'Snapshot of documents.content at version creation.';
COMMENT ON COLUMN document_versions.settings IS 'Snapshot of documents.settings at version creation.';

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared_documents (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id      TEXT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    -- Share role: "editor" | "commenter" | "viewer" (PRD §19 RBAC).
    role             TEXT NOT NULL DEFAULT 'viewer',
    -- Optional share token for public link sharing.
    share_token      TEXT UNIQUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, shared_with_email)
);

CREATE INDEX IF NOT EXISTS idx_shared_documents_document_id
    ON shared_documents (document_id);
CREATE INDEX IF NOT EXISTS idx_shared_documents_shared_with_email
    ON shared_documents (shared_with_email);

COMMENT ON TABLE shared_documents IS 'Per-document share grants (PRD §19 — sharing is separate from ownership).';

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS export_jobs (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id      TEXT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    -- Output format: "pdf" | "docx" | "html" | "svg" | "png"
    format           TEXT NOT NULL,
    -- Print preset: "screen" | "standard" | "highquality" | "booklet" | "custom"
    preset           TEXT NOT NULL DEFAULT 'standard',
    -- Job status: "pending" | "processing" | "completed" | "failed"
    status           TEXT NOT NULL DEFAULT 'pending',
    -- Inline artifact storage (BYTEA) — portable across Encore replicas.
    artifact_data    BYTEA,
    -- Original file name for download Content-Disposition.
    artifact_name    TEXT,
    -- File size in bytes.
    artifact_size    INTEGER,
    -- SHA-256 checksum of the artifact.
    checksum         TEXT,
    -- MIME type for the download response.
    mime_type        TEXT,
    -- JSON-stringified preflight report (PRD §16).
    preflight_report TEXT,
    -- Error message if status === 'failed'.
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    -- Retention: when the artifact expires (PRD §25).
    expires_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_document_id
    ON export_jobs (document_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status
    ON export_jobs (status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at
    ON export_jobs (created_at DESC);

COMMENT ON TABLE export_jobs IS 'Export job tracking — PDF/DOCX/HTML generation with preflight + retention (PRD §16).';
COMMENT ON COLUMN export_jobs.artifact_data IS 'Generated artifact bytes (stored inline for portability).';
