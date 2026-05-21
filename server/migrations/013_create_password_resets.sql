-- Wave 8 (P0 auth recovery) — Password reset tokens.
--
-- One row per reset request. Token is the random 32-char hex string sent in
-- the email link. used_at flips to NOW() when the token is consumed; null until
-- then. expires_at enforces 1h validity. ON DELETE CASCADE so deleting a user
-- nukes their reset history.
--
-- Anti-enum: /forgot endpoint always returns 200 (doesn't reveal whether email
-- exists). Token is required for /reset — no fallback by email.

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets (token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets (expires_at);
