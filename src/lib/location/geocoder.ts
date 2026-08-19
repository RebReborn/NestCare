/**
 * Provider-Independent Geocoding Engine for NestCare
 *
 * Allows switching providers (Nominatim, Google Maps, Mapbox, Radar) without
 * changing application business logic.
 */

import { GeocoderProvider, NominatimProvider, GeocodeResult } from './providers/nominatim';
import { isValidCoords } from './validation';

export type { GeocodeResult, GeocoderProvider };

// In-memory cache for recent geocodes
const geocodeCache = new Map<string, GeocodeResult[]>();
const reverseCache = new Map<string, GeocodeResult | null>();

// Active provider (can be replaced dynamically or via config)
let activeProvider: GeocoderProvider = new NominatimProvider();

export function setGeocoderProvider(provider: GeocoderProvider) {
  activeProvider = provider;
}

/**
 * Geocode a location string (city, address, postal code) to coordinates
 */
export async function geocodeLocation(query: string): Promise<GeocodeResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  if (geocodeCache.has(cleanQuery)) {
    return geocodeCache.get(cleanQuery)!;
  }

  const results = await activeProvider.geocode(query);

  if (results.length > 0) {
    geocodeCache.set(cleanQuery, results);
  }

  return results;
}

/**
 * Reverse geocode latitude and longitude to human readable address
 */
export async function reverseGeocodeLocation(
  lat: number,
  lng: number
): Promise<GeocodeResult | null> {
  if (!isValidCoords(lat, lng)) return null;

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey)!;
  }

  const result = await activeProvider.reverseGeocode(lat, lng);
  reverseCache.set(cacheKey, result);

  return result;
}
