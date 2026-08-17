import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS for notification writes
const getServiceSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

type BookingEvent =
  | 'booking_requested'
  | 'payment_confirmed'
  | 'sitter_accepted'
  | 'sitter_declined'
  | 'booking_reminder'
  | 'sitter_arriving'
  | 'booking_started'
  | 'booking_ending_soon'
  | 'booking_completed'
  | 'payout_processed'
  | 'cancellation'
  | 'refund_issued';

interface NotifyPayload {
  bookingId: string;
  event: BookingEvent;
  /** Override recipient (for payout_processed etc) */
  overrideRecipientId?: string;
}

function buildNotificationContent(
  event: BookingEvent,
  booking: any,
  parentName: string,
  sitterName: string,
  bookingDate: string
): {
  notifyParent: boolean;
  notifySitter: boolean;
  parentTitle: string;
  parentContent: string;
  sitterTitle: string;
  sitterContent: string;
} {
  const base = {
    notifyParent: true,
    notifySitter: false,
    parentTitle: '',
    parentContent: '',
    sitterTitle: '',
    sitterContent: '',
  };

  switch (event) {
    case 'booking_requested':
      return {
        ...base,
        notifyParent: false,
        notifySitter: true,
        sitterTitle: '📅 New Booking Request',
        sitterContent: `${parentName} has sent a booking request for ${bookingDate}. Review and respond!`,
      };

    case 'payment_confirmed':
      return {
        ...base,
        notifySitter: true,
        parentTitle: '✅ Payment Confirmed',
        parentContent: `Your payment for the ${bookingDate} session with ${sitterName} has been confirmed. Awaiting sitter acceptance.`,
        sitterTitle: '💳 Payment Received',
        sitterContent: `${parentName}'s payment for ${bookingDate} has been confirmed. Please review and accept the booking.`,
      };

    case 'sitter_accepted':
      return {
        ...base,
        notifySitter: false,
        parentTitle: '🎉 Booking Confirmed!',
        parentContent: `${sitterName} has accepted your booking for ${bookingDate}. You're all set!`,
      };

    case 'sitter_declined':
      return {
        ...base,
        notifySitter: false,
        parentTitle: '📋 Booking Declined',
        parentContent: `${sitterName} has declined your booking request for ${bookingDate}. Browse other sitters to find a match.`,
      };

    case 'booking_reminder':
      return {
        ...base,
        notifySitter: true,
        parentTitle: '⏰ Booking Reminder',
        parentContent: `Reminder: Your childcare session with ${sitterName} is scheduled for tomorrow, ${bookingDate}.`,
        sitterTitle: '⏰ Upcoming Booking Reminder',
        sitterContent: `Reminder: You have a care session with ${parentName} tomorrow, ${bookingDate}. Please confirm your availability.`,
      };

    case 'sitter_arriving':
      return {
        ...base,
        notifySitter: false,
        parentTitle: '🚗 Sitter On the Way',
        parentContent: `${sitterName} is on their way to your location for your ${bookingDate} session.`,
      };

    case 'booking_started':
      return {
        ...base,
        notifySitter: false,
        parentTitle: '🟢 Care Session Started',
        parentContent: `Your care session with ${sitterName} has started. You can track updates in the live carefeed.`,
      };

    case 'booking_ending_soon':
      return {
        ...base,
        notifySitter: true,
        parentTitle: '⌛ Session Ending Soon',
        parentContent: `Your session with ${sitterName} ends in 30 minutes.`,
        sitterTitle: '⌛ Session Ending Soon',
        sitterContent: `Your session with ${parentName} ends in 30 minutes. Start wrapping up.`,
      };

    case 'booking_completed':
      return {
        ...base,
        notifySitter: true,
        parentTitle: '🌟 Session Completed',
        parentContent: `Your session with ${sitterName} on ${bookingDate} is complete. Please leave a review!`,
        sitterTitle: '🌟 Session Completed',
        sitterContent: `Your session with ${parentName} on ${bookingDate} is complete. Payout will be processed shortly.`,
      };

    case 'payout_processed':
      return {
        ...base,
        notifyParent: false,
        notifySitter: true,
        sitterTitle: '💸 Payout Processed',
        sitterContent: `Your earnings from the ${bookingDate} session with ${parentName} have been transferred to your bank account.`,
      };

    case 'cancellation':
      return {
        ...base,
        notifySitter: true,
        parentTitle: '❌ Booking Cancelled',
        parentContent: `Your booking for ${bookingDate} has been cancelled.`,
        sitterTitle: '❌ Booking Cancelled',
        sitterContent: `The booking with ${parentName} for ${bookingDate} has been cancelled.`,
      };

    case 'refund_issued':
      return {
        ...base,
        notifySitter: false,
        parentTitle: '💰 Refund Issued',
        parentContent: `A refund for your ${bookingDate} booking has been processed. Funds will appear in 3–5 business days.`,
      };

    default:
      return base;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body: NotifyPayload = await req.json();
    const { bookingId, event, overrideRecipientId } = body;

    if (!bookingId || !event) {
      return NextResponse.json({ error: 'Missing bookingId or event' }, { status: 400 });
    }

    // Fetch booking with party names
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(`
        id, parent_id, sitter_id, start_time, total,
        parent:profiles!bookings_parent_id_fkey(display_name, email),
        sitter:profiles!bookings_sitter_id_fkey(display_name, email)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const parentName = (booking.parent as any)?.display_name || 'Parent';
    const sitterName = (booking.sitter as any)?.display_name || 'Sitter';
    const bookingDate = new Date(booking.start_time).toLocaleDateString('en-CA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const notifLink = `/bookings`;

    const content = buildNotificationContent(event, booking, parentName, sitterName, bookingDate);

    const inAppInserts: any[] = [];

    if (content.notifyParent && content.parentTitle) {
      inAppInserts.push({
        profile_id: booking.parent_id,
        type: event,
        title: content.parentTitle,
        content: content.parentContent,
        link: notifLink,
      });
    }

    if (content.notifySitter && content.sitterTitle) {
      inAppInserts.push({
        profile_id: overrideRecipientId || booking.sitter_id,
        type: event,
        title: content.sitterTitle,
        content: content.sitterContent,
        link: notifLink,
      });
    }

    if (inAppInserts.length > 0) {
      const { error: insertErr } = await supabase.from('notifications').insert(inAppInserts);
      if (insertErr) {
        console.warn('[Notify] In-app insert error:', insertErr.message);
      }
    }

    // Fire email notifications (fire-and-forget, non-blocking)
    const emailDispatches: Promise<any>[] = [];

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (content.notifyParent && content.parentTitle && booking.parent_id) {
      emailDispatches.push(
        fetch(`${baseUrl}/api/notifications/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'lifecycle',
            recipientId: booking.parent_id,
            payload: {
              eventType: event,
              recipientRole: 'parent',
              title: content.parentTitle,
              body: content.parentContent,
              bookingDate,
              sitterName,
              parentName,
              bookingId,
            },
          }),
        }).catch(e => console.warn('[Email parent]', e.message))
      );
    }

    if (content.notifySitter && content.sitterTitle) {
      const sitterRecipientId = overrideRecipientId || booking.sitter_id;
      emailDispatches.push(
        fetch(`${baseUrl}/api/notifications/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'lifecycle',
            recipientId: sitterRecipientId,
            payload: {
              eventType: event,
              recipientRole: 'sitter',
              title: content.sitterTitle,
              body: content.sitterContent,
              bookingDate,
              sitterName,
              parentName,
              bookingId,
            },
          }),
        }).catch(e => console.warn('[Email sitter]', e.message))
      );
    }

    // Await email dispatches (optional — won't block response)
    await Promise.allSettled(emailDispatches);

    return NextResponse.json({ success: true, event, inAppCount: inAppInserts.length });
  } catch (err: any) {
    console.error('[Notify API] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
