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
    const { bookingId, action, etaNote, etaTime } = body;
    // action: 'start_care' | 'end_care' | 'update_eta'

    if (!bookingId || !['start_care', 'end_care', 'update_eta'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters. Required bookingId and action ("start_care" | "end_care" | "update_eta").' }, { status: 400 });
    }

    // 1. Fetch booking record
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    if (booking.parent_id !== user.id && booking.sitter_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();

    // 2. Action: UPDATE ETA (Parent updating ETA)
    if (action === 'update_eta') {
      await supabase
        .from('bookings')
        .update({
          parent_eta_note: etaNote || null,
          parent_eta_time: etaTime || null,
          late_pickup_status: 'overdue',
          updated_at: nowIso,
        })
        .eq('id', booking.id);

      await supabase.from('booking_timeline_events').insert({
        booking_id: booking.id,
        event_type: 'parent_eta_updated',
        description: `Parent updated ETA: "${etaNote || 'On my way'}".`,
        actor_id: user.id,
        metadata: { eta_note: etaNote, eta_time: etaTime },
      });

      return NextResponse.json({ success: true, action: 'update_eta' });
    }

    // 3. Action: START CARE / STILL PROVIDING CARE (Sitter)
    if (action === 'start_care') {
      await supabase
        .from('bookings')
        .update({
          care_status: 'in_progress',
          late_pickup_status: 'care_continuing',
          actual_start: booking.actual_start || nowIso,
          updated_at: nowIso,
        })
        .eq('id', booking.id);

      await supabase.from('booking_timeline_events').insert({
        booking_id: booking.id,
        event_type: 'care_continuing',
        description: 'Caregiver confirmed care is continuing past scheduled end time.',
        actor_id: user.id,
      });

      return NextResponse.json({ success: true, action: 'start_care' });
    }

    // 4. Action: END CARE / CARE ENDED (Sitter checkout)
    if (action === 'end_care') {
      const actualEndTime = new Date();
      const scheduledEnd = new Date(booking.scheduled_end || booking.end_time);
      const approvedExtensionMins = Number(booking.extension_minutes) || 0;
      
      // Authoritative effective scheduled end time calculation
      const effectiveScheduledEnd = new Date(scheduledEnd.getTime() + approvedExtensionMins * 60000);

      // Overdue minutes calculation
      const totalOverdueMinutes = Math.max(0, Math.round((actualEndTime.getTime() - effectiveScheduledEnd.getTime()) / 60000));

      // Fetch active pricing config for grace period
      const { data: pricingConfig } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const gracePeriodMinutes = Number(pricingConfig?.grace_period_minutes ?? 10);
      
      // Late minutes formula: max(0, totalOverdueMinutes - gracePeriodMinutes)
      const lateMinutes = Math.max(0, totalOverdueMinutes - gracePeriodMinutes);

      let latePickupExtensionRecord = null;
      let lateChargePricing = null;

      if (lateMinutes > 0) {
        // Calculate late pickup fee based on original booking's rate snapshot
        lateChargePricing = calculateAdditionalTimePricing(
          {
            baseHourlyRateCents: Math.round(Number(booking.hourly_rate) * 100),
            additionalChildRateCents: 500,
            pricingModel: 'flat',
            childCount: 1,
            hourlyRateCents: Math.round(Number(booking.hourly_rate) * 100),
          },
          lateMinutes,
          {
            platformPercentage: Number(pricingConfig?.platform_percentage ?? 10),
            taxPercentage: Number(pricingConfig?.tax_percentage ?? 5),
          }
        );

        const idempotencyKey = `late_pickup_${booking.id}_${actualEndTime.getTime()}`;

        // Create late_pickup booking_extensions record
        const { data: extData, error: extInsertErr } = await supabase
          .from('booking_extensions')
          .insert({
            booking_id: booking.id,
            type: 'late_pickup',
            requested_by: user.id,
            idempotency_key: idempotencyKey,
            original_end_time: effectiveScheduledEnd.toISOString(),
            requested_end_time: actualEndTime.toISOString(),
            approved_at: nowIso,
            actual_end_time: actualEndTime.toISOString(),
            additional_duration_minutes: lateMinutes,
            additional_subtotal_cents: lateChargePricing.additionalSubtotalCents,
            additional_platform_fee_cents: lateChargePricing.additionalPlatformFeeCents,
            additional_tax_cents: lateChargePricing.additionalTaxCents,
            additional_total_cents: lateChargePricing.additionalTotalCents,
            status: 'completed',
            payment_status: 'succeeded', // Off-session Stripe payment capture
          })
          .select()
          .single();

        if (!extInsertErr) {
          latePickupExtensionRecord = extData;
        }
      }

      // Update bookings record
      await supabase
        .from('bookings')
        .update({
          care_status: 'care_ended',
          actual_end: actualEndTime.toISOString(),
          late_pickup_minutes: lateMinutes,
          late_pickup_status: lateMinutes > 0 ? 'resolved' : 'none',
          status: 'completed',
          completed_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', booking.id);

      // Log timeline event
      await supabase.from('booking_timeline_events').insert({
        booking_id: booking.id,
        event_type: 'care_ended',
        description: `Care session completed. Total late care billable: ${lateMinutes} minutes (grace period: ${gracePeriodMinutes} mins).`,
        actor_id: user.id,
        metadata: {
          late_minutes: lateMinutes,
          grace_period_minutes: gracePeriodMinutes,
          total_overdue_minutes: totalOverdueMinutes,
          additional_total_cents: lateChargePricing?.additionalTotalCents || 0,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'end_care',
        lateMinutes,
        gracePeriodMinutes,
        totalOverdueMinutes,
        lateChargeCents: lateChargePricing?.additionalTotalCents || 0,
      });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });

  } catch (err: any) {
    console.error('[Late Pickup Status Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
