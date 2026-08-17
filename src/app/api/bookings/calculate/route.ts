import { NextResponse } from 'next/server';
import { calculateBookingPrice } from '@/lib/bookings/service';

export async function POST(request: Request) {
  try {
    const { sitter_id, start_time, end_time } = await request.json();

    if (!sitter_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const priceDetails = await calculateBookingPrice(sitter_id, start_time, end_time);
    return NextResponse.json(priceDetails);
  } catch (err: any) {
    console.error('Pricing calculation API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
