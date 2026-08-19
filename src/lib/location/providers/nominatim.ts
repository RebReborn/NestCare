/**
 * OpenStreetMap Nominatim Geocoding Provider for NestCare
 */

export interface GeocodeResult {
  placeId?: string | number;
  displayName: string;
  address: string;
  city: string;
  province: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
}

export interface GeocoderProvider {
  name: string;
  geocode(query: string): Promise<GeocodeResult[]>;
  reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null>;
}

export class NominatimProvider implements GeocoderProvider {
  name = 'nominatim';

  private userAgent = 'NestCare-ChildcareMarketplace/1.0 (contact@nestcare.app)';

  async geocode(query: string): Promise<GeocodeResult[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&addressdetails=1&limit=5`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => this.formatNominatimItem(item));
    } catch (err) {
      console.warn('[NominatimProvider] Geocoding error:', err);
      return [];
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (!data || data.error) return null;

      return this.formatNominatimItem(data);
    } catch (err) {
      console.warn('[NominatimProvider] Reverse geocoding error:', err);
      return null;
    }
  }

  private formatNominatimItem(item: any): GeocodeResult {
    const addr = item.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      item.display_name.split(',')[0] ||
      '';

    const province = addr.state || addr.region || '';
    const country = addr.country || '';
    const postalCode = addr.postcode || '';

    return {
      placeId: item.place_id,
      displayName: item.display_name,
      address: item.display_name,
      city,
      province,
      country,
      postalCode,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    };
  }
}
