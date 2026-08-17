import { createClient } from '@/lib/supabase/server';
import { calculateBookingPricing } from '@/lib/payments/pricing-engine';

export interface CalculatedPrice {
  hourly_rate: number;
  duration_minutes: number;
  subtotal: number;
  platform_fee: number;
  tax: number;
  total: number;
  currency: string;
  // Audit properties
  child_count?: number;
  pricing_model?: 'flat' | 'additional_child' | 'per_child';
  base_hourly_rate_cents?: number;
  additional_child_rate_cents?: number;
}

export async function calculateBookingPrice(
  sitterId: string,
  startTimeStr: string,
  endTimeStr: string,
  childIds: string[]
): Promise<CalculatedPrice> {
  const supabase = await createClient();
  const pricing = await calculateBookingPricing(
    supabase,
    sitterId,
    startTimeStr,
    endTimeStr,
    childIds
  );

  return {
    hourly_rate: pricing.hourlyRateCents / 100,
    duration_minutes: pricing.durationMinutes,
    subtotal: pricing.subtotalCents / 100,
    platform_fee: pricing.platformFeeCents / 100,
    tax: pricing.taxCents / 100,
    total: pricing.totalCents / 100,
    currency: pricing.currency,
    child_count: pricing.childCount,
    pricing_model: pricing.pricingModel,
    base_hourly_rate_cents: pricing.baseHourlyRateCents,
    additional_child_rate_cents: pricing.additionalChildRateCents,
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
