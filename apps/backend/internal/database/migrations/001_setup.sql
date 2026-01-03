-- Write your migrate up statements here

-- 1. Standard "updated_at" trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

---- create above / drop below ----

DROP FUNCTION IF EXISTS trigger_set_updated_at;
DROP EXTENSION IF EXISTS "pgcrypto";