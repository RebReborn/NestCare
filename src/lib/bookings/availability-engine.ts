import { SupabaseClient } from '@supabase/supabase-js';

export interface AvailabilityCheckResult {
  success: boolean;
  error?: string;
}

export async function validateSitterAvailability(
  supabase: SupabaseClient,
  sitterId: string,
  startTimeStr: string,
  endTimeStr: string,
  excludeBookingId?: string
): Promise<AvailabilityCheckResult> {
  const start = new Date(startTimeStr);
  const end = new Date(endTimeStr);
  const now = new Date();

  // 1. Basic dates checks
  const durationMs = end.getTime() - start.getTime();
  const durationHrs = durationMs / (1000 * 60 * 60);

  if (durationHrs <= 0) {
    return { success: false, error: 'Booking end time must be after the start time.' };
  }

  // Fetch sitter details including notice requirements
  const { data: sitter, error: sitterErr } = await supabase
    .from('sitter_profiles')
    .select('minimum_booking_hours, minimum_notice_hours, is_available')
    .eq('id', sitterId)
    .single();

  if (sitterErr || !sitter) {
    return { success: false, error: 'Caregiver profile details not found.' };
  }

  if (!sitter.is_available) {
    return { success: false, error: 'Caregiver is not currently active or accepting bookings.' };
  }

  // Check minimum duration constraint
  if (durationHrs < sitter.minimum_booking_hours) {
    return {
      success: false,
      error: `Booking duration is too short. Caregiver requires a minimum of ${sitter.minimum_booking_hours} hour(s) per booking.`
    };
  }

  // 2. Minimum notice constraint checks
  const hoursUntilBooking = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilBooking < sitter.minimum_notice_hours) {
    return {
      success: false,
      error: `Booking is too short notice. Caregiver requires at least ${sitter.minimum_notice_hours} hour(s) of advance notice.`
    };
  }

  // 3. Double Booking Validation
  const { data: conflictingBookings, error: bookingsErr } = await supabase
    .from('bookings')
    .select('id')
    .eq('sitter_id', sitterId)
    .in('status', ['pending', 'accepted', 'in_progress'])
    .or(
      `and(start_time.gte.${startTimeStr},start_time.lt.${endTimeStr}),and(end_time.gt.${startTimeStr},end_time.lte.${endTimeStr}),and(start_time.lte.${startTimeStr},end_time.gte.${endTimeStr})`
    );

  if (bookingsErr) {
    return { success: false, error: 'Failed to verify double booking conflicts.' };
  }

  const activeConflicts = excludeBookingId
    ? conflictingBookings.filter((b: any) => b.id !== excludeBookingId)
    : conflictingBookings;

  if (activeConflicts.length > 0) {
    return { success: false, error: 'Caregiver is already booked during this timeframe.' };
  }

  // 4. Blocked dates (vacations) checks
  const { data: exceptions, error: exceptionsErr } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('sitter_id', sitterId);

  if (exceptionsErr) {
    return { success: false, error: 'Failed to retrieve availability exceptions.' };
  }

  // Check if any 'unavailable' exception overlaps with the booking timeframe
  const isBlocked = exceptions.some(ex => {
    if (ex.exception_type !== 'unavailable') return false;
    const exStart = new Date(ex.start_date);
    const exEnd = new Date(ex.end_date);
    return (start < exEnd) && (end > exStart);
  });

  if (isBlocked) {
    return { success: false, error: 'Caregiver has requested time-off or vacation during this timeframe.' };
  }

  // Check if there is an 'available_override' (e.g. one-time availability override)
  // If the booking falls completely within an override, the sitter is available
  const matchingOverride = exceptions.find(ex => {
    if (ex.exception_type !== 'available_override') return false;
    const exStart = new Date(ex.start_date);
    const exEnd = new Date(ex.end_date);
    return (start >= exStart) && (end <= exEnd);
  });

  if (matchingOverride) {
    // Falls within override shift! Success.
    return { success: true };
  }

  // 5. Weekly Recurring Availability Rules check
  const bookingDayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Format local HH:MM:SS of booking to compare with TIME column format
  const pad = (num: number) => String(num).padStart(2, '0');
  const bookingStartTimeOfDay = `${pad(start.getHours())}:${pad(start.getMinutes())}:00`;
  const bookingEndTimeOfDay = `${pad(end.getHours())}:${pad(end.getMinutes())}:00`;

  // Fetch regular rules for this day of week
  const { data: rules, error: rulesErr } = await supabase
    .from('availability_rules')
    .select('start_time, end_time')
    .eq('sitter_id', sitterId)
    .eq('day_of_week', bookingDayOfWeek);

  if (rulesErr) {
    return { success: false, error: 'Failed to retrieve recurring shift configuration.' };
  }

  if (!rules || rules.length === 0) {
    return { success: false, error: 'Caregiver is not scheduled to work on this day of the week.' };
  }

  // Check if booking hours fall within any of the recurring shifts for this day
  const fallsWithinShift = rules.some(rule => {
    const shiftStart = rule.start_time; // format "HH:MM:SS"
    const shiftEnd = rule.end_time;     // format "HH:MM:SS"
    return (bookingStartTimeOfDay >= shiftStart) && (bookingEndTimeOfDay <= shiftEnd);
  });

  if (!fallsWithinShift) {
    return {
      success: false,
      error: `Booking time falls outside the caregiver's scheduled shifts on this day.`
    };
  }

  return { success: true };
}
