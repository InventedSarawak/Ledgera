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


-- 4. MARKETPLACE LISTINGS
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    
    listing_id_on_chain NUMERIC NOT NULL UNIQUE, 
    
    seller_address TEXT NOT NULL,
    
    price_per_token NUMERIC(36, 18) NOT NULL,
    quantity_available NUMERIC(36, 18) NOT NULL,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_timestamp_listings' AND tgrelid = 'listings'::regclass
    ) THEN
        CREATE TRIGGER set_timestamp_listings
        BEFORE UPDATE ON listings
        FOR EACH ROW
        EXECUTE PROCEDURE trigger_set_updated_at();
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_listings_project ON listings(project_id);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(active);


-- 5. CERTIFICATES
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
DROP INDEX IF EXISTS idx_listings_active;
DROP INDEX IF EXISTS idx_listings_project;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_supplier;

DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS user_role;