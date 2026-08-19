-- Ensure sitter location and geospatial columns exist in sitter_profiles
ALTER TABLE sitter_profiles
  ADD COLUMN IF NOT EXISTS service_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS service_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS service_radius_km INT DEFAULT 15,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS province VARCHAR(100),
  ADD COLUMN IF NOT EXISTS service_area TEXT,
  ADD COLUMN IF NOT EXISTS travel_to_parent BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS accept_dropoff BOOLEAN DEFAULT FALSE;
