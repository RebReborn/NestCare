'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search as SearchIcon, SlidersHorizontal, Star, ShieldCheck, 
  MapPin, Loader2, ChevronDown, ChevronUp, ChevronRight,
  MessageCircle, Calendar, LayoutGrid, List, ArrowUpDown, 
  Sparkles, CheckCircle2, X, RefreshCw, Edit2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SearchPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [sitters, setSitters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  
  // Search, Filter, Sort & View states
  const [searchQuery, setSearchQuery] = useState('');
  const [maxRate, setMaxRate] = useState(40);
  const [selectedService, setSelectedService] = useState('');
  const [minExperience, setMinExperience] = useState(0);
  const [sortBy, setSortBy] = useState<'rating' | 'price_low' | 'price_high' | 'experience'>('rating');
  const [activeFilterChip, setActiveFilterChip] = useState<'all' | 'top_rated' | 'verified' | 'budget'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Card toggle expansion state
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    async function fetchSitters() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);

        // Fetch profiles joined with sitter_profiles and reviews
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            display_name,
            avatar_url,
            bio,
            location_lat,
            location_lng,
            sitter_profiles (
              headline,
              base_hourly_rate_cents,
              additional_child_rate_cents,
              pricing_model,
              years_experience,
              background_check_status,
              is_available,
              cover_url,
              sitter_services (
                service_type
              )
            ),
            reviews:reviews!reviews_reviewee_id_fkey (
              rating
            )
          `)
          .eq('role', 'sitter');

        if (error) throw error;
        
        // Map data to easy-to-use structure
        const mapped = (data || []).map((p: any) => {
          const sp = Array.isArray(p.sitter_profiles) ? p.sitter_profiles[0] : p.sitter_profiles;
          const services = sp?.sitter_services || [];
          const ratings = p.reviews || [];
          const avgRating = ratings.length > 0
            ? (ratings.reduce((acc: number, r: any) => acc + r.rating, 0) / ratings.length).toFixed(1)
            : null;
          const reviewsCount = ratings.length;

          return {
            id: p.id,
            name: p.display_name,
            first_name: p.first_name,
            last_name: p.last_name,
            avatar_url: p.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
            headline: sp?.headline || 'Experienced Caregiver',
            bio: p.bio || 'Dedicated childcare professional focused on safety, engagement, and nurturing support.',
            hourly_rate: sp?.base_hourly_rate_cents ? Math.round(Number(sp.base_hourly_rate_cents) / 100) : (Number(sp?.hourly_rate) || 22),
            additional_child_rate: sp?.additional_child_rate_cents ? Math.round(Number(sp.additional_child_rate_cents) / 100) : 4,
            pricing_model: sp?.pricing_model || 'flat',
            years_experience: sp?.years_experience || 2,
            background_check_status: sp?.background_check_status || 'unverified',
            is_available: sp?.is_available ?? true,
            cover_url: sp?.cover_url || 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800',
            services: (Array.isArray(services) ? services : [services]).map((s: any) => s.service_type).filter(Boolean),
            average_rating: avgRating,
            reviews_count: reviewsCount,
          };
        });

        setSitters(mapped);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load sitters');
      } finally {
        setLoading(false);
      }
    }

    fetchSitters();
  }, []);

  // Filter sitters client-side
  const filteredSitters = sitters.filter((sitter) => {
    const matchesSearch =
      sitter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sitter.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sitter.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRate = sitter.hourly_rate <= maxRate;
    const matchesService = selectedService ? sitter.services.includes(selectedService) : true;
    const matchesExp = sitter.years_experience >= minExperience;

    let matchesChip = true;
    if (activeFilterChip === 'top_rated') {
      matchesChip = Number(sitter.average_rating || 0) >= 4.8;
    } else if (activeFilterChip === 'verified') {
      matchesChip = sitter.background_check_status === 'fully_verified';
    } else if (activeFilterChip === 'budget') {
      matchesChip = sitter.hourly_rate <= 25;
    }

    return matchesSearch && matchesRate && matchesService && matchesExp && matchesChip && sitter.is_available;
  });

  // Sort sitters
  const sortedSitters = [...filteredSitters].sort((a, b) => {
    if (sortBy === 'rating') return (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0);
    if (sortBy === 'price_low') return a.hourly_rate - b.hourly_rate;
    if (sortBy === 'price_high') return b.hourly_rate - a.hourly_rate;
    if (sortBy === 'experience') return b.years_experience - a.years_experience;
    return 0;
  });

  const resetAllFilters = () => {
    setSearchQuery('');
    setMaxRate(40);
    setSelectedService('');
    setMinExperience(0);
    setActiveFilterChip('all');
    setSortBy('rating');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-bold border border-white/10">
            <Sparkles className="h-3.5 w-3.5" /> Verified Childcare Network
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight">
            Find Trusted Caregivers
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Search background-checked, top-rated babysitters and nannies in your neighborhood.
          </p>
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
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-stone-200 bg-white text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-xs font-medium"
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
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            { (maxRate < 40 || selectedService || minExperience > 0) && (
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
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-amber-50 hover:text-amber-700'
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
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700'
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
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-sky-50 hover:text-sky-700'
              }`}
            >
              Under $25/hr
            </button>
          </div>

          {/* Sort & View Mode Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-600">
              <ArrowUpDown className="h-3.5 w-3.5 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent outline-none cursor-pointer text-xs font-bold text-heading"
              >
                <option value="rating">Top Rated</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="experience">Most Experienced</option>
              </select>
            </div>

            <div className="hidden sm:flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-2xs text-heading' : 'text-stone-400 hover:text-stone-600'}`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-2xs text-heading' : 'text-stone-400 hover:text-stone-600'}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm animate-fade-in">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">
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
              <label className="block text-[10px] font-extrabold text-stone-400 uppercase tracking-wider mb-1.5">
                Service Specialty
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full p-3 rounded-2xl border border-stone-200 text-xs outline-none bg-stone-50 font-bold text-stone-700"
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
              <label className="block text-[10px] font-extrabold text-stone-400 uppercase tracking-wider mb-1.5">
                Minimum Experience
              </label>
              <select
                value={minExperience}
                onChange={(e) => setMinExperience(Number(e.target.value))}
                className="w-full p-3 rounded-2xl border border-stone-200 text-xs outline-none bg-stone-50 font-bold text-stone-700"
              >
                <option value="0">Any Experience</option>
                <option value="2">2+ Years Experience</option>
                <option value="5">5+ Years Experience</option>
                <option value="8">8+ Years Experience</option>
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={resetAllFilters}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 active-press transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Header Counter */}
      <div className="flex items-center justify-between text-xs font-bold text-stone-500 px-1">
        <span>
          Found <strong className="text-stone-900">{sortedSitters.length}</strong> available caregiver{sortedSitters.length === 1 ? '' : 's'}
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
          <p className="text-xs font-bold">Matching childcare providers in Edmonton...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-center text-xs font-bold">
          {error}
        </div>
      ) : sortedSitters.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <SearchIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-heading">No Caregivers Match Your Criteria</h3>
            <p className="text-stone-400 text-xs italic font-medium mt-1">
              Try adjusting your rate filter, experience level, or clearing search keywords.
            </p>
          </div>
          <button
            onClick={resetAllFilters}
            className="px-6 py-3 text-xs font-bold bg-primary text-white rounded-2xl active-press hover:bg-emerald-800 transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSitters.map((sitter) => {
            const isExpanded = expandedCardIds.includes(sitter.id);
            return (
              <div
                key={sitter.id}
                className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Cover Graphic */}
                  <div 
                    className="w-full h-24 bg-cover bg-center relative shrink-0" 
                    style={{ backgroundImage: `url(${sitter.cover_url})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Rate Badge on Cover */}
                    <div className="absolute right-3 bottom-2.5 px-3 py-1 bg-white/90 backdrop-blur-md rounded-xl text-xs font-black text-heading shadow-xs">
                      ${sitter.hourly_rate}<span className="text-[10px] font-bold text-stone-500">/hr</span>
                    </div>

                    {/* Verification Pill on Cover */}
                    {sitter.background_check_status === 'fully_verified' && (
                      <div className="absolute left-3 top-3 px-2.5 py-1 bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-extrabold rounded-lg flex items-center gap-1 shadow-xs">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Header: Avatar & Name & Rating */}
                    <div className="flex items-start gap-3 -mt-8">
                      <Link href={`/sitter/${sitter.id}`} className="shrink-0 relative z-10">
                        <img
                          src={sitter.avatar_url}
                          alt={sitter.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                        />
                      </Link>
                      <div className="min-w-0 flex-1 pt-6">
                        <Link href={`/sitter/${sitter.id}`} className="font-display font-extrabold text-sm text-heading hover:text-primary truncate block transition-colors">
                          {sitter.name}
                        </Link>
                        <p className="text-[10px] font-semibold text-stone-400 truncate">
                          {sitter.headline}
                        </p>
                      </div>
                    </div>

                    {/* Metrics Bar */}
                    <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-2xl border border-stone-100 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        <div>
                          <span className="font-extrabold text-stone-900">{sitter.average_rating || 'New'}</span>
                          {sitter.reviews_count > 0 && (
                            <span className="text-[10px] text-stone-400 font-bold ml-1">({sitter.reviews_count})</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right font-bold text-stone-600 text-[11px]">
                        💼 {sitter.years_experience} Yrs Exp
                      </div>
                    </div>

                    {/* Bio Snippet */}
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-medium">
                      "{sitter.bio}"
                    </p>

                    {/* Service Tags */}
                    {sitter.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {sitter.services.slice(0, 3).map((service: string) => (
                          <span
                            key={service}
                            className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-bold capitalize"
                          >
                            {service.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {sitter.services.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-[9px] font-bold text-stone-500">
                            +{sitter.services.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 pt-0 flex gap-2">
                  {sitter.id === currentUser?.id ? (
                    <Link
                      href="/profile"
                      className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-2xl text-center active-press transition-all flex items-center justify-center gap-1 border border-stone-200 dark:border-slate-700"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-primary" /> Your Profile
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/messages?newChat=${sitter.id}`}
                        className="p-2.5 rounded-2xl border border-stone-200 hover:bg-stone-50 hover:text-primary text-stone-600 active-press transition-all shrink-0"
                        title="Send Message"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/bookings?bookSitter=${sitter.id}`}
                        className="flex-1 py-2.5 bg-primary hover:bg-emerald-800 text-white text-xs font-bold rounded-2xl text-center active-press transition-all shadow-2xs flex items-center justify-center gap-1"
                      >
                        <Calendar className="h-3.5 w-3.5" /> Book Sitter
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-3">
          {sortedSitters.map((sitter) => (
            <div
              key={sitter.id}
              className="bg-white border border-stone-200 rounded-3xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <Link href={`/sitter/${sitter.id}`} className="shrink-0">
                  <img
                    src={sitter.avatar_url}
                    alt={sitter.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shadow-2xs"
                  />
                </Link>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/sitter/${sitter.id}`} className="font-display font-black text-sm text-heading hover:underline truncate">
                      {sitter.name}
                    </Link>
                    {sitter.background_check_status === 'fully_verified' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 truncate font-medium">{sitter.headline}</p>
                  <div className="flex items-center gap-3 text-xs font-bold text-stone-600 pt-0.5">
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {sitter.average_rating || 'New'} {sitter.reviews_count > 0 && `(${sitter.reviews_count})`}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span>💼 {sitter.years_experience} yrs exp</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-stone-100 pt-3 sm:pt-0 shrink-0">
                <div className="text-left sm:text-right">
                  <span className="font-display text-base font-black text-heading block">${sitter.hourly_rate}/hr</span>
                  <span className="text-[10px] font-semibold text-stone-400">Base rate</span>
                </div>
                <div className="flex gap-2">
                  {sitter.id === currentUser?.id ? (
                    <Link
                      href="/profile"
                      className="px-5 py-3 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-2xl active-press transition-colors shadow-2xs flex items-center gap-1 border border-stone-200 dark:border-slate-700"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-primary" /> Your Profile
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/messages?newChat=${sitter.id}`}
                        className="p-3 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-600 active-press transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/bookings?bookSitter=${sitter.id}`}
                        className="px-5 py-3 bg-primary hover:bg-emerald-800 text-white text-xs font-bold rounded-2xl active-press transition-colors shadow-2xs"
                      >
                        Book Now
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
