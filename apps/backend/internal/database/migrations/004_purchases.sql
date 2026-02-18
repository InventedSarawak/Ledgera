-- Create purchases table for tracking bought carbon credits
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id TEXT NOT NULL,
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    seller_id TEXT NOT NULL,
    amount DECIMAL(20, 2) NOT NULL CHECK (amount > 0),
    price_eth DECIMAL(20, 8) NOT NULL CHECK (price_eth > 0),
    total_eth DECIMAL(20, 8) NOT NULL CHECK (total_eth > 0),
    tx_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_project_id ON purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_purchases_listing_id ON purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);

---- create above / drop below ----

DROP INDEX IF EXISTS idx_purchases_created_at;
DROP INDEX IF EXISTS idx_purchases_listing_id;
DROP INDEX IF EXISTS idx_purchases_project_id;
DROP INDEX IF EXISTS idx_purchases_buyer_id;
DROP TABLE IF EXISTS purchases;
