-- Worker RR: track onboarding completion server-side instead of localStorage-only.
-- Lets the wizard survive cross-browser / fresh-device login + powers "Refazer tour" button.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
