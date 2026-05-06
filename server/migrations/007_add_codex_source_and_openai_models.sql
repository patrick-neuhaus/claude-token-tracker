ALTER TABLE token_entries
  DROP CONSTRAINT IF EXISTS token_entries_source_check;

ALTER TABLE token_entries
  ADD CONSTRAINT token_entries_source_check
  CHECK (source IN ('claude-code','claude.ai','codex'));
