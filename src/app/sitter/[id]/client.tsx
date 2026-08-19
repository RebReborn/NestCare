'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, ShieldCheck, MapPin, Calendar, BookOpen, Clock, Heart, ArrowLeft, Loader2, MessageCircle, X, Ban, Edit2, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function SitterProfileClient() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const sitterId = params.id as string;

  const [sitter, setSitter] = useState<any | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [weeklyRules, setWeeklyRules] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  const handleToggleBlock = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      setBlocking(true);
      if (isBlocked) {
        await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', sitterId);
        setIsBlocked(false);
        toast.success(`${sitter?.name || 'User'} has been unblocked.`);
      } else {
        await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: sitterId });
        setIsBlocked(true);
        toast.success(`${sitter?.name || 'User'} has been blocked.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update block status.');
    } finally {
      setBlocking(false);
    }
  };

  useEffect(() => {
    async function fetchSitterData() {
      try {
        setLoading(true);
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            display_name,
            avatar_url,
            bio,
            sitter_profiles (
              headline,
              base_hourly_rate_cents,
              additional_child_rate_cents,
              pricing_model,
              years_experience,
              background_check_status,
              minimum_booking_hours,
              max_children,
              gallery_urls,
              cover_url,
              video_intro_url,
              sitter_services (service_type),
              sitter_languages (language)
            )
          `)
          .eq('id', sitterId)
          .single();

        if (profileError) throw profileError;

        // Fetch reviews
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            reviewer:profiles!reviews_reviewer_id_fkey (
              display_name,
              avatar_url
            )
          `)
          .eq('reviewee_id', sitterId);

        // Fetch favorite and block status
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const { data: fav } = await supabase
            .from('favorites')
            .select('id')
            .eq('parent_id', user.id)
            .eq('sitter_id', sitterId)
            .maybeSingle();
          setIsFavorite(!!fav);

          const { data: blk } = await supabase
            .from('user_blocks')
            .select('id')
            .eq('blocker_id', user.id)
            .eq('blocked_id', sitterId)
            .maybeSingle();
          setIsBlocked(!!blk);
        }

        // Fetch weekly availability rules
        const { data: rulesData } = await supabase
          .from('availability_rules')
          .select('day_of_week, start_time, end_time')
          .eq('sitter_id', sitterId);

        // Fetch exceptions (only future exceptions, max 5)
        const { data: exceptionsData } = await supabase
          .from('availability_exceptions')
          .select('start_date, end_date, exception_type, notes')
          .eq('sitter_id', sitterId)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);

        setWeeklyRules(rulesData || []);
        setExceptions(exceptionsData || []);

        const sp: any = profileData.sitter_profiles;
        const profileDetails = Array.isArray(sp) ? sp[0] : sp;
        const services = profileDetails?.sitter_services || [];
        const languages = profileDetails?.sitter_languages || [];

        const mappedSitter = {
          id: profileData.id,
          name: profileData.display_name,
          avatar_url: profileData.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
          headline: profileDetails?.headline || 'Caregiver',
          bio: profileData.bio || 'No biography details provided.',
          hourly_rate: profileDetails?.base_hourly_rate_cents ? Math.round(Number(profileDetails.base_hourly_rate_cents) / 100) : 20,
          additional_child_rate: profileDetails?.additional_child_rate_cents ? Math.round(Number(profileDetails.additional_child_rate_cents) / 100) : 0,
          pricing_model: profileDetails?.pricing_model || 'flat',
          years_experience: profileDetails?.years_experience || 0,
          background_check_status: profileDetails?.background_check_status || 'unverified',
          minimum_booking_hours: profileDetails?.minimum_booking_hours || 1,
          max_children: profileDetails?.max_children || 3,
          services: (Array.isArray(services) ? services : [services]).map((s: any) => s.service_type).filter(Boolean),
          languages: (Array.isArray(languages) ? languages : [languages]).map((l: any) => l.language).filter(Boolean),
          gallery_urls: profileDetails?.gallery_urls || [],
          cover_url: profileDetails?.cover_url || 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800',
        };

        setSitter(mappedSitter);
        setReviews(reviewsData || []);
      } catch (err) {
        console.error('Failed to load sitter profile:', err);
      } finally {
        setLoading(false);
      }
    }

    if (sitterId) {
      fetchSitterData();
    }
  }, [sitterId]);

  const toggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isFavorite) {
      await supabase.from('favorites').delete().eq('parent_id', user.id).eq('sitter_id', sitterId);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({ parent_id: user.id, sitter_id: sitterId });
      setIsFavorite(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sitter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4 text-center">
        <div>
          <p className="text-stone-500 font-semibold">Sitter profile not found.</p>
          <button onClick={() => router.back()} className="mt-4 text-primary font-bold inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const starCounts = [0, 0, 0, 0, 0];
  reviews.forEach(r => {
    const starIdx = Math.min(Math.max(r.rating, 1), 5) - 1;
    starCounts[starIdx]++;
  });
  const starPercentages = starCounts.map(count => 
    reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
  );

  return (
    <div className="bg-bg min-h-screen pb-32">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-stone-200 z-10 px-4 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-stone-100 active-press transition-colors">
          <ArrowLeft className="h-5 w-5 text-stone-700" />
        </button>
        <span className="font-display font-black text-sm text-heading uppercase tracking-wider">Care Provider</span>
        <button onClick={toggleFavorite} className="p-2 rounded-xl hover:bg-stone-100 active-press transition-colors">
          <Heart className={`h-5 w-5 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-stone-400'}`} />
        </button>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        
        {/* Profile Card Hero */}
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm flex flex-col items-center text-center pb-6">
          {/* Banner Graphic */}
          <div 
            className="w-full h-24 bg-cover bg-center shrink-0" 
            style={{ backgroundImage: `url(${sitter.cover_url})` }}
          />
          
          {/* Avatar (overlapping the banner) */}
          <img 
            src={sitter.avatar_url} 
            alt={sitter.name} 
            className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-md -mt-12 z-10 bg-white" 
          />
          
          <div className="mt-4 px-6 space-y-2.5 w-full">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="font-display text-xl font-black text-heading">{sitter.name}</h1>
                {sitter.background_check_status === 'fully_verified' && (
                  <ShieldCheck className="h-5 w-5 text-primary fill-emerald-50 shrink-0" />
                )}
              </div>
              <p className="text-xs text-stone-400 flex items-center justify-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-stone-450" /> Edmonton, AB (Within 5 km)
              </p>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {sitter.background_check_status === 'fully_verified' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[9px] font-bold text-emerald-700 border border-emerald-100 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 shrink-0" /> Background Checked
                </span>
              )}
              {Number(averageRating) >= 4.8 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[9px] font-bold text-amber-700 border border-amber-100 flex items-center gap-1">
                  <Star className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" /> Top Rated
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[9px] font-bold text-blue-700 border border-blue-100">
                Verified Identity
              </span>
            </div>

            {/* Premium Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5 border-t border-stone-100 pt-5">
              <div className="p-3 bg-amber-50/20 border border-amber-100/50 rounded-2xl">
                <span className="text-[9px] text-amber-800 block font-bold uppercase tracking-wider mb-0.5">Rating</span>
                <span className="font-display text-sm font-black text-heading inline-flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {averageRating}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/20 border border-emerald-100/50 rounded-2xl">
                <span className="text-[9px] text-emerald-800 block font-bold uppercase tracking-wider mb-0.5">Exp</span>
                <span className="font-display text-sm font-black text-heading">{sitter.years_experience} Yrs</span>
              </div>
              <div className="p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-2xl">
                <span className="text-[9px] text-indigo-800 block font-bold uppercase tracking-wider mb-0.5">Rate</span>
                <span className="font-display text-sm font-black text-heading">${sitter.hourly_rate}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Bio Section */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-3.5">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="font-display text-sm font-black text-heading uppercase tracking-wider">About Caregiver</h2>
          </div>
          <h3 className="font-display text-sm font-extrabold text-stone-700 leading-snug italic">"{sitter.headline}"</h3>
          <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">{sitter.bio}</p>
        </div>

        {/* Care Details Info */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="font-display text-sm font-black text-heading uppercase tracking-wider">Care Details</h2>
          </div>
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3.5">
              <span className="p-2 bg-stone-50 rounded-xl text-stone-500 border border-stone-150">
                <BookOpen className="h-4.5 w-4.5" />
              </span>
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase">Languages spoken</span>
                <span className="font-bold text-heading mt-0.5 block">{sitter.languages.join(', ')}</span>
              </div>
            </div>
            <div className="flex items-start gap-3.5 border-t border-stone-100 pt-3.5">
              <span className="p-2 bg-stone-50 rounded-xl text-stone-500 border border-stone-150">
                <Clock className="h-4.5 w-4.5" />
              </span>
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase">Minimum Booking duration</span>
                <span className="font-bold text-heading mt-0.5 block">{sitter.minimum_booking_hours} hours minimum per booking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Services Offered */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="font-display text-sm font-black text-heading uppercase tracking-wider">Offered Services</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {sitter.services.map((service: string) => (
              <span key={service} className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-150 text-[11px] font-bold text-stone-700 capitalize shadow-xs">
                {service.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Sitter Pricing Details Card */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
            <h2 className="font-display text-sm font-black text-heading uppercase tracking-wider">Pricing Configuration</h2>
            <span className="text-[9px] bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              {sitter.pricing_model === 'flat' ? 'Flat rate' : sitter.pricing_model === 'additional_child' ? 'Add-child' : 'Per-child'}
            </span>
          </div>

          <div className="text-xs space-y-2.5 font-semibold text-stone-600">
            <div className="flex justify-between">
              <span>Base Hourly Rate:</span>
              <span className="font-bold text-heading">${sitter.hourly_rate}/hr</span>
            </div>
            {sitter.pricing_model === 'additional_child' && (
              <div className="flex justify-between">
                <span>Additional Child Rate:</span>
                <span className="font-bold text-primary">+${sitter.additional_child_rate}/hr</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Max Capacity Limit:</span>
              <span className="font-bold text-red-600">{sitter.max_children} children max</span>
            </div>

            <div className="h-px bg-stone-100 my-2" />

            <span className="block text-[9.5px] uppercase font-bold tracking-wider text-stone-400">Rate Preview by Child Count</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
              {[1, 2, 3, 4].map(numKids => {
                let pRate = sitter.hourly_rate;
                if (sitter.pricing_model === 'additional_child') {
                  pRate = sitter.hourly_rate + Math.max(0, numKids - 1) * (sitter.additional_child_rate || 0);
                } else if (sitter.pricing_model === 'per_child') {
                  pRate = sitter.hourly_rate * numKids;
                }
                const isOverCap = numKids > sitter.max_children;
                return (
                  <div
                    key={numKids}
                    className={`p-2.5 border rounded-xl flex flex-col justify-between ${
                      isOverCap 
                        ? 'bg-red-50/50 border-red-100 opacity-60 text-red-800' 
                        : 'bg-stone-50/50 border-stone-150 text-stone-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-stone-400 font-semibold">{numKids} Child{numKids > 1 ? 'ren' : ''}</span>
                    </div>
                    <span className="font-display font-black text-[12px] text-heading">${pRate}/hr</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Video Greeting / Intro Section */}
        {sitter.video_intro_url && (
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="border-b border-stone-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-black text-heading dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Video className="h-4.5 w-4.5 text-primary" /> Video Greeting & Introduction
              </h2>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Verified Caregiver
              </span>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-stone-200 dark:border-slate-800 shadow-sm">
              <video
                src={sitter.video_intro_url}
                controls
                preload="metadata"
                poster={sitter.avatar_url}
                className="w-full h-full object-cover"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <p className="text-xs text-stone-500 dark:text-slate-400 font-medium italic text-center">
              "Hi! Watch my short video greeting to learn more about my childcare experience, safety training, and activity ideas."
            </p>
          </div>
        )}

        {/* Care Gallery Section */}
        {sitter.gallery_urls && sitter.gallery_urls.length >= 1 && (
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-black text-heading uppercase tracking-wider">Care Gallery</h2>
              <span className="text-[10px] text-stone-400 font-bold">{sitter.gallery_urls.length} photo{sitter.gallery_urls.length !== 1 ? 's' : ''}</span>
            </div>
            {/* Hero image */}
            <div
              onClick={() => setActiveLightboxImg(sitter.gallery_urls[0])}
              className="w-full h-52 bg-stone-100 overflow-hidden relative cursor-pointer group rounded-2xl"
            >
              <img
                src={sitter.gallery_urls[0]}
                alt="Care Gallery 1"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors rounded-2xl" />
            </div>
            {/* Remaining images grid */}
            {sitter.gallery_urls.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {sitter.gallery_urls.slice(1).map((imgUrl: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setActiveLightboxImg(imgUrl)}
                    className="h-24 bg-stone-100 overflow-hidden relative cursor-pointer group rounded-xl"
                  >
                    <img
                      src={imgUrl}
                      alt={`Care Gallery ${idx + 2}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fullscreen Lightbox Modal Overlay */}
        {activeLightboxImg && (
          <div 
            onClick={() => setActiveLightboxImg(null)}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-xs animate-fade-in cursor-zoom-out"
          >
            <button 
              onClick={() => setActiveLightboxImg(null)}
              className="absolute top-4 right-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 active-press transition-colors font-bold z-[110]"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative max-w-5xl max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img 
                src={activeLightboxImg} 
                alt="Fullscreen Preview" 
                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-stone-850 bg-stone-900"
              />
            </div>
          </div>
        )}

        {/* Availability Schedule */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="font-display text-sm font-black text-heading uppercase tracking-wider">Availability Schedule</h2>
          </div>

          {/* Weekly recurring rules grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Monday', value: 1 },
              { label: 'Tuesday', value: 2 },
              { label: 'Wednesday', value: 3 },
              { label: 'Thursday', value: 4 },
              { label: 'Friday', value: 5 },
              { label: 'Saturday', value: 6 },
              { label: 'Sunday', value: 0 },
            ].map((day) => {
              const rule = weeklyRules.find(r => r.day_of_week === day.value);
              return (
                <div 
                  key={day.value}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    rule 
                      ? 'bg-emerald-50/30 border-emerald-100/60 text-emerald-900' 
                      : 'bg-stone-50/50 border-stone-150 text-stone-400'
                  }`}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider block mb-1">{day.label.substring(0, 3)}</span>
                  {rule ? (
                    <span className="text-[10px] font-extrabold block">
                      {rule.start_time.substring(0, 5)} - {rule.end_time.substring(0, 5)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold block">Closed</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upcoming exceptions */}
          {exceptions.length > 0 && (
            <div className="pt-3 border-t border-stone-100 space-y-2">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Upcoming Blocked Dates</span>
              <div className="flex flex-col gap-1.5">
                {exceptions.map((ex, idx) => {
                  const dateStr = new Date(ex.start_date).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    timeZone: 'UTC' 
                  });
                  return (
                    <div 
                      key={idx} 
                      className="px-3.5 py-2.5 bg-red-50/20 border border-red-100/30 rounded-xl flex items-center justify-between text-xs text-red-950"
                    >
                      <span className="font-bold">📅 {dateStr}</span>
                      <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        {ex.exception_type === 'unavailable' ? 'Unavailable' : 'Override Shift'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="font-display text-sm font-black text-heading uppercase tracking-wider">Reviews ({reviews.length})</h2>
          </div>
          {reviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50 p-5 rounded-2xl border border-stone-150">
              <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-stone-200 pb-4 md:pb-0 pr-0 md:pr-6 text-center space-y-1">
                <span className="font-display text-4xl font-black text-heading">{averageRating}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const isLit = i < Math.round(Number(averageRating));
                    return (
                      <Star key={i} className={`h-4.5 w-4.5 stroke-amber-400 ${isLit ? 'text-amber-400 fill-amber-400' : 'text-stone-300 fill-none'}`} />
                    );
                  })}
                </div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{reviews.length} reviews</span>
              </div>
              <div className="space-y-1.5 justify-center flex flex-col">
                {[5, 4, 3, 2, 1].map((starNum) => {
                  const percentage = starPercentages[starNum - 1];
                  return (
                    <div key={starNum} className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                      <span className="w-3 text-right">{starNum}</span>
                      <Star className="h-3 w-3 text-stone-400 fill-stone-400" />
                      <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-stone-400 font-bold">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {reviews.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No reviews yet for {sitter.name}.</p>
          ) : (
            <div className="space-y-4 divide-y divide-stone-100 pt-2">
              {reviews.map((rev) => (
                <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-heading">
                      {rev.reviewer?.display_name || 'Parent'}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: rev.rating }).map((_, i) => {
                        return (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 italic">"{rev.comment}"</p>
                  <span className="text-[9px] text-stone-400 block font-semibold">
                    {new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Mobile Bottom Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-white/95 pb-safe backdrop-blur-md px-4 py-4 z-20 flex gap-3 shadow-lg justify-between items-center max-w-xl mx-auto rounded-t-3xl md:rounded-t-none">
        <div>
          <span className="text-xs text-stone-400 block font-semibold uppercase tracking-wide">Rate</span>
          <div className="flex items-baseline">
            <span className="font-display text-xl font-black text-heading">${sitter.hourly_rate}</span>
            <span className="text-xs text-stone-400 font-bold">/hr</span>
          </div>
        </div>
        {currentUser?.id === sitterId ? (
          <button
            onClick={() => router.push('/profile')}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-emerald-800 active-press shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Edit2 className="h-4 w-4" /> Edit Your Caregiver Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleToggleBlock}
              disabled={blocking}
              className={`p-3.5 rounded-2xl border transition-all ${
                isBlocked 
                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                  : 'border-stone-200 hover:bg-stone-50 text-stone-400 hover:text-rose-600'
              }`}
              title={isBlocked ? 'Unblock Sitter' : 'Block Sitter'}
            >
              <Ban className="h-5 w-5" />
            </button>
            <button
              onClick={() => router.push(`/messages?newChat=${sitter.id}`)}
              disabled={isBlocked}
              className="p-3.5 rounded-2xl border border-stone-200 hover:bg-stone-50 hover:text-primary hover:border-primary text-stone-700 active-press transition-all disabled:opacity-40"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <button
              onClick={() => router.push(`/bookings?bookSitter=${sitter.id}`)}
              disabled={isBlocked}
              className="px-6 py-3.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-emerald-800 active-press shadow-sm hover:shadow transition-all disabled:opacity-40"
            >
              Book Sitter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
