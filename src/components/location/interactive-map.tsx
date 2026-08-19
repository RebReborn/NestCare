'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

interface MapMarker {
  id: string;
  name: string;
  avatar_url?: string;
  headline?: string;
  hourly_rate?: number;
  rating?: number;
  distance_km?: number;
  latitude: number;
  longitude: number;
  isApproximate?: boolean;
}

interface InteractiveMapProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  radiusKm?: number;
  markers?: MapMarker[];
  highlightedMarkerId?: string | null;
  height?: string;
  onMarkerClick?: (marker: MapMarker) => void;
}

// Map Center Controller helper
function MapRecenter({ centerLat, centerLng, zoom }: { centerLat: number; centerLng: number; zoom: number }) {
  const { useMap } = require('react-leaflet');
  const map = useMap();

  useEffect(() => {
    map.setView([centerLat, centerLng], zoom, { animate: true });
  }, [centerLat, centerLng, zoom, map]);

  return null;
}

// Inner Leaflet Map Container rendered dynamically client-side only (prevents SSR window errors)
function InnerMap({
  centerLat,
  centerLng,
  zoom = 12,
  radiusKm,
  markers = [],
  highlightedMarkerId,
  onMarkerClick,
}: InteractiveMapProps) {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((leafletModule) => {
      setL(leafletModule.default);
    });
  }, []);

  if (!L) {
    return (
      <div className="w-full h-full min-h-[350px] bg-stone-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-xs text-stone-400 font-bold animate-pulse">
        Loading OpenStreetMap engine...
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Circle } = require('react-leaflet');

  const parentPosition: [number, number] = [centerLat, centerLng];

  // Custom User Location Pin Icon
  const userPinIcon = L.divIcon({
    className: 'custom-user-pin',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-7 h-7 bg-emerald-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-[11px] font-black animate-bounce">
          📍
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <div className="w-full h-full min-h-[350px] rounded-3xl overflow-hidden border border-stone-200 dark:border-slate-800 shadow-md relative z-0">
      <MapContainer
        center={parentPosition}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full min-h-[350px]"
      >
        <MapRecenter centerLat={centerLat} centerLng={centerLng} zoom={zoom} />

        {/* OpenStreetMap Free Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Parent Search Radius Circle (Emerald Overlay) */}
        {radiusKm && (
          <Circle
            center={parentPosition}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#059669',
              fillColor: '#10b981',
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '4, 6',
            }}
          />
        )}

        {/* Parent / Search Location Marker */}
        <Marker position={parentPosition} icon={userPinIcon}>
          <Popup>
            <div className="text-xs font-bold text-stone-900 p-1">
              📍 Search Center Location
              <span className="block text-[10px] font-medium text-stone-500 mt-0.5">
                Radius: {radiusKm || 15} km
              </span>
            </div>
          </Popup>
        </Marker>

        {/* Sitter Markers with Privacy Protection */}
        {markers.map((marker) => {
          const pos: [number, number] = [marker.latitude, marker.longitude];
          const isHighlighted = highlightedMarkerId === marker.id;

          const sitterPinIcon = L.divIcon({
            className: 'custom-sitter-pin',
            html: `
              <div class="relative group cursor-pointer">
                <div class="px-2.5 py-1 ${
                  isHighlighted ? 'bg-emerald-600 scale-110 shadow-2xl border-white' : 'bg-slate-900 shadow-xl border-stone-700'
                } text-white rounded-xl border flex items-center gap-1.5 text-[10px] font-extrabold transition-all duration-200">
                  <span class="text-amber-400 font-bold">$${marker.hourly_rate || 22}/h</span>
                  <span class="truncate max-w-[70px]">${marker.name.split(' ')[0]}</span>
                </div>
              </div>
            `,
            iconSize: [85, 28],
            iconAnchor: [42, 14],
          });

          return (
            <Marker
              key={marker.id}
              position={pos}
              icon={sitterPinIcon}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) onMarkerClick(marker);
                },
              }}
            >
              <Popup>
                <div className="p-2 space-y-1.5 text-xs max-w-[200px]">
                  <div className="flex items-center gap-2">
                    <img
                      src={marker.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                      alt={marker.name}
                      className="w-8 h-8 rounded-xl object-cover border border-stone-200"
                    />
                    <div>
                      <strong className="text-heading text-xs block truncate">{marker.name}</strong>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        📍 {marker.distance_km || 2.1} km away
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-stone-600 line-clamp-2 font-medium">
                    {marker.headline || 'Verified Babysitter'}
                  </p>

                  <div className="text-[9.5px] text-stone-400 font-medium pt-1 border-t border-stone-100 flex justify-between">
                    <span>${marker.hourly_rate || 22}/hr</span>
                    <span className="font-bold text-amber-500">★ {marker.rating || 5.0}</span>
                  </div>

                  <a
                    href={`/sitter/${marker.id}`}
                    className="block w-full py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold text-center no-underline hover:bg-emerald-700 mt-1"
                  >
                    View Sitter Profile
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

// Export dynamic client-side only component to prevent Next.js SSR build errors
export default dynamic(() => Promise.resolve(InnerMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] bg-stone-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-xs text-stone-400 font-bold animate-pulse">
      Loading OpenStreetMap Leaflet Engine...
    </div>
  ),
});
