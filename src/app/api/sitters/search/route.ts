import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateHaversineDistanceKm, getApproximateCoords } from '@/lib/location/distance';
import { clampRadiusKm, isValidCoords } from '@/lib/location/validation';

const getServiceSupabase = () => {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentLat = parseFloat(searchParams.get('lat') || '49.2827');
    const parentLng = parseFloat(searchParams.get('lng') || '-123.1207');
    const radiusKm = clampRadiusKm(searchParams.get('radius') || '25');
    const searchQuery = (searchParams.get('query') || '').toLowerCase().trim();
    const maxRate = parseFloat(searchParams.get('maxRate') || '100');
    const minExp = parseInt(searchParams.get('minExperience') || '0', 10);
    const verifiedOnly = searchParams.get('verified') === 'true';
    const sortBy = searchParams.get('sortBy') || 'rank'; // 'rank' | 'distance' | 'rating' | 'price_low' | 'price_high'

    if (!isValidCoords(parentLat, parentLng)) {
      return NextResponse.json({ error: 'Invalid latitude or longitude coordinates' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 1. Try PostGIS RPC search if available, or fallback to standard table query
    let rawSitters: any[] = [];
    let isPostGISUsed = false;

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('search_sitters_geospatial', {
        p_lat: parentLat,
        p_lng: parentLng,
        p_radius_km: radiusKm,
        p_max_rate: maxRate,
        p_min_experience: minExp,
        p_query: searchQuery,
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        rawSitters = rpcData;
        isPostGISUsed = true;
      }
    } catch (rpcErr) {
      console.warn('[Search API] PostGIS RPC not available or errored, using standard geospatial fallback logic');
    }

    // Standard Supabase table fetch fallback
    if (!isPostGISUsed) {
      const { data: sittersData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          display_name,
          avatar_url,
          bio,
          verification_status,
          sitter_profiles (
            headline,
            base_hourly_rate_cents,
            years_experience,
            background_check_status,
            service_latitude,
            service_longitude,
            service_radius_km,
            travel_to_parent,
            accept_dropoff,
            city,
            province,
            cover_url
          ),
          reviews:reviews!reviews_reviewee_id_fkey (
            rating
          )
        `)
        .eq('role', 'sitter');

      if (error) {
        console.error('[Search API Error]:', error);
      } else if (sittersData) {
        rawSitters = sittersData;
      }
    }

    // Process and format sitters
    let searchResults = rawSitters.map((p: any) => {
      if (isPostGISUsed) {
        const approx = getApproximateCoords(
          p.service_latitude || parentLat,
          p.service_longitude || parentLng,
          p.profile_id
        );

        return {
          id: p.profile_id,
          name: p.display_name || 'Caregiver',
          avatar_url: p.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
          headline: p.headline || 'Verified Babysitter',
          bio: p.bio || 'Dedicated caregiver committed to child safety, nurturing support, and engaging care.',
          hourly_rate: p.hourly_rate ? Number(p.hourly_rate) : 22,
          rating: 5.0,
          reviews_count: 5,
          years_experience: p.years_experience || 2,
          is_verified: p.verification_status === 'fully_verified' || p.background_check_status === 'passed',
          cover_url: p.cover_url || 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=500',
          distance_km: p.distance_km,
          city: p.city || 'Local Area',
          province: p.province || '',
          latitude: approx.latitude,
          longitude: approx.longitude,
          isApproximate: true,
          location_privacy_note: 'Approximate distance shown. Exact address shared after booking is confirmed.',
        };
      }

      const sp = Array.isArray(p.sitter_profiles) ? p.sitter_profiles[0] : p.sitter_profiles;
      const sitterLat = sp?.service_latitude || p.location_lat || parentLat;
      const sitterLng = sp?.service_longitude || p.location_lng || parentLng;

      const distanceKm = calculateHaversineDistanceKm(parentLat, parentLng, sitterLat, sitterLng);
      const approx = getApproximateCoords(sitterLat, sitterLng, p.id);

      const ratings = p.reviews || [];
      const avgRating =
        ratings.length > 0
          ? parseFloat(
              (ratings.reduce((acc: number, r: any) => acc + r.rating, 0) / ratings.length).toFixed(1)
            )
          : 5.0;

      const hourlyRate = sp?.base_hourly_rate_cents
        ? Math.round(Number(sp.base_hourly_rate_cents) / 100)
        : 22;

      const sitterName = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Caregiver';

      return {
        id: p.id,
        name: sitterName,
        avatar_url: p.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        headline: sp?.headline || 'Verified Babysitter',
        bio: p.bio || 'Dedicated caregiver committed to child safety, nurturing support, and engaging care.',
        hourly_rate: hourlyRate,
        rating: avgRating,
        reviews_count: ratings.length,
        years_experience: sp?.years_experience || 2,
        is_verified: p.verification_status === 'fully_verified' || sp?.background_check_status === 'passed',
        cover_url: sp?.cover_url || 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=500',
        distance_km: distanceKm,
        city: sp?.city || 'Local Area',
        province: sp?.province || '',
        latitude: approx.latitude,
        longitude: approx.longitude,
        isApproximate: true,
        travel_to_parent: sp?.travel_to_parent ?? true,
        accept_dropoff: sp?.accept_dropoff ?? false,
        max_travel_radius_km: sp?.service_radius_km || 10,
        location_privacy_note: 'Approximate distance shown. Exact address shared after booking is confirmed.',
      };
    });

    // Check DEMO SITTERS fallback (strictly disabled when real DB sitters exist)
    const enableDemo = process.env.ENABLE_DEMO_SITTERS === 'true';

    if (rawSitters.length === 0 && searchResults.length === 0 && enableDemo) {
      searchResults = generateDemoSittersNearLocation(parentLat, parentLng);
    }

    // Filter sitters
    const filteredResults = searchResults.filter((sitter) => {
      // If a search query is entered (e.g. searching by name), DO NOT clip by distance radius!
      if (!searchQuery && sitter.distance_km > radiusKm) return false;
      if (verifiedOnly && !sitter.is_verified) return false;
      if (sitter.hourly_rate > maxRate) return false;
      if (sitter.years_experience < minExp) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (sitter.name || '').toLowerCase().includes(q);
        const cityMatch = (sitter.city || '').toLowerCase().includes(q);
        const bioMatch = (sitter.bio || '').toLowerCase().includes(q);
        const headlineMatch = (sitter.headline || '').toLowerCase().includes(q);
        if (!nameMatch && !cityMatch && !bioMatch && !headlineMatch) return false;
      }

      return true;
    });

    // Compute composite ranking scores and attach badges
    const scoredResults = filteredResults.map((sitter) => {
      // Rank score formula: Rating (40%) + Distance (30%) + Verification (15%) + Experience (15%)
      const ratingScore = (sitter.rating / 5.0) * 40;
      const distanceScore = Math.max(0, (1 - sitter.distance_km / Math.max(radiusKm, 1))) * 30;
      const verificationScore = sitter.is_verified ? 15 : 0;
      const expScore = Math.min(15, (sitter.years_experience / 10) * 15);

      const rankScore = Math.round(ratingScore + distanceScore + verificationScore + expScore);

      let badge = undefined;
      if (rankScore >= 85) badge = 'Recommended';
      else if (sitter.rating >= 4.9) badge = 'Top Rated';
      else if (sitter.distance_km <= 3.0) badge = 'Nearby';
      else if (sitter.hourly_rate <= 22) badge = 'Great Value';

      return {
        ...sitter,
        rank_score: rankScore,
        badge,
      };
    });

    // Sort results
    scoredResults.sort((a, b) => {
      if (sortBy === 'distance') return a.distance_km - b.distance_km;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price_low') return a.hourly_rate - b.hourly_rate;
      if (sortBy === 'price_high') return b.hourly_rate - a.hourly_rate;
      return b.rank_score - a.rank_score; // Default smart composite rank
    });

    return NextResponse.json({
      success: true,
      parent_location: { latitude: parentLat, longitude: parentLng },
      radius_km: radiusKm,
      total_found: scoredResults.length,
      is_demo_data: searchResults.length === 0 ? false : enableDemo && rawSitters.length === 0,
      sitters: scoredResults,
    });
  } catch (err: any) {
    console.error('[Geospatial Search Exception]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Generate realistic demo sitters in development environment when database has 0 records
 */
function generateDemoSittersNearLocation(lat: number, lng: number): any[] {
  const demoSittersConfig = [
    {
      id: 'demo-sitter-1',
      name: 'Sarah Jenkins',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
      headline: 'Certified Early Childhood Educator & First-Aid Trained',
      bio: 'Over 6 years of experience working with toddlers and school-age children. Loving, patient, and CPR certified.',
      hourly_rate: 24,
      rating: 4.9,
      reviews_count: 28,
      years_experience: 6,
      is_verified: true,
      cover_url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800',
      latOffset: 0.012,
      lngOffset: -0.015,
      city: 'Vancouver',
    },
    {
      id: 'demo-sitter-2',
      name: 'Jessica Miller',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
      headline: 'Active & Creative After-School Nanny',
      bio: 'Enthusiastic caregiver who loves outdoor games, creative arts & crafts, and reading books.',
      hourly_rate: 22,
      rating: 4.8,
      reviews_count: 19,
      years_experience: 4,
      is_verified: true,
      cover_url: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?w=800',
      latOffset: -0.018,
      lngOffset: 0.022,
      city: 'Vancouver',
    },
    {
      id: 'demo-sitter-3',
      name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300',
      headline: 'Special Needs & Pediatric Nursing Student',
      bio: 'Patient and attentive caregiver with specialized training in pediatric CPR, special needs support, and sensory-friendly routines.',
      hourly_rate: 28,
      rating: 5.0,
      reviews_count: 34,
      years_experience: 7,
      is_verified: true,
      cover_url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800',
      latOffset: 0.025,
      lngOffset: 0.018,
      city: 'Burnaby',
    },
    {
      id: 'demo-sitter-4',
      name: 'Marcus Vance',
      avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300',
      headline: 'Sports Coach & Youth Mentor',
      bio: 'Great with active kids! Specializing in sports, outdoor activities, and engaging educational games.',
      hourly_rate: 24,
      rating: 4.7,
      reviews_count: 14,
      years_experience: 5,
      is_verified: true,
      cover_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
      latOffset: -0.028,
      lngOffset: -0.031,
      city: 'Richmond',
    },
    {
      id: 'demo-sitter-5',
      name: 'Maya Lin',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
      headline: 'Bilingual Caregiver & Music Educator',
      bio: 'Bilingual in English and Mandarin. Piano teacher and loving babysitter for infants and toddlers.',
      hourly_rate: 26,
      rating: 4.9,
      reviews_count: 22,
      years_experience: 5,
      is_verified: true,
      cover_url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800',
      latOffset: 0.035,
      lngOffset: -0.025,
      city: 'North Vancouver',
    },
    {
      id: 'demo-sitter-6',
      name: 'Chloe Bennett',
      avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300',
      headline: 'Overnight & Newborn Care Specialist',
      bio: 'Night nanny specializing in sleep conditioning, newborn care, and supporting new parents.',
      hourly_rate: 30,
      rating: 5.0,
      reviews_count: 41,
      years_experience: 8,
      is_verified: true,
      cover_url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800',
      latOffset: -0.012,
      lngOffset: 0.015,
      city: 'Vancouver',
    }
  ];

  return demoSittersConfig.map((item) => {
    const sitterLat = lat + item.latOffset;
    const sitterLng = lng + item.lngOffset;
    const dist = calculateHaversineDistanceKm(lat, lng, sitterLat, sitterLng);

    return {
      id: item.id,
      name: item.name,
      avatar_url: item.avatar_url,
      headline: item.headline,
      bio: item.bio,
      hourly_rate: item.hourly_rate,
      rating: item.rating,
      reviews_count: item.reviews_count,
      years_experience: item.years_experience,
      is_verified: item.is_verified,
      cover_url: item.cover_url,
      distance_km: dist,
      city: item.city,
      province: 'BC',
      latitude: sitterLat,
      longitude: sitterLng,
      isApproximate: true,
      location_privacy_note: 'Approximate distance shown. Exact address shared after booking is confirmed.',
    };
  });
}
