/**
 * Geospatial Distance and Privacy Utilities for NestCare
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 10) / 10;
}

/**
 * Returns bounding box lat/lng limits for quick DB range filtering
 */
export function getBoundingBoxKm(
  lat: number,
  lng: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusKm / 111.0; // 1 deg lat ~ 111 km
  const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/**
 * Privacy protection: returns slightly offset/rounded coordinates to prevent
 * revealing a sitter's exact home address until a booking is confirmed.
 */
export function getApproximateCoords(
  lat: number,
  lng: number,
  seedString = ''
): { latitude: number; longitude: number } {
  // Simple deterministic hash offset based on seed or rounded precision (~300m-500m area)
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  
  const offsetLat = (((hash % 100) - 50) / 10000) * 0.003;
  const offsetLng = ((((hash >> 2) % 100) - 50) / 10000) * 0.003;

  return {
    latitude: Math.round((lat + offsetLat) * 1000) / 1000,
    longitude: Math.round((lng + offsetLng) * 1000) / 1000,
  };
}
