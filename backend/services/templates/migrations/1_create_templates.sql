-- =============================================================================
-- Migration 1: Create templates
-- =============================================================================
-- Service: templates
-- Purpose: Stores reusable document/book templates that can be published to a
--          marketplace. Replaces the Prisma `Template` model.
-- Notes:
--   - All PKs are TEXT; the application generates IDs (cuid/uuid). A default
--     of gen_random_uuid()::text is provided as a safety net for raw inserts.
--   - organization_id is intentionally NOT FK-constrained: organizations live
--     in a separate Encore service/database. Integrity is enforced at the
--     application layer. (Prisma used onDelete: Cascade; here we leave
--     organization_id untouched when an org is deleted, since the cross-service
--     FK cannot be enforced. The application should null it out or reassign.)
--   - Idempotent: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: templates
-- -----------------------------------------------------------------------------
-- Template — a reusable document/book template (PRD §7: Template Engine).
-- Templates can be published to the marketplace for others to use.
-- type     : "document" | "book"
-- category : "academic" | "business" | "creative" | "religious" | "personal"
-- content  : Tiptap JSON content (for document templates).
-- settings : PageSettings or BookSettings JSON.
-- published: whether this template is published to the marketplace.
-- use_count: how many times this template was used.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title           TEXT NOT NULL,
    description     TEXT,
    type            TEXT NOT NULL DEFAULT 'document',
    category        TEXT NOT NULL DEFAULT 'personal',
    content         TEXT NOT NULL DEFAULT '',
    settings        TEXT NOT NULL DEFAULT '{}',
    published       BOOLEAN NOT NULL DEFAULT FALSE,
    organization_id TEXT,
    use_count       INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_published       ON templates (published);
CREATE INDEX IF NOT EXISTS idx_templates_category        ON templates (category);
CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON templates (organization_id);

COMMENT ON TABLE templates IS 'Reusable document/book templates (replaces Prisma Template model). PRD §7 Template Engine.';
COMMENT ON COLUMN templates.type            IS 'Template type: "document" | "book".';
COMMENT ON COLUMN templates.category        IS 'Category: "academic" | "business" | "creative" | "religious" | "personal".';
COMMENT ON COLUMN templates.content         IS 'Tiptap JSON content (for document templates).';
COMMENT ON COLUMN templates.settings        IS 'PageSettings or BookSettings JSON (stringified).';
COMMENT ON COLUMN templates.published       IS 'Whether this template is published to the marketplace.';
COMMENT ON COLUMN templates.organization_id IS 'Owning organization id (NULL = system template). Not FK-constrained (cross-service).';
COMMENT ON COLUMN templates.use_count       IS 'Usage count (how many times this template was used).';
