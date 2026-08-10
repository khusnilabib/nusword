-- =============================================================================
-- Migration 1: Create usage_events
-- =============================================================================
-- Service: usage
-- Purpose: Tracks user activity for metering/analytics (PRD §32: success
--          metrics). Phase 7: tracking only, no billing.
--          Replaces the Prisma `UsageEvent` model.
-- Notes:
--   - All PKs are TEXT; the application generates IDs (cuid/uuid). A default
--     of gen_random_uuid()::text is provided as a safety net for raw inserts.
--   - email is NOT FK-constrained to auth.users (cross-service). Integrity is
--     enforced at the application layer.
--   - resource_id is intentionally NOT FK-constrained: the referenced resource
--     may live in a different service (documents, books, templates).
--   - metadata is a JSON string (no JSONB enforcement to keep inserts simple
--     and service-agnostic; the application is responsible for valid JSON).
--   - Idempotent: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: usage_events
-- -----------------------------------------------------------------------------
-- Usage event — tracks user activity for metering (PRD §32: success metrics).
-- type       : "document.create" | "document.export" | "book.create" |
--              "template.use" | etc.
-- resource_id: id of the referenced resource (document id, book id, etc.).
-- metadata   : additional JSON metadata.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_events (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email       TEXT NOT NULL,
    type        TEXT NOT NULL,
    resource_id TEXT,
    metadata    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_email      ON usage_events (email);
CREATE INDEX IF NOT EXISTS idx_usage_events_type       ON usage_events (type);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events (created_at);

COMMENT ON TABLE usage_events IS 'Usage events — user activity for metering/analytics (replaces Prisma UsageEvent model). PRD §32.';
COMMENT ON COLUMN usage_events.email       IS 'User email (Phase 7: no auth). Not FK-constrained (cross-service).';
COMMENT ON COLUMN usage_events.type        IS 'Event type, e.g. "document.create", "document.export", "book.create", "template.use".';
COMMENT ON COLUMN usage_events.resource_id IS 'Resource ID (document id, book id, etc.). Not FK-constrained (cross-service).';
COMMENT ON COLUMN usage_events.metadata    IS 'Additional metadata (JSON string).';
COMMENT ON COLUMN usage_events.created_at  IS 'Event timestamp (UTC).';
