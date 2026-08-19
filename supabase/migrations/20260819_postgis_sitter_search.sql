-- Enable PostGIS extension for high-performance geospatial spatial indexing
CREATE EXTENSION IF NOT EXISTS "postgis";

-- PostGIS RPC search function for sitters within spatial radius
CREATE OR REPLACE FUNCTION search_sitters_geospatial(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 25.0,
  p_max_rate NUMERIC DEFAULT 100.0,
  p_min_experience INT DEFAULT 0,
  p_query TEXT DEFAULT ''
)
RETURNS TABLE (
  profile_id UUID,
  display_name VARCHAR,
  avatar_url TEXT,
  headline VARCHAR,
  bio TEXT,
  hourly_rate NUMERIC,
  years_experience INT,
  background_check_status verification_status,
  verification_status verification_status,
  cover_url TEXT,
  city VARCHAR,
  province VARCHAR,
  service_latitude DOUBLE PRECISION,
  service_longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  search_point GEOGRAPHY;
BEGIN
  search_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY;

  RETURN QUERY
  SELECT 
    p.id AS profile_id,
    p.display_name,
    p.avatar_url,
    sp.headline,
    p.bio,
    sp.hourly_rate,
    sp.years_experience,
    sp.background_check_status,
    p.verification_status,
    sp.cover_url,
    sp.city,
    sp.province,
    sp.service_latitude,
    sp.service_longitude,
    ROUND((ST_Distance(
      ST_SetSRID(ST_MakePoint(COALESCE(sp.service_longitude, p.location_lng, -123.1207), COALESCE(sp.service_latitude, p.location_lat, 49.2827)), 4326)::GEOGRAPHY,
      search_point
    ) / 1000.0)::NUMERIC, 1)::DOUBLE PRECISION AS distance_km
  FROM profiles p
  JOIN sitter_profiles sp ON p.id = sp.id
  WHERE p.role = 'sitter'
    AND sp.is_available = TRUE
    AND sp.hourly_rate <= p_max_rate
    AND sp.years_experience >= p_min_experience
    AND (
      p_query = '' OR
      p.display_name ILIKE '%' || p_query || '%' OR
      sp.headline ILIKE '%' || p_query || '%' OR
      sp.city ILIKE '%' || p_query || '%' OR
      p.bio ILIKE '%' || p_query || '%'
    )
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(COALESCE(sp.service_longitude, p.location_lng, -123.1207), COALESCE(sp.service_latitude, p.location_lat, 49.2827)), 4326)::GEOGRAPHY,
      search_point,
      p_radius_km * 1000.0
    )
  ORDER BY distance_km ASC;
END;
$$;
