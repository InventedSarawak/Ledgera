-- Solana address/signature format migration
-- Tighten column types to match Solana's Base58-encoded pubkeys (max 44 chars) and signatures (max 88 chars).
-- Also adds payment_token column to track which SPL token was used for marketplace purchases.

-- 1. Users: wallet_address → VARCHAR(44) for Solana pubkeys
ALTER TABLE users ALTER COLUMN wallet_address TYPE VARCHAR(44);

-- 2. Projects: contract_address → VARCHAR(44) and rename to mint_address
ALTER TABLE projects RENAME COLUMN contract_address TO mint_address;
ALTER TABLE projects ALTER COLUMN mint_address TYPE VARCHAR(44);

-- 3. Purchases: tx_hash → VARCHAR(88) for Solana signatures
ALTER TABLE purchases ALTER COLUMN tx_hash TYPE VARCHAR(88);

-- 4. Certificates: tx_hash → VARCHAR(88) for Solana signatures
ALTER TABLE certificates ALTER COLUMN tx_hash TYPE VARCHAR(88);

-- 5. Add payment_token column to marketplace_listings (which SPL token is accepted)
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS payment_token VARCHAR(44) NOT NULL DEFAULT 'USDC';

-- 6. Add payment_token to purchases (which SPL token was used)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_token VARCHAR(44) NOT NULL DEFAULT 'USDC';


---- create above / drop below ----


-- 6. Remove payment_token from purchases
ALTER TABLE purchases DROP COLUMN IF EXISTS payment_token;

-- 5. Remove payment_token from marketplace_listings
ALTER TABLE marketplace_listings DROP COLUMN IF EXISTS payment_token;

-- 4. Revert certificates tx_hash
ALTER TABLE certificates ALTER COLUMN tx_hash TYPE TEXT;

-- 3. Revert purchases tx_hash
ALTER TABLE purchases ALTER COLUMN tx_hash TYPE TEXT;

-- 2. Revert projects mint_address
ALTER TABLE projects ALTER COLUMN mint_address TYPE TEXT;
ALTER TABLE projects RENAME COLUMN mint_address TO contract_address;

-- 1. Revert users wallet_address
ALTER TABLE users ALTER COLUMN wallet_address TYPE TEXT;
