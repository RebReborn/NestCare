import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceSupabase } from '@supabase/supabase-js';

const getServiceSupabase = () => {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServiceSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId parameter' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: session, error } = await supabase
      .from('booking_location_sessions')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('sharing_status', 'active')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userSupabase = await createClient();
    const { data: { user }, error: authErr } = await userSupabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, latitude, longitude, action } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId parameter' }, { status: 400 });
    }

    const serviceSupabase = getServiceSupabase();

    // Verify booking belongs to user and is active
    const { data: booking, error: bErr } = await serviceSupabase
      .from('bookings')
      .select('id, sitter_id, parent_id, status, care_latitude, care_longitude')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.sitter_id !== user.id && booking.parent_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Stop tracking action
    if (action === 'stop') {
      await serviceSupabase
        .from('booking_location_sessions')
        .update({
          sharing_status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)
        .eq('sitter_id', user.id);

      return NextResponse.json({ success: true, status: 'ended' });
    }

    // Active location tracking update
    const timestamp = new Date().toISOString();

    const { data: existingSession } = await serviceSupabase
      .from('booking_location_sessions')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('sharing_status', 'active')
      .maybeSingle();

    if (existingSession) {
      await serviceSupabase
        .from('booking_location_sessions')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          last_updated_at: timestamp,
        })
        .eq('id', existingSession.id);
    } else {
      await serviceSupabase
        .from('booking_location_sessions')
        .insert({
          booking_id: bookingId,
          sitter_id: user.id,
          sharing_status: 'active',
          current_latitude: latitude,
          current_longitude: longitude,
          started_at: timestamp,
          last_updated_at: timestamp,
        });
    }

    return NextResponse.json({
      success: true,
      status: 'active',
      location: { latitude, longitude },
      last_updated_at: timestamp,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
