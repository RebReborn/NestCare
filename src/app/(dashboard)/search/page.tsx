'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search as SearchIcon, SlidersHorizontal, Star, ShieldCheck, MapPin, Loader2, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SearchPage() {
  const supabase = createClient();
  
  const [sitters, setSitters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [maxRate, setMaxRate] = useState(30);
  const [selectedService, setSelectedService] = useState('');
  const [minExperience, setMinExperience] = useState(0);

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
            headline: sp?.headline || 'Experienced Sitter',
            bio: p.bio || 'No biography details provided.',
            hourly_rate: sp?.base_hourly_rate_cents ? Math.round(Number(sp.base_hourly_rate_cents) / 100) : (Number(sp?.hourly_rate) || 20),
            additional_child_rate: sp?.additional_child_rate_cents ? Math.round(Number(sp.additional_child_rate_cents) / 100) : 0,
            pricing_model: sp?.pricing_model || 'flat',
            years_experience: sp?.years_experience || 0,
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

  // Filter sitters client-side for dynamic responsive feedback
  const filteredSitters = sitters.filter((sitter) => {
    const matchesSearch =
      sitter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sitter.headline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRate = sitter.hourly_rate <= maxRate;
    const matchesService = selectedService ? sitter.services.includes(selectedService) : true;
    const matchesExp = sitter.years_experience >= minExperience;

    return matchesSearch && matchesRate && matchesService && matchesExp && sitter.is_available;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-heading">Find a Babysitter</h1>
        <p className="text-xs text-stone-400 mt-1">Discover vetted, high-quality childcare providers in your area.</p>
      </div>

      {/* Search Input and Filters panel */}
      <div className="space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
          <input
            type="text"
            placeholder="Search sitters by name or headline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-3xl border border-stone-200 bg-white text-xs outline-none focus:border-primary transition-all shadow-xs font-medium"
          />
        </div>

        {/* Quick Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
              Max Hourly Rate: ${maxRate}/hr
            </label>
            <input
              type="range"
              min="15"
              max="40"
              step="1"
              value={maxRate}
              onChange={(e) => setMaxRate(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer h-1 bg-stone-100 rounded-lg appearance-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
              Service Offered
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full p-3 rounded-2xl border border-stone-200 text-xs outline-none bg-stone-50 font-bold"
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
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
              Min Experience
            </label>
            <select
              value={minExperience}
              onChange={(e) => setMinExperience(Number(e.target.value))}
              className="w-full p-3 rounded-2xl border border-stone-200 text-xs outline-none bg-stone-50 font-bold"
            >
              <option value="0">Any Experience</option>
              <option value="2">2+ Years Experience</option>
              <option value="5">5+ Years Experience</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-450">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs mt-3 font-bold">Scanning childcare providers...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-center text-xs font-bold">
          {error}
        </div>
      ) : filteredSitters.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-xs">
          <p className="text-stone-400 text-xs italic font-medium">No active sitters match your criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setMaxRate(30);
              setSelectedService('');
              setMinExperience(0);
            }}
            className="mt-4 px-6 py-3 text-xs font-bold bg-primary text-white rounded-2xl active-press hover:bg-emerald-800 transition-colors shadow-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSitters.map((sitter) => {
            const isExpanded = expandedCardIds.includes(sitter.id);
            return (
              <div
                key={sitter.id}
                className="bg-white border border-stone-200 rounded-2xl p-3 hover-scale shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Top Header: Avatar & Name & Headline */}
                  <div className="flex items-center gap-2.5">
                    <Link href={`/sitter/${sitter.id}`} className="shrink-0">
                      <img
                        src={sitter.avatar_url}
                        alt={sitter.name}
                        className="w-9 h-9 rounded-xl object-cover border border-stone-100"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <Link href={`/sitter/${sitter.id}`} className="font-bold text-xs text-heading hover:underline truncate">
                          {sitter.name}
                        </Link>
                        {sitter.background_check_status === 'fully_verified' && (
                          <ShieldCheck className="h-3.5 w-3.5 text-primary fill-emerald-50 shrink-0" />
                        )}
                      </div>
                      <span className="text-[9px] text-stone-400 block truncate font-semibold">
                        {sitter.headline}
                      </span>
                    </div>
                    {/* Chevron Link for Mobile navigation */}
                    <Link 
                      href={`/sitter/${sitter.id}`}
                      className="p-1 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-primary transition-all active-press"
                    >
                      <ChevronRight className="h-4.5 w-4.5" />
                    </Link>
                  </div>

                  {/* Micro Metrics row: Star, Experience, Hourly Rate */}
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-stone-600 bg-stone-50 p-1.5 rounded-lg border border-stone-100/80">
                    <div className="flex items-center gap-0.5 text-amber-600">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                      <span>{sitter.average_rating || 'New'}</span>
                    </div>
                    <span className="text-stone-300">•</span>
                    <div>💼 {sitter.years_experience} yrs</div>
                    <span className="text-stone-300">•</span>
                    <div className="text-primary font-black">${sitter.hourly_rate}/hr</div>
                  </div>

                  {/* Expander Trigger */}
                  <button 
                    type="button" 
                    onClick={() => toggleExpandCard(sitter.id)}
                    className="text-[9px] font-bold text-stone-400 hover:text-primary flex items-center gap-0.5"
                  >
                    {isExpanded ? (
                      <>Hide details <ChevronUp className="h-2.5 w-2.5" /></>
                    ) : (
                      <>Show bio & services <ChevronDown className="h-2.5 w-2.5" /></>
                    )}
                  </button>

                  {/* Expanded Additional Details */}
                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-dashed border-stone-150 animate-fade-in">
                      <p className="text-[9px] text-stone-500 leading-relaxed font-semibold">
                        {sitter.bio}
                      </p>
                      
                      {/* Service Badges */}
                      <div className="flex flex-wrap gap-1">
                        {sitter.services.map((service: string) => (
                          <span
                            key={service}
                            className="px-1.5 py-0.5 rounded bg-stone-100 text-[8px] font-bold text-stone-600 capitalize"
                          >
                            {service.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Profile Action (Hidden on Mobile) */}
                <div className="mt-3 hidden sm:block">
                  <Link
                    href={`/sitter/${sitter.id}`}
                    className="w-full py-2 bg-primary hover:bg-emerald-800 text-white text-[10px] font-bold rounded-xl text-center block active-press transition-colors shadow-xs"
                  >
                    View Profile
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
