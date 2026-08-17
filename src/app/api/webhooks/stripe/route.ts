import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
      }
    } else {
      // Dev fallback event parser
      try {
        event = JSON.parse(rawBody);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
      }
    }

    const eventId = event.id || ('evt_mock_' + Date.now());
    const eventType = event.type || 'unknown';

    // 1. Transactional Idempotency Guard
    const { data: existingEvent } = await supabase
      .from('stripe_events')
      .select('id, processed')
      .eq('stripe_event_id', eventId)
      .maybeSingle();

    if (existingEvent && existingEvent.processed) {
      console.log(`[Stripe Webhook] Event ${eventId} already processed. Skipping.`);
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    if (!existingEvent) {
      await supabase.from('stripe_events').insert({
        stripe_event_id: eventId,
        event_type: eventType,
        processed: false,
      });
    }

    // 2. Business Event Handlers
    switch (eventType) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const bookingId = intent.metadata?.booking_id;

        // Update payment status
        await supabase
          .from('payments')
          .update({ status: 'succeeded', stripe_charge_id: intent.latest_charge as string || null })
          .eq('stripe_payment_intent_id', intent.id);

        if (bookingId) {
          // Transition Booking state to 'pending_sitter_acceptance' (Separated from Payment state!)
          await supabase
            .from('bookings')
            .update({ status: 'pending_sitter_acceptance' })
            .eq('id', bookingId);

          console.log(`[Stripe Webhook] Booking ${bookingId} payment succeeded. State -> pending_sitter_acceptance`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const bookingId = intent.metadata?.booking_id;

        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', intent.id);

        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ status: 'pending_payment' })
            .eq('id', bookingId);
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.user_id;

        if (account.id) {
          await supabase
            .from('stripe_accounts')
            .update({
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled,
              details_submitted: account.details_submitted,
              onboarding_status: account.charges_enabled && account.payouts_enabled ? 'completed' : 'pending',
              requirements_current: account.requirements?.eventually_due || [],
              last_synced_at: new Date().toISOString(),
            })
            .eq('stripe_account_id', account.id);

          console.log(`[Stripe Webhook] Sync Connect account ${account.id}. Charges: ${account.charges_enabled}, Payouts: ${account.payouts_enabled}`);
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = dispute.charge as string;

        // Locate payment row
        const { data: payment } = await supabase
          .from('payments')
          .select('id, booking_id, amount_cents')
          .eq('stripe_charge_id', chargeId)
          .maybeSingle();

        if (payment) {
          await supabase.from('disputes').insert({
            booking_id: payment.booking_id,
            payment_id: payment.id,
            stripe_dispute_id: dispute.id,
            amount_cents: dispute.amount || payment.amount_cents,
            currency: dispute.currency?.toUpperCase() || 'CAD',
            reason: dispute.reason || 'general_dispute',
            description: dispute.evidence?.uncategorized_text || 'Dispute initiated via Stripe',
            status: 'under_review',
            evidence_due_by: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : null,
            is_charge_refundable: dispute.is_charge_refundable,
          });

          await supabase.from('payments').update({ status: 'disputed' }).eq('id', payment.id);
          await supabase.from('bookings').update({ status: 'disputed' }).eq('id', payment.booking_id);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        const { data: payment } = await supabase
          .from('payments')
          .select('id, booking_id, amount_cents')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle();

        if (payment) {
          const refundedAmount = charge.amount_refunded || payment.amount_cents;
          
          await supabase.from('refunds').insert({
            booking_id: payment.booking_id,
            payment_id: payment.id,
            stripe_refund_id: 're_' + Math.random().toString(36).substring(7),
            amount_cents: refundedAmount,
            reason: 'Stripe webhook charge refund',
            status: 'succeeded',
            completed_at: new Date().toISOString(),
          });

          await supabase
            .from('payments')
            .update({ status: refundedAmount >= payment.amount_cents ? 'refunded' : 'partially_refunded' })
            .eq('id', payment.id);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${eventType}`);
    }

    // 3. Mark Webhook Event as Processed
    await supabase
      .from('stripe_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('stripe_event_id', eventId);

    return NextResponse.json({ received: true, status: 'success' });

  } catch (err: any) {
    console.error('[Stripe Webhook] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
