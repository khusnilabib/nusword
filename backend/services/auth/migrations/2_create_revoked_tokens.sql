-- =============================================================================
-- Migration 2: Create revoked_tokens table
-- =============================================================================
-- Service: auth
-- Purpose: Stores JWT tokens that have been explicitly revoked (user logout)
--          before their natural expiry. The auth handler checks this table on
--          every authenticated request so logout takes immediate effect.
--
-- Storage notes:
--   - token_id is the SHA-256 hex digest of the raw JWT string. We never store
--     the raw token, so a database leak cannot be replayed.
--   - expires_at mirrors the JWT's `exp` claim so a periodic cleanup job can
--     DELETE rows WHERE expires_at < NOW() without affecting live tokens.
--   - Primary key on token_id gives us idempotent inserts (ON CONFLICT DO
--     NOTHING) so logging out twice is a no-op.
--   - Idempotent: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- =============================================================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_id    TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the cleanup job (find expired rows to delete).
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at
    ON revoked_tokens (expires_at);

-- Index for per-user revocation lookups (e.g. "revoke all sessions for user X").
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user_id
    ON revoked_tokens (user_id);

COMMENT ON TABLE revoked_tokens IS 'Revoked JWT session tokens (logout). Checked by the auth handler on every authenticated request.';
COMMENT ON COLUMN revoked_tokens.token_id IS 'SHA-256 hex digest of the raw JWT. Never store the raw token.';
COMMENT ON COLUMN revoked_tokens.user_id IS 'The user ID from the JWT payload. Used for bulk session revocation.';
COMMENT ON COLUMN revoked_tokens.expires_at IS 'When the JWT naturally expires. Rows older than this can be purged.';
COMMENT ON COLUMN revoked_tokens.revoked_at IS 'When the token was explicitly revoked (logged out).';
