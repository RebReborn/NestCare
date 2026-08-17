import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateSitterAvailability } from '@/lib/bookings/availability-engine';

export async function POST(request: Request) {
  try {
    const { sitter_id, start_time, end_time, exclude_booking_id } = await request.json();

    if (!sitter_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const supabase = await createClient();
    const result = await validateSitterAvailability(
      supabase,
      sitter_id,
      start_time,
      end_time,
      exclude_booking_id
    );

    if (!result.success) {
      return NextResponse.json({ 
        isBooked: true, 
        error: result.error || 'Caregiver is not available.' 
      });
    }

    return NextResponse.json({ isBooked: false });
  } catch (err: any) {
    console.error('Availability check API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
