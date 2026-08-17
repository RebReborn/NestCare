import { NextResponse } from 'next/server';
import { checkDoubleBooking } from '@/lib/bookings/service';

export async function POST(request: Request) {
  try {
    const { sitter_id, start_time, end_time, exclude_booking_id } = await request.json();

    if (!sitter_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const isBooked = await checkDoubleBooking(sitter_id, start_time, end_time, exclude_booking_id);
    return NextResponse.json({ isBooked });
  } catch (err: any) {
    console.error('Availability check API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
