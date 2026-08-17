import { NextResponse } from 'next/server';
import { calculateBookingPrice } from '@/lib/bookings/service';

export async function POST(request: Request) {
  try {
    const { sitter_id, start_time, end_time, child_ids } = await request.json();

    if (!sitter_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    if (!child_ids || !Array.isArray(child_ids) || child_ids.length === 0) {
      return NextResponse.json({ error: 'At least one child profile must be selected.' }, { status: 400 });
    }

    const priceDetails = await calculateBookingPrice(sitter_id, start_time, end_time, child_ids);
    return NextResponse.json(priceDetails);
  } catch (err: any) {
    console.error('Pricing calculation API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
