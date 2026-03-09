-- Add token_id to certificates for lot-based retirement tracking
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS token_id INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_certificates_token ON certificates(token_id);

---- create above / drop below ----

DROP INDEX IF EXISTS idx_certificates_token;
ALTER TABLE certificates DROP COLUMN IF EXISTS token_id;
