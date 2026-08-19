'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { MapPin, Loader2, X, Search } from 'lucide-react';
import { geocodeLocation, GeocodeResult } from '@/lib/location/geocoder';

interface LocationAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (suggestion: {
    address: string;
    city: string;
    province: string;
    latitude: number;
    longitude: number;
  }) => void;
  onLocationCommit?: (locationName: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  required?: boolean;
}

export default function LocationAutocompleteInput({
  value,
  onChange,
  onSelectSuggestion,
  onLocationCommit,
  placeholder = 'Enter city, street address, or postal code...',
  className = '',
  inputClassName = '',
  id,
  required = false,
}: LocationAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastCommittedValue = useRef<string>('');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced geocode suggestions fetcher using modular geocoder engine
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await geocodeLocation(value);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch (err) {
        console.warn('[LocationInput] Geocode error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (item: GeocodeResult) => {
    const fullAddress = item.displayName;
    const shortName = item.city || item.displayName.split(',')[0];

    lastCommittedValue.current = shortName;
    onChange(shortName);
    setIsOpen(false);

    if (onSelectSuggestion) {
      onSelectSuggestion({
        address: fullAddress,
        city: item.city,
        province: item.province,
        latitude: item.latitude,
        longitude: item.longitude,
      });
    }

    if (onLocationCommit) {
      onLocationCommit(shortName);
    }
  };

  const handleCommitCurrentText = async () => {
    if (!value || value.trim().length < 2) return;
    if (value.trim() === lastCommittedValue.current.trim()) return;

    try {
      setLoading(true);
      let targetItem: GeocodeResult | null = null;

      if (suggestions.length > 0) {
        targetItem = suggestions[0];
      } else {
        const freshResults = await geocodeLocation(value);
        if (freshResults.length > 0) {
          targetItem = freshResults[0];
        }
      }

      if (targetItem) {
        handleSelect(targetItem);
      }
    } catch (err) {
      console.warn('[LocationInput] Commit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitCurrentText();
    }
  };

  const handleBlur = () => {
    // Delay blur commit to allow clicking dropdown item if user clicked a suggestion
    setTimeout(() => {
      if (document.activeElement !== dropdownRef.current && !dropdownRef.current?.contains(document.activeElement)) {
        handleCommitCurrentText();
      }
    }, 200);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 shrink-0 pointer-events-none" />

        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={`w-full pl-10 pr-16 py-3 rounded-2xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-slate-100 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${inputClassName}`}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 text-stone-400 animate-spin" />
          ) : (
            value && (
              <button
                type="button"
                onClick={handleCommitCurrentText}
                title="Search location"
                className="p-1 text-emerald-600 hover:text-emerald-700 font-bold text-xs"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            )
          )}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSuggestions([]);
                setIsOpen(false);
                lastCommittedValue.current = '';
              }}
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 rounded-full"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-150 max-h-60 overflow-y-auto">
          <div className="p-2 text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-wider border-b border-stone-100 dark:border-slate-800 flex items-center justify-between">
            <span>Location Suggestions (Press Enter to Select Top)</span>
            <span className="text-[9px] text-emerald-600 font-mono">Geospatial Active</span>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-slate-800/60">
            {suggestions.map((item, index) => (
              <button
                key={item.placeId || index}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full p-3 text-left hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors flex items-start gap-2.5 group"
              >
                <MapPin className="h-4 w-4 text-stone-400 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                <div className="min-w-0 flex-1 text-xs">
                  <span className="font-bold text-stone-900 dark:text-slate-100 block truncate group-hover:text-primary transition-colors">
                    {item.city || item.displayName.split(',')[0]}
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-slate-400 line-clamp-1">
                    {item.displayName}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
