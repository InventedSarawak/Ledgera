-- Write your migrate up statements here

-- 1. Create PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add Polygon column to projects
ALTER TABLE projects ADD COLUMN location_polygon GEOMETRY(Polygon, 4326);

-- 3. Drop old lat/lng columns
ALTER TABLE projects DROP COLUMN location_lat;
ALTER TABLE projects DROP COLUMN location_lng;

-- 4. Create Spatial Index
CREATE INDEX IF NOT EXISTS idx_projects_location_polygon ON projects USING GIST (location_polygon);

---- create above / drop below ----

-- Revert spatial index
DROP INDEX IF EXISTS idx_projects_location_polygon;

-- Restore old columns
ALTER TABLE projects ADD COLUMN location_lat DECIMAL(9,6);
ALTER TABLE projects ADD COLUMN location_lng DECIMAL(9,6);

-- Drop polygon column
ALTER TABLE projects DROP COLUMN location_polygon;

-- Do not blindly drop postgis extension on rollback as other tables might use it
