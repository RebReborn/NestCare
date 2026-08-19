/**
 * Location Validation Utility Module for NestCare
 */

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export function isValidLatitude(lat: any): boolean {
  const num = typeof lat === 'number' ? lat : parseFloat(lat);
  return !isNaN(num) && num >= -90 && num <= 90;
}

export function isValidLongitude(lng: any): boolean {
  const num = typeof lng === 'number' ? lng : parseFloat(lng);
  return !isNaN(num) && num >= -180 && num <= 180;
}

export function isValidCoords(lat: any, lng: any): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

/**
 * Clamp search radius between min (1 km) and max (100 km). Default is 15 km.
 */
export function clampRadiusKm(radius: any, defaultRadius = 15): number {
  const num = typeof radius === 'number' ? radius : parseFloat(radius);
  if (isNaN(num) || num <= 0) return defaultRadius;
  return Math.min(Math.max(num, 1), 100);
}

/**
 * Sanitize query text
 */
export function sanitizeLocationQuery(query: string): string {
  if (!query) return '';
  return query.trim().replace(/[<>]/g, '').substring(0, 150);
}
