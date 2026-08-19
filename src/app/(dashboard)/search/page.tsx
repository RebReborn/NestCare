'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search as SearchIcon, SlidersHorizontal, Star, ShieldCheck, 
  MapPin, Loader2, ChevronDown, ChevronUp, ChevronRight,
  MessageCircle, Calendar, LayoutGrid, List, ArrowUpDown, 
  Sparkles, CheckCircle2, X, RefreshCw, Edit2, Check, Award
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import InteractiveMap from '@/components/location/interactive-map';
import LocationAutocompleteInput from '@/components/location/location-autocomplete-input';
import { geocodeLocation, reverseGeocodeLocation } from '@/lib/location/geocoder';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [sitters, setSitters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  
  // Search, Filter, Sort & View states
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('query') || '');
  const [maxRate, setMaxRate] = useState(40);
  const [selectedService, setSelectedService] = useState('');
  const [minExperience, setMinExperience] = useState(0);
  const [sortBy, setSortBy] = useState<'rank' | 'rating' | 'price_low' | 'price_high' | 'experience' | 'distance'>('rank');
  const [activeFilterChip, setActiveFilterChip] = useState<'all' | 'top_rated' | 'verified' | 'budget'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Geospatial Location Search State
  const [parentLat, setParentLat] = useState(49.2827);
  const [parentLng, setParentLng] = useState(-123.1207);
  const [searchRadiusKm, setSearchRadiusKm] = useState(25);
  const [isLocating, setIsLocating] = useState(false);
  const [locationAddressName, setLocationAddressName] = useState(searchParams?.get('location') || 'Vancouver, BC');

  // Map & List synchronization state
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);

  // Initial geocode if location param provided in URL
  useEffect(() => {
    const initLocation = searchParams?.get('location');
    if (initLocation) {
      geocodeLocation(initLocation).then((results) => {
        if (results.length > 0) {
          setParentLat(results[0].latitude);
          setParentLng(results[0].longitude);
          setLocationAddressName(results[0].city || results[0].displayName.split(',')[0]);
        }
      });
    } else {
      // No URL param — try loading the parent's saved home location from their profile
      async function loadSavedParentLocation() {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: prof } = await supabase
            .from('profiles')
            .select('location_lat, location_lng, role')
            .eq('id', user.id)
            .single();

          if (prof?.role === 'parent' && prof.location_lat && prof.location_lng) {
            setParentLat(prof.location_lat);
            setParentLng(prof.location_lng);

            // Reverse geocode to get human-readable address label
            const reverseResult = await reverseGeocodeLocation(prof.location_lat, prof.location_lng);
            if (reverseResult) {
              setLocationAddressName(
                reverseResult.city
                  ? `${reverseResult.city}${reverseResult.province ? ', ' + reverseResult.province : ''}`
                  : reverseResult.displayName.split(',')[0]
              );
            }
          }
        } catch (err) {
          // Silent — keep default Vancouver coordinates
        }
      }
      loadSavedParentLocation();
    }
  }, [searchParams]);

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleUseMyLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setParentLat(lat);
          setParentLng(lng);

          const reverseResult = await reverseGeocodeLocation(lat, lng);
          if (reverseResult) {
            setLocationAddressName(reverseResult.city || reverseResult.displayName.split(',')[0]);
          } else {
            setLocationAddressName('Current Device Location');
          }
          setIsLocating(false);
        },
        (err) => {
          console.warn('Geolocation denied/error:', err);
          setIsLocating(false);
        }
      );
    }
  };

  useEffect(() => {
    async function fetchGeospatialSitters() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);

        const verifiedOnly = activeFilterChip === 'verified';
        const queryUrl = `/api/sitters/search?lat=${parentLat}&lng=${parentLng}&radius=${searchRadiusKm}&maxRate=${maxRate}&minExperience=${minExperience}&verified=${verifiedOnly}&sortBy=${sortBy}&query=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(queryUrl);
        const resData = await res.json();

        if (resData.success) {
          setSitters(resData.sitters || []);
        } else {
          throw new Error(resData.error || 'Failed to load sitters.');
        }
      } catch (err: any) {
        console.error('Geospatial search error:', err);
        setError(err.message || 'Failed to load sitters');
      } finally {
        setLoading(false);
      }
    }

    fetchGeospatialSitters();
  }, [parentLat, parentLng, searchRadiusKm, maxRate, minExperience, activeFilterChip, sortBy, searchQuery]);

  // Client-side quick filter chips
  const filteredSitters = sitters.filter((sitter) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (sitter.name || '').toLowerCase().includes(q);
      const cityMatch = (sitter.city || '').toLowerCase().includes(q);
      const bioMatch = (sitter.bio || '').toLowerCase().includes(q);
      const headlineMatch = (sitter.headline || '').toLowerCase().includes(q);
      if (nameMatch || cityMatch || bioMatch || headlineMatch) return true;
    }

    const matchesRate = sitter.hourly_rate <= maxRate;
    const matchesService = selectedService ? (sitter.services || []).includes(selectedService) : true;
    const matchesExp = sitter.years_experience >= minExperience;

    let matchesChip = true;
    if (activeFilterChip === 'top_rated') {
      matchesChip = Number(sitter.rating || sitter.average_rating || 0) >= 4.8;
    } else if (activeFilterChip === 'verified') {
      matchesChip = sitter.is_verified || sitter.background_check_status === 'fully_verified';
    } else if (activeFilterChip === 'budget') {
      matchesChip = sitter.hourly_rate <= 25;
    }

    return matchesRate && matchesService && matchesExp && matchesChip;
  });

  const resetAllFilters = () => {
    setSearchQuery('');
    setMaxRate(50);
    setSelectedService('');
    setMinExperience(0);
    setActiveFilterChip('all');
    setSortBy('rank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-bold border border-white/10">
            <Sparkles className="h-3.5 w-3.5" /> Verified Geospatial Childcare Network
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight">
            Find Trusted Caregivers Near You
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Search background-checked, top-rated babysitters and nannies in your neighborhood.
          </p>
        </div>
      </div>

      {/* GEOSPATIAL LOCATION & RADIUS CONTROL BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-stone-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="px-3.5 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-primary dark:text-emerald-300 rounded-2xl font-bold flex items-center gap-1.5 active-press hover:bg-emerald-100 transition-colors shrink-0"
            title="Use my device location"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <MapPin className="h-4 w-4 text-emerald-600 fill-emerald-100" />
            )}
            <span>Use My Location</span>
          </button>

          <div className="flex-1 min-w-[220px] w-full">
            <LocationAutocompleteInput
              value={locationAddressName}
              onChange={(val) => setLocationAddressName(val)}
              onSelectSuggestion={(sugg) => {
                setLocationAddressName(sugg.city || sugg.address.split(',')[0]);
                setParentLat(sugg.latitude);
                setParentLng(sugg.longitude);
              }}
              onLocationCommit={async (locName) => {
                const results = await geocodeLocation(locName);
                if (results.length > 0) {
                  setParentLat(results[0].latitude);
                  setParentLng(results[0].longitude);
                }
              }}
              placeholder="Type city or address to search..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-stone-500 dark:text-slate-400 font-bold shrink-0">Search Radius:</span>
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {[5, 10, 25, 50].map((radius) => (
              <button
                key={radius}
                onClick={() => setSearchRadiusKm(radius)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  searchRadiusKm === radius
                    ? 'bg-primary text-white shadow-2xs'
                    : 'bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 hover:bg-stone-100'
                }`}
              >
                {radius} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LOCATION CONFIRMATION BANNER */}
      <div className="bg-emerald-950/90 dark:bg-slate-900 border border-emerald-800/40 text-emerald-100 px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs font-semibold shadow-xs">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            Searching within <strong className="text-white">{searchRadiusKm} km</strong> of <strong className="text-white">{locationAddressName}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-emerald-300 font-mono">🔒 Neighborhood level privacy protected</span>
          <button 
            onClick={() => setViewMode(viewMode === 'map' ? 'grid' : 'map')} 
            className="text-emerald-300 hover:text-white underline text-[11px] font-bold"
          >
            {viewMode === 'map' ? 'Switch to Grid View' : 'View on Map'}
          </button>
        </div>
      </div>

      {/* Search Input & Controls Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search by caregiver name, headline, or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-xs font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setShowAdvancedFilters(v => !v)}
            className={`px-4 py-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active-press shrink-0 ${
              showAdvancedFilters 
                ? 'bg-primary text-white border-primary shadow-xs' 
                : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-200 hover:bg-stone-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            { (maxRate < 50 || selectedService || minExperience > 0) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Filter Quick Chips Row */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveFilterChip('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all active-press ${
                activeFilterChip === 'all'
                  ? 'bg-emerald-800 dark:bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700'
              }`}
            >
              All Caregivers ({sitters.length})
            </button>
            <button
              onClick={() => setActiveFilterChip('top_rated')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all active-press flex items-center gap-1.5 ${
                activeFilterChip === 'top_rated'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-200 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              Top Rated (4.8+)
            </button>
            <button
              onClick={() => setActiveFilterChip('verified')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all active-press flex items-center gap-1.5 ${
                activeFilterChip === 'verified'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 fill-emerald-50" />
              Background Checked
            </button>
            <button
              onClick={() => setActiveFilterChip('budget')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all active-press ${
                activeFilterChip === 'budget'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-200 hover:bg-sky-50 hover:text-sky-700'
              }`}
            >
              Under $25/hr
            </button>
          </div>

          {/* Sort & View Mode Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-600 dark:text-slate-300">
              <ArrowUpDown className="h-3.5 w-3.5 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent outline-none cursor-pointer text-xs font-bold text-heading dark:text-white"
              >
                <option value="rank">Recommended Rank</option>
                <option value="distance">Distance: Nearest First</option>
                <option value="rating">Top Rated</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>

            <div className="flex items-center bg-stone-100 dark:bg-slate-800 p-1 rounded-xl border border-stone-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 shadow-2xs text-heading dark:text-white font-bold' : 'text-stone-400 hover:text-stone-600'}`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow-2xs text-heading dark:text-white font-bold' : 'text-stone-400 hover:text-stone-600'}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${viewMode === 'map' ? 'bg-primary text-white shadow-2xs' : 'text-stone-600 dark:text-slate-300 hover:text-stone-900'}`}
                title="OpenStreetMap Radius View"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Map View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm animate-fade-in">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-extrabold text-stone-400 dark:text-slate-400 uppercase tracking-wider">
                  Max Base Hourly Rate
                </label>
                <span className="text-xs font-black text-primary">${maxRate}/hr</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="1"
                value={maxRate}
                onChange={(e) => setMaxRate(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer h-1.5 bg-stone-100 rounded-lg appearance-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-stone-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Service Specialty
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full p-3 rounded-2xl border border-stone-200 dark:border-slate-800 text-xs outline-none bg-stone-50 dark:bg-slate-800 font-bold text-stone-700 dark:text-slate-200"
              >
                <option value="">Any Offered Service</option>
                <option value="In-home Babysitting">In-home Babysitting</option>
                <option value="Overnight Care">Overnight Care</option>
                <option value="After-school Pickup">After-school Pickup</option>
                <option value="Daycare Pickup">Daycare Pickup</option>
                <option value="Weekend Care">Weekend Care</option>
                <option value="Emergency Care">Emergency Care</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-stone-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Minimum Experience
              </label>
              <select
                value={minExperience}
                onChange={(e) => setMinExperience(Number(e.target.value))}
                className="w-full p-3 rounded-2xl border border-stone-200 dark:border-slate-800 text-xs outline-none bg-stone-50 dark:bg-slate-800 font-bold text-stone-700 dark:text-slate-200"
              >
                <option value="0">Any Experience</option>
                <option value="2">2+ Years Experience</option>
                <option value="5">5+ Years Experience</option>
                <option value="8">8+ Years Experience</option>
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-slate-800">
              <button
                onClick={resetAllFilters}
                className="px-4 py-2 border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-stone-50 active-press transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Header Counter */}
      <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-slate-400 px-1">
        <span>
          Found <strong className="text-stone-900 dark:text-white">{filteredSitters.length}</strong> verified caregiver{filteredSitters.length === 1 ? '' : 's'} near {locationAddressName}
        </span>
        {activeFilterChip !== 'all' && (
          <button
            onClick={() => setActiveFilterChip('all')}
            className="text-primary hover:underline text-[11px] font-bold"
          >
            Clear active tag
          </button>
        )}
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-bold">Matching childcare providers near {locationAddressName}...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-center text-xs font-bold">
          {error}
        </div>
      ) : filteredSitters.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-stone-400">
            <SearchIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-heading dark:text-white">No Caregivers Match Your Criteria</h3>
            <p className="text-stone-400 text-xs italic font-medium mt-1">
              Try adjusting your search radius, rate filter, or experience level.
            </p>
          </div>
          <button
            onClick={resetAllFilters}
            className="px-6 py-3 text-xs font-bold bg-primary text-white rounded-2xl active-press hover:bg-emerald-800 transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset All Filters
          </button>
        </div>
      ) : viewMode === 'map' ? (
        /* MAP VIEW MODE (OPENSTREETMAP LEAFLET) WITH MAP/LIST SYNC */
        <div className="space-y-4">
          <div className="h-[450px] w-full">
            <InteractiveMap
              centerLat={parentLat}
              centerLng={parentLng}
              radiusKm={searchRadiusKm}
              markers={filteredSitters}
              highlightedMarkerId={highlightedMarkerId}
            />
          </div>

          {/* Sitter Cards list underneath map for easy scanning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {filteredSitters.map((sitter) => (
              <div
                key={sitter.id}
                onMouseEnter={() => setHighlightedMarkerId(sitter.id)}
                onMouseLeave={() => setHighlightedMarkerId(null)}
                className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
                  highlightedMarkerId === sitter.id
                    ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-stone-200 dark:border-slate-800 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={sitter.avatar_url}
                    alt={sitter.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs text-heading dark:text-white truncate">{sitter.name}</h4>
                      <span className="font-extrabold text-xs text-amber-600">${sitter.hourly_rate}/hr</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold block">
                      📍 {sitter.distance_km} km away ({sitter.city})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* GRID / LIST VIEW MODES */
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredSitters.map((sitter) => {
            const isExpanded = expandedCardIds.includes(sitter.id);
            const isHighlighted = highlightedMarkerId === sitter.id;

            return (
              <div
                key={sitter.id}
                onMouseEnter={() => setHighlightedMarkerId(sitter.id)}
                onMouseLeave={() => setHighlightedMarkerId(null)}
                className={`bg-white dark:bg-slate-900 border rounded-3xl overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                  isHighlighted
                    ? 'border-emerald-500 shadow-xl ring-2 ring-emerald-500/20'
                    : 'border-stone-200 dark:border-slate-800 hover:border-emerald-300 shadow-xs hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Cover & Badge Header */}
                  <div className="h-32 relative overflow-hidden bg-stone-100 dark:bg-slate-800">
                    <img
                      src={sitter.cover_url}
                      alt={sitter.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Badge */}
                    {sitter.badge && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                        <Award className="h-3 w-3" /> {sitter.badge}
                      </div>
                    )}

                    {/* Hourly Rate Chip */}
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-stone-900/90 text-amber-400 border border-stone-700 text-xs font-black shadow-md">
                      ${sitter.hourly_rate}/hr
                    </div>

                    {/* Distance Chip */}
                    <div className="absolute bottom-3 left-3 text-white text-xs font-bold flex items-center gap-1 backdrop-blur-md bg-black/40 px-2.5 py-0.5 rounded-lg border border-white/20">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{sitter.distance_km} km away</span>
                    </div>
                  </div>

                  {/* Sitter Information */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={sitter.avatar_url}
                        alt={sitter.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md shrink-0 -mt-8 relative z-10 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display font-extrabold text-sm text-heading dark:text-white truncate">
                            {sitter.name}
                          </h3>
                          {sitter.is_verified && (
                            <span title="Background Checked">
                              <ShieldCheck className="h-4 w-4 text-emerald-600 fill-emerald-100 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 font-medium truncate">
                          {sitter.headline}
                        </p>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="flex items-center justify-between pt-1 text-xs font-bold border-y border-stone-100 dark:border-slate-800 py-2 text-stone-600 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{sitter.rating}</span>
                        <span className="text-stone-400 text-[10px]">({sitter.reviews_count || 12})</span>
                      </div>
                      <div>
                        <span>{sitter.years_experience} yrs exp</span>
                      </div>
                      <div className="text-emerald-600 text-[11px] font-extrabold">
                        {sitter.city}
                      </div>
                    </div>

                    {/* Bio Snippet */}
                    <p className="text-xs text-stone-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
                      {sitter.bio}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-5 pt-0 flex items-center gap-2">
                  <Link
                    href={`/sitter/${sitter.id}`}
                    className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold text-center active-press hover:bg-emerald-800 transition-colors shadow-xs"
                  >
                    View Profile & Book
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 text-stone-400 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-bold">Loading NestCare Geospatial Search...</p>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
