import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const extensionId = body.extensionId || body.extension_id;
    const bookingId = body.bookingId || body.booking_id;
    let action = body.action;
    if (!action && typeof body.approved === 'boolean') {
      action = body.approved ? 'approve' : 'decline';
    }

    if ((!extensionId && !bookingId) || !['approve', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters. Required extensionId or bookingId, and action ("approve" | "decline").' }, { status: 400 });
    }

    // 1. Fetch extension record (by extension ID first, then by booking ID fallback)
    let extension: any = null;

    if (extensionId) {
      const { data: byId } = await supabase
        .from('booking_extensions')
        .select('*, booking:bookings(*)')
        .eq('id', extensionId)
        .maybeSingle();

      if (byId) {
        extension = byId;
      }
    }

    if (!extension && (bookingId || extensionId)) {
      const targetBookingId = bookingId || extensionId;
      const { data: byBooking } = await supabase
        .from('booking_extensions')
        .select('*, booking:bookings(*)')
        .eq('booking_id', targetBookingId)
        .eq('status', 'requested')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byBooking) {
        extension = byBooking;
      }
    }

    if (!extension || !extension.booking) {
      return NextResponse.json({ error: 'Extension request not found.' }, { status: 404 });
    }

    const booking = extension.booking;
    if (booking.sitter_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden. Only the assigned caregiver can respond to extension requests.' }, { status: 403 });
    }

    if (extension.status !== 'requested') {
      return NextResponse.json({ error: `Extension request has already been ${extension.status}.` }, { status: 400 });
    }

    if (action === 'decline') {
      await supabase
        .from('booking_extensions')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', extensionId);

      await supabase.from('booking_timeline_events').insert({
        booking_id: booking.id,
        event_type: 'extension_declined',
        description: `Extension request of +${extension.additional_duration_minutes} minutes was declined by sitter.`,
        actor_id: user.id,
        metadata: { extension_id: extensionId },
      });

      return NextResponse.json({ success: true, status: 'declined' });
    }

    // 2. Action: Approve Extension
    const newExtensionMinutes = (booking.extension_minutes || 0) + extension.additional_duration_minutes;

    // Update booking_extensions table
    const { error: extUpdateErr } = await supabase
      .from('booking_extensions')
      .update({
        status: 'approved',
        payment_status: 'succeeded', // Simulate successful Stripe payment intent capture
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', extensionId);

    if (extUpdateErr) throw extUpdateErr;

    // Update bookings table
    const { error: bookingUpdateErr } = await supabase
      .from('bookings')
      .update({
        extension_minutes: newExtensionMinutes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (bookingUpdateErr) throw bookingUpdateErr;

    // Log timeline event
    await supabase.from('booking_timeline_events').insert({
      booking_id: booking.id,
      event_type: 'extension_approved',
      description: `Extension approved! Booking care window extended by +${extension.additional_duration_minutes} minutes.`,
      actor_id: user.id,
      metadata: {
        extension_id: extensionId,
        additional_minutes: extension.additional_duration_minutes,
        total_extension_minutes: newExtensionMinutes,
        additional_total_cents: extension.additional_total_cents
      },
    });

    return NextResponse.json({
      success: true,
      status: 'approved',
      extension_minutes: newExtensionMinutes,
    });

  } catch (err: any) {
    console.error('[Extension Respond Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
