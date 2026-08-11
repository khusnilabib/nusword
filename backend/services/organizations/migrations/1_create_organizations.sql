-- =============================================================================
-- Migration 1: Create organizations and organization_members
-- =============================================================================
-- Service: organizations
-- Purpose: Stores organizations (team workspaces) and their memberships.
--          Replaces the Prisma models:
--            - Organization
--            - OrganizationMember
-- Notes:
--   - All PKs are TEXT; the application generates IDs (cuid/uuid). A default
--     of gen_random_uuid()::text is provided as a safety net for raw inserts.
--   - organization_members.organization_id is FK to organizations(id) with
--     ON DELETE CASCADE: deleting an org removes all its members.
--   - UNIQUE(organization_id, email) prevents duplicate memberships.
--   - email is NOT FK-constrained to the auth.users table: users live in a
--     separate Encore service/database. Integrity is enforced at the
--     application layer.
--   - Idempotent: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: organizations
-- -----------------------------------------------------------------------------
-- Organization — a team/workspace that owns documents, books, and templates
-- (PRD §19: RBAC). Phase 7: organizations without billing. Used for sharing
-- and collaboration.
-- slug       : unique URL-friendly identifier.
-- deleted_at : soft-delete marker (PRD §25 trash bin).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name        TEXT,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations (deleted_at);

COMMENT ON TABLE organizations IS 'Organizations — team workspaces owning documents/books/templates (replaces Prisma Organization model). PRD §19.';
COMMENT ON COLUMN organizations.slug        IS 'Unique URL-friendly identifier for the organization.';
COMMENT ON COLUMN organizations.description IS 'Optional human-readable description.';
COMMENT ON COLUMN organizations.deleted_at  IS 'Soft-delete marker (PRD §25). NULL = active; non-NULL = trashed.';

-- -----------------------------------------------------------------------------
-- Table: organization_members
-- -----------------------------------------------------------------------------
-- Organization membership with role (PRD §19: RBAC roles).
-- role: "owner" | "admin" | "editor" | "commenter" | "viewer"
-- UNIQUE(organization_id, email) enforces one membership per (org, email).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_members (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL,
    email           TEXT NOT NULL,
    name            TEXT,
    role            TEXT NOT NULL DEFAULT 'viewer',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_organization_members_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT uq_organization_members_organization_email UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_email           ON organization_members (email);

COMMENT ON TABLE organization_members IS 'Organization memberships with RBAC roles (replaces Prisma OrganizationMember model). PRD §19.';
COMMENT ON COLUMN organization_members.email IS 'Member email (identified by email). Not FK-constrained (cross-service).';
COMMENT ON COLUMN organization_members.name  IS 'Optional display name.';
COMMENT ON COLUMN organization_members.role  IS 'Role: "owner" | "admin" | "editor" | "commenter" | "viewer".';
