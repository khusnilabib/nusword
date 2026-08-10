-- =============================================================================
-- Migration 1: Create users table
-- =============================================================================
-- Service: auth
-- Purpose: Stores user accounts with email/password credentials.
--          Replaces the Prisma `User` model.
-- Notes:
--   - Primary key is TEXT; the application generates IDs (cuid/uuid) and
--     supplies them on INSERT. A default of gen_random_uuid()::text is provided
--     as a safety net for raw inserts.
--   - Email is unique and indexed for fast lookups during authentication.
--   - created_at / updated_at use TIMESTAMPTZ with NOW() defaults.
--   - Idempotent: uses CREATE TABLE IF NOT EXISTS.
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index on email for fast auth lookups (already enforced by UNIQUE
-- constraint above, but an explicit index makes the intent clear and lets us
-- tune it later, e.g. with a partial index for active users).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

COMMENT ON TABLE users IS 'User accounts with email/password credentials (replaces Prisma User model).';
COMMENT ON COLUMN users.id IS 'Primary key (TEXT). Application generates cuid/uuid; defaults to gen_random_uuid()::text for raw inserts.';
COMMENT ON COLUMN users.email IS 'Unique user email address; used as login identifier.';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt/argon2 password hash. Never store plaintext passwords.';
COMMENT ON COLUMN users.name IS 'Optional display name.';
COMMENT ON COLUMN users.created_at IS 'Row creation timestamp (UTC).';
COMMENT ON COLUMN users.updated_at IS 'Row last-update timestamp (UTC). Application is responsible for refreshing this on UPDATE.';
