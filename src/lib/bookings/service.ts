import { createClient } from '@/lib/supabase/server';
import { Booking, PricingConfig } from '@/types/database';

export interface CalculatedPrice {
  hourly_rate: number;
  duration_minutes: number;
  subtotal: number;
  platform_fee: number;
  tax: number;
  total: number;
  currency: string;
}

export async function calculateBookingPrice(
  sitterId: string,
  startTimeStr: string,
  endTimeStr: string
): Promise<CalculatedPrice> {
  const supabase = await createClient();

  const start = new Date(startTimeStr);
  const end = new Date(endTimeStr);
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.round(durationMs / 60000);

  if (durationMinutes <= 0) {
    throw new Error('End time must be after start time.');
  }

  const { data: sitter, error: sitterError } = await supabase
    .from('sitter_profiles')
    .select('hourly_rate')
    .eq('id', sitterId)
    .single();

  if (sitterError || !sitter) {
    throw new Error('Sitter profile not found.');
  }

  const { data: pricing, error: pricingError } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const activePricing: PricingConfig = pricingError || !pricing
    ? {
        id: 'default',
        platform_percentage: 10.0,
        min_platform_fee: 2.0,
        max_platform_fee: 50.0,
        tax_percentage: 5.0,
        currency: 'USD',
        is_active: true,
        created_at: '',
        updated_at: '',
      }
    : (pricing as unknown as PricingConfig);

  const hourlyRate = Number(sitter.hourly_rate);
  const hours = durationMinutes / 60;
  const subtotal = Number((hourlyRate * hours).toFixed(2));

  let platformFee = subtotal * (Number(activePricing.platform_percentage) / 100);
  platformFee = Math.max(
    Number(activePricing.min_platform_fee),
    Math.min(Number(activePricing.max_platform_fee), platformFee)
  );
  platformFee = Number(platformFee.toFixed(2));

  const tax = Number(
    ((subtotal + platformFee) * (Number(activePricing.tax_percentage) / 100)).toFixed(2)
  );

  const total = Number((subtotal + platformFee + tax).toFixed(2));

  return {
    hourly_rate: hourlyRate,
    duration_minutes: durationMinutes,
    subtotal,
    platform_fee: platformFee,
    tax,
    total,
    currency: activePricing.currency,
  };
}

export async function checkDoubleBooking(
  sitterId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('check_sitter_double_booking', {
    p_sitter_id: sitterId,
    p_start_time: startTime,
    p_end_time: endTime,
    p_exclude_booking_id: excludeBookingId || null,
  });

  if (error) {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('sitter_id', sitterId)
      .in('status', ['pending', 'accepted', 'in_progress'])
      .or(
        `and(start_time.gte.${startTime},start_time.lt.${endTime}),and(end_time.gt.${startTime},end_time.lte.${endTime}),and(start_time.lte.${startTime},end_time.gte.${endTime})`
      );

    if (bookingsError) return false;
    const activeConflicts = excludeBookingId
      ? bookings.filter((b: any) => b.id !== excludeBookingId)
      : bookings;
    return activeConflicts.length > 0;
  }

  return !!data;
}
