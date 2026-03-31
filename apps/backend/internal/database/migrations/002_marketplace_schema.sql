-- Write your migrate up statements here

-- 1. DEFINE ENUMS (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'SUPPLIER', 'BUYER');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'project_status' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE project_status AS ENUM ('PENDING', 'APPROVED', 'DEPLOYED', 'DRAFT', 'REJECTED');
    END IF;
END
$$;

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT NOT NULL UNIQUE,       
    email TEXT NOT NULL,
    wallet_address TEXT UNIQUE,          
    role user_role NOT NULL DEFAULT 'BUYER',
    
    deleted_at TIMESTAMP,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_timestamp_users' AND tgrelid = 'users'::regclass
    ) THEN
        CREATE TRIGGER set_timestamp_users
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE PROCEDURE trigger_set_updated_at();
    END IF;
END
$$;


-- 3. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id TEXT REFERENCES users(clerk_id),
    
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,

    audit_report_url TEXT,
    
    location_lat DECIMAL(9,6),
    location_lng DECIMAL(9,6),
    area DECIMAL,
    
    carbon_amount_total NUMERIC(20, 2) DEFAULT 0, 
    price_per_tonne NUMERIC(20, 2) DEFAULT 0, 
    
    contract_address TEXT UNIQUE,  
    token_symbol TEXT,               
    
    status project_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_timestamp_projects' AND tgrelid = 'projects'::regclass
    ) THEN
        CREATE TRIGGER set_timestamp_projects
        BEFORE UPDATE ON projects
        FOR EACH ROW
        EXECUTE PROCEDURE trigger_set_updated_at();
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_projects_supplier ON projects(supplier_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);


-- 4. MARKETPLACE LISTINGS (lot-based, ERC-1155)
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    seller_id TEXT NOT NULL,
    token_id INTEGER NOT NULL,                             -- ERC-1155 lot ID
    scaled_amount BIGINT NOT NULL CHECK (scaled_amount > 0), -- Amount in scaled units (1 credit = 1000)
    price_eth DECIMAL(20, 8) NOT NULL CHECK (price_eth > 0), -- Price per whole credit in ETH
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_project_id ON marketplace_listings(project_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active ON marketplace_listings(active);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_token_id ON marketplace_listings(token_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at ON marketplace_listings(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_marketplace_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketplace_listings_updated_at
BEFORE UPDATE ON marketplace_listings
FOR EACH ROW
EXECUTE FUNCTION update_marketplace_listings_updated_at();


-- 5. PURCHASES (lot-based, ERC-1155)
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id TEXT NOT NULL,
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    seller_id TEXT NOT NULL,
    token_id INTEGER NOT NULL,                               -- ERC-1155 lot ID assigned to this purchase
    scaled_amount BIGINT NOT NULL CHECK (scaled_amount > 0), -- Amount in scaled units
    price_eth DECIMAL(20, 8) NOT NULL CHECK (price_eth > 0), -- Price per whole credit
    total_eth DECIMAL(20, 8) NOT NULL CHECK (total_eth > 0), -- Total paid
    tx_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_project_id ON purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_purchases_listing_id ON purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_purchases_token_id ON purchases(token_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);


-- 6. CERTIFICATES
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT REFERENCES users(clerk_id),
    project_id UUID REFERENCES projects(id),
    
    tx_hash TEXT NOT NULL UNIQUE,     
    amount_retired NUMERIC(36, 18) NOT NULL,
    retirement_reason TEXT,
    pdf_url TEXT,                     
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_owner ON certificates(owner_id);
CREATE INDEX IF NOT EXISTS idx_certificates_project ON certificates(project_id);


---- create above / drop below ----

DROP INDEX IF EXISTS idx_certificates_project;
DROP INDEX IF EXISTS idx_certificates_owner;
DROP INDEX IF EXISTS idx_purchases_created_at;
DROP INDEX IF EXISTS idx_purchases_token_id;
DROP INDEX IF EXISTS idx_purchases_listing_id;
DROP INDEX IF EXISTS idx_purchases_project_id;
DROP INDEX IF EXISTS idx_purchases_buyer_id;
DROP INDEX IF EXISTS idx_marketplace_listings_created_at;
DROP INDEX IF EXISTS idx_marketplace_listings_token_id;
DROP INDEX IF EXISTS idx_marketplace_listings_active;
DROP INDEX IF EXISTS idx_marketplace_listings_seller_id;
DROP INDEX IF EXISTS idx_marketplace_listings_project_id;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_supplier;

DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS marketplace_listings;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS user_role;