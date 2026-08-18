import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateAdditionalTimePricing } from '@/lib/payments/pricing-engine';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const bookingId = body.bookingId || body.booking_id;
    const additionalMinutes = body.additionalMinutes ?? body.requested_minutes ?? body.additional_minutes;
    const customEndTime = body.customEndTime || body.custom_end_time;
    const idempotencyKey = body.idempotencyKey || body.idempotency_key;

    if (!bookingId || (!additionalMinutes && !customEndTime)) {
      return NextResponse.json({ error: 'Missing required parameters (bookingId and additionalMinutes or customEndTime).' }, { status: 400 });
    }

    // 1. Fetch target booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    if (booking.parent_id !== user.id && booking.sitter_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden. You are not a participant in this booking.' }, { status: 403 });
    }

    // 2. Check for existing idempotent extension request
    const effIdempotencyKey = idempotencyKey || `ext_req_${bookingId}_${additionalMinutes}_${Date.now()}`;
    const { data: existingExtension } = await supabase
      .from('booking_extensions')
      .select('*')
      .eq('idempotency_key', effIdempotencyKey)
      .maybeSingle();

    if (existingExtension) {
      return NextResponse.json({ extension: existingExtension, status: 'existing' });
    }

    // 3. Determine requested extension times
    const scheduledEnd = new Date(booking.scheduled_end || booking.end_time);
    const effectiveScheduledEnd = new Date(scheduledEnd.getTime() + (booking.extension_minutes || 0) * 60000);

    let extensionMins = Number(additionalMinutes) || 0;
    if (customEndTime) {
      const customEnd = new Date(customEndTime);
      if (!isNaN(customEnd.getTime()) && customEnd > effectiveScheduledEnd) {
        extensionMins = Math.round((customEnd.getTime() - effectiveScheduledEnd.getTime()) / 60000);
      }
    }

    if (extensionMins <= 0) {
      return NextResponse.json({ error: 'Extension duration must be greater than 0 minutes.' }, { status: 400 });
    }

    const requestedEndTime = new Date(effectiveScheduledEnd.getTime() + extensionMins * 60000);

    // 4. Sitter Schedule Protection Guard
    // Check if the sitter has any other upcoming accepted or in_progress bookings that overlap with requestedEndTime
    const { data: overlappingBookings } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('sitter_id', booking.sitter_id)
      .neq('id', booking.id)
      .in('status', ['accepted', 'in_progress'])
      .lt('start_time', requestedEndTime.toISOString())
      .gt('end_time', effectiveScheduledEnd.toISOString());

    if (overlappingBookings && overlappingBookings.length > 0) {
      return NextResponse.json({
        error: 'Extension unavailable. Sitter has another scheduled booking during this timeframe.',
        conflict: true
      }, { status: 409 });
    }

    // 5. Calculate snapshot-based extension pricing estimate
    const { data: pricingConfig } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const pricingEstimate = calculateAdditionalTimePricing(
      {
        baseHourlyRateCents: Math.round(Number(booking.hourly_rate) * 100),
        additionalChildRateCents: 500,
        pricingModel: 'flat',
        childCount: 1,
        hourlyRateCents: Math.round(Number(booking.hourly_rate) * 100),
      },
      extensionMins,
      {
        platformPercentage: Number(pricingConfig?.platform_percentage ?? 10),
        taxPercentage: Number(pricingConfig?.tax_percentage ?? 5),
      }
    );

    // 6. Insert booking_extensions record
    const { data: newExtension, error: insertErr } = await supabase
      .from('booking_extensions')
      .insert({
        booking_id: booking.id,
        type: 'extension',
        requested_by: user.id,
        idempotency_key: effIdempotencyKey,
        original_end_time: effectiveScheduledEnd.toISOString(),
        requested_end_time: requestedEndTime.toISOString(),
        additional_duration_minutes: extensionMins,
        additional_subtotal_cents: pricingEstimate.additionalSubtotalCents,
        additional_platform_fee_cents: pricingEstimate.additionalPlatformFeeCents,
        additional_tax_cents: pricingEstimate.additionalTaxCents,
        additional_total_cents: pricingEstimate.additionalTotalCents,
        status: 'requested',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (insertErr) {
      throw insertErr;
    }

    // 7. Log timeline event
    await supabase.from('booking_timeline_events').insert({
      booking_id: booking.id,
      event_type: 'extension_requested',
      description: `Extension of +${extensionMins} minutes requested until ${requestedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      actor_id: user.id,
      metadata: { extension_id: newExtension.id, duration_minutes: extensionMins, total_cents: pricingEstimate.additionalTotalCents },
    });

    // 8. Fire Instant SMS & Push Alert to partner
    const recipientId = user.id === booking.sitter_id ? booking.parent_id : booking.sitter_id;
    fetch(`${req.nextUrl.origin}/api/notifications/sms-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: booking.id,
        recipientId,
        type: 'extension_requested',
        title: '⌛ Extension Requested',
        message: `A +${extensionMins}-minute care extension has been requested for your session. Tap to review and confirm.`,
        link: `/bookings/${booking.id}/carefeed`,
      }),
    }).catch(e => console.warn('[SMS Push Alert]', e.message));

    return NextResponse.json({ success: true, extension: newExtension });

  } catch (err: any) {
    console.error('[Extension Request Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
