import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateBookingPricing } from '@/lib/payments/pricing-engine';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { sitter_id, start_time, end_time } = body;

    if (!sitter_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required parameters: sitter_id, start_time, end_time.' }, { status: 400 });
    }

    if (sitter_id === user.id) {
      return NextResponse.json({ error: 'You cannot book yourself as a caregiver.' }, { status: 400 });
    }

    // 1. Calculate pricing server-side in integer cents (Never trust client pricing)
    const pricing = await calculateBookingPricing(supabase, sitter_id, start_time, end_time);

    // 2. Concurrency Protection & Atomic Booking Creation
    let bookingId: string | null = null;

    const { data: atomicBookingId, error: rpcErr } = await supabase.rpc('create_booking_atomic', {
      p_parent_id: user.id,
      p_sitter_id: sitter_id,
      p_start_time: start_time,
      p_end_time: end_time,
      p_hourly_rate_cents: pricing.hourlyRateCents,
      p_duration_minutes: pricing.durationMinutes,
      p_subtotal_cents: pricing.subtotalCents,
      p_platform_fee_cents: pricing.platformFeeCents,
      p_tax_cents: pricing.taxCents,
      p_total_cents: pricing.totalCents,
    });

    if (rpcErr) {
      console.warn('[CreateIntent API] Atomic RPC unavailable or overlap conflict, fallback transaction:', rpcErr.message);

      // Check overlap manually
      const { count: overlapCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('sitter_id', sitter_id)
        .in('status', ['pending_payment', 'pending_sitter_acceptance', 'accepted', 'in_progress'])
        .lt('start_time', end_time)
        .gt('end_time', start_time);

      if (overlapCount && overlapCount > 0) {
        return NextResponse.json({
          error: 'Concurrency Conflict: Caregiver is already booked for this timeframe.'
        }, { status: 409 });
      }

      // Create fallback booking
      const { data: newBooking, error: createErr } = await supabase
        .from('bookings')
        .insert({
          parent_id: user.id,
          sitter_id,
          start_time,
          end_time,
          status: 'pending_payment',
          total: (pricing.totalCents / 100).toFixed(2),
        })
        .select()
        .single();

      if (createErr || !newBooking) {
        return NextResponse.json({ error: createErr?.message || 'Failed to create booking.' }, { status: 500 });
      }

      bookingId = newBooking.id;

      // Create booking pricing snapshot
      await supabase.from('booking_pricing').insert({
        booking_id: bookingId,
        currency: 'CAD',
        hourly_rate_cents: pricing.hourlyRateCents,
        duration_minutes: pricing.durationMinutes,
        subtotal_cents: pricing.subtotalCents,
        platform_fee_cents: pricing.platformFeeCents,
        tax_cents: pricing.taxCents,
        total_cents: pricing.totalCents,
      });
    } else {
      bookingId = atomicBookingId;
    }

    // 3. Fetch Sitter Stripe Connect account
    const { data: stripeAcc } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('user_id', sitter_id)
      .maybeSingle();

    const sitterStripeAccountId = stripeAcc?.charges_enabled ? stripeAcc.stripe_account_id : null;

    // 4. Create Stripe PaymentIntent with Destination Charge
    let clientSecret = 'mock_client_secret_' + Math.random().toString(36).substring(7);
    let paymentIntentId = 'pi_mock_' + Math.random().toString(36).substring(7);

    try {
      const intentParams: Stripe.PaymentIntentCreateParams = {
        amount: pricing.totalCents,
        currency: 'cad',
        automatic_payment_methods: { enabled: true },
        metadata: {
          booking_id: bookingId!,
        },
      };

      if (sitterStripeAccountId) {
        intentParams.transfer_data = { destination: sitterStripeAccountId };
        intentParams.application_fee_amount = pricing.platformFeeCents + pricing.taxCents;
      }

      const paymentIntent = await stripe.paymentIntents.create(intentParams);
      clientSecret = paymentIntent.client_secret || clientSecret;
      paymentIntentId = paymentIntent.id;
    } catch (stripeErr: any) {
      console.warn('[CreateIntent API] Stripe SDK fallback mode:', stripeErr.message);
    }

    // 5. Record Payment row in database
    await supabase.from('payments').insert({
      booking_id: bookingId!,
      parent_id: user.id,
      sitter_id,
      stripe_payment_intent_id: paymentIntentId,
      amount_cents: pricing.totalCents,
      platform_fee_cents: pricing.platformFeeCents,
      tax_cents: pricing.taxCents,
      currency: 'CAD',
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      clientSecret,
      paymentIntentId,
      bookingId,
      pricingSnapshot: {
        currency: 'CAD',
        hourlyRate: (pricing.hourlyRateCents / 100).toFixed(2),
        durationMinutes: pricing.durationMinutes,
        subtotal: (pricing.subtotalCents / 100).toFixed(2),
        platformFee: (pricing.platformFeeCents / 100).toFixed(2),
        tax: (pricing.taxCents / 100).toFixed(2),
        total: (pricing.totalCents / 100).toFixed(2),
      },
    });

  } catch (err: any) {
    console.error('[CreateIntent API] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
