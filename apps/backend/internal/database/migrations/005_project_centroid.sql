-- Write your migrate up statements here

-- Add auto-computed centroid coordinates
-- NOTE: Due to frontend sending [lat, lng] as [0, 1] in GeoJSON instead of [lng, lat],
-- PostGIS interprets X (longitude) as lat and Y (latitude) as lng.
ALTER TABLE projects 
ADD COLUMN location_lat DECIMAL(9,6) GENERATED ALWAYS AS (CAST(ST_X(ST_Centroid(location_polygon)) AS DECIMAL(9,6))) STORED;

ALTER TABLE projects 
ADD COLUMN location_lng DECIMAL(9,6) GENERATED ALWAYS AS (CAST(ST_Y(ST_Centroid(location_polygon)) AS DECIMAL(9,6))) STORED;

---- create above / drop below ----

ALTER TABLE projects DROP COLUMN location_lat;
ALTER TABLE projects DROP COLUMN location_lng;
