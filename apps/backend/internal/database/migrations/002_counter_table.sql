-- Create counters table
CREATE TABLE IF NOT EXISTS counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_counters_user_id ON counters(user_id);

-- Add comment
COMMENT ON TABLE counters IS 'Stores counter values for each user';
COMMENT ON COLUMN counters.id IS 'Unique identifier for the counter';
COMMENT ON COLUMN counters.user_id IS 'User ID from authentication provider';
COMMENT ON COLUMN counters.count IS 'Current count value';
COMMENT ON COLUMN counters.created_at IS 'Timestamp when counter was created';
COMMENT ON COLUMN counters.updated_at IS 'Timestamp when counter was last updated';
