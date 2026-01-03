-- Write your migrate up statements here

CREATE TABLE wallets (
    user_id TEXT PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_address TEXT UNIQUE NOT NULL,
    metadata_url TEXT NOT NULL,
    total_supply NUMERIC(78, 0) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE indexer_state (
    chain_id INT PRIMARY KEY,
    last_block BIGINT NOT NULL
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_updated_at();

---- create above / drop below ----

-- Write your migrate down statements here. If this migration is irreversible
-- Then delete the separator line above.
