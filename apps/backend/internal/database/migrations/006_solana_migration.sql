-- Write your migrate up statements here

-- 1. Rename ETH specific pricing columns to generic pricing columns (for SOL / USDC / Tokens)
ALTER TABLE marketplace_listings RENAME COLUMN price_eth TO price;
ALTER TABLE purchases RENAME COLUMN price_eth TO price;
ALTER TABLE purchases RENAME COLUMN total_eth TO total_price;

-- Rename the check constraints so they make sense
ALTER TABLE marketplace_listings RENAME CONSTRAINT marketplace_listings_price_eth_check TO marketplace_listings_price_check;
ALTER TABLE purchases RENAME CONSTRAINT purchases_price_eth_check TO purchases_price_check;
ALTER TABLE purchases RENAME CONSTRAINT purchases_total_eth_check TO purchases_total_price_check;

-- 2. Convert token_id (ERC-1155 Integer) to TEXT to support Solana Base58 Mint Addresses or Pubkeys
ALTER TABLE marketplace_listings ALTER COLUMN token_id TYPE TEXT USING token_id::TEXT;
ALTER TABLE purchases ALTER COLUMN token_id TYPE TEXT USING token_id::TEXT;
ALTER TABLE certificates ALTER COLUMN token_id TYPE TEXT USING token_id::TEXT;


---- create above / drop below ----


-- 1. Revert token_id back to INTEGER
-- Note: This will fail if the column contains non-integer Base58 strings! 
-- Be careful when rolling back from a Solana environment.
ALTER TABLE certificates ALTER COLUMN token_id TYPE INTEGER USING token_id::INTEGER;
ALTER TABLE purchases ALTER COLUMN token_id TYPE INTEGER USING token_id::INTEGER;
ALTER TABLE marketplace_listings ALTER COLUMN token_id TYPE INTEGER USING token_id::INTEGER;

-- 2. Revert Constraint names
ALTER TABLE purchases RENAME CONSTRAINT purchases_total_price_check TO purchases_total_eth_check;
ALTER TABLE purchases RENAME CONSTRAINT purchases_price_check TO purchases_price_eth_check;
ALTER TABLE marketplace_listings RENAME CONSTRAINT marketplace_listings_price_check TO marketplace_listings_price_eth_check;

-- 3. Revert column names
ALTER TABLE purchases RENAME COLUMN total_price TO total_eth;
ALTER TABLE purchases RENAME COLUMN price TO price_eth;
ALTER TABLE marketplace_listings RENAME COLUMN price TO price_eth;
