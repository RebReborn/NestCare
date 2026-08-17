import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendEmail,
  renderBookingRequestEmail,
  renderBookingStatusEmail,
  renderMessageDigestEmail,
  renderLifecycleEmail,
} from '@/lib/email/email-service';

// Lifecycle event → emoji + accent color mapping
const LIFECYCLE_STYLE: Record<string, { emoji: string; accentColor: string; ctaText: string }> = {
  booking_requested:   { emoji: '📅', accentColor: '#15803d', ctaText: 'Review Request' },
  payment_confirmed:   { emoji: '✅', accentColor: '#0369a1', ctaText: 'View Booking' },
  sitter_accepted:     { emoji: '🎉', accentColor: '#15803d', ctaText: 'View Booking' },
  sitter_declined:     { emoji: '📋', accentColor: '#b45309', ctaText: 'Find Another Sitter' },
  booking_reminder:    { emoji: '⏰', accentColor: '#7c3aed', ctaText: 'View Details' },
  sitter_arriving:     { emoji: '🚗', accentColor: '#0369a1', ctaText: 'View Booking' },
  booking_started:     { emoji: '🟢', accentColor: '#15803d', ctaText: 'View Carefeed' },
  booking_ending_soon: { emoji: '⌛', accentColor: '#92400e', ctaText: 'View Booking' },
  booking_completed:   { emoji: '🌟', accentColor: '#b45309', ctaText: 'Leave a Review' },
  payout_processed:    { emoji: '💸', accentColor: '#15803d', ctaText: 'View Earnings' },
  cancellation:        { emoji: '❌', accentColor: '#dc2626', ctaText: 'View Bookings' },
  refund_issued:       { emoji: '💰', accentColor: '#0369a1', ctaText: 'View Details' },
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Allow both authenticated and service-role calls (webhook and notify API)
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { type, recipientId, payload } = body;

    if (!recipientId || !type) {
      return NextResponse.json({ error: 'Missing type or recipientId' }, { status: 400 });
    }

    // Check recipient's email notification preferences
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('email_enabled')
      .eq('profile_id', recipientId)
      .maybeSingle();

    if (pref && pref.email_enabled === false) {
      console.log(`[Email Dispatch] User ${recipientId} has disabled email notifications. Skipping.`);
      return NextResponse.json({ success: true, skipped: true, reason: 'user_disabled' });
    }

    // Get recipient email & info
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('email, first_name, display_name')
      .eq('id', recipientId)
      .single();

    if (!recipientProfile?.email) {
      return NextResponse.json({ error: 'Recipient email not found' }, { status: 404 });
    }

    const to = recipientProfile.email;
    const recipientName = recipientProfile.first_name || recipientProfile.display_name || 'there';
    let emailContent: { html: string; text: string };
    let subject = 'NestCare Notification';

    if (type === 'booking_request') {
      subject = `New Booking Request from ${payload.parentName || 'a parent'}`;
      emailContent = renderBookingRequestEmail({
        sitterName: recipientName,
        parentName: payload.parentName || 'Parent',
        bookingDate: payload.bookingDate || 'Upcoming Date',
        startTime: payload.startTime || '09:00 AM',
        endTime: payload.endTime || '05:00 PM',
        totalAmount: payload.totalAmount || 0,
        bookingId: payload.bookingId || '',
      });
    } else if (type === 'booking_status') {
      subject = `Booking ${payload.status} by ${payload.sitterName}`;
      emailContent = renderBookingStatusEmail({
        parentName: recipientName,
        sitterName: payload.sitterName || 'Sitter',
        status: payload.status || 'updated',
        bookingDate: payload.bookingDate || 'Date',
      });
    } else if (type === 'message_digest') {
      subject = `New message from ${payload.senderName}`;
      emailContent = renderMessageDigestEmail({
        recipientName,
        senderName: payload.senderName || 'Contact',
        messagePreview: payload.messagePreview || 'You have a new message.',
      });
    } else if (type === 'lifecycle') {
      // Generic lifecycle event — use the unified template
      const eventType = payload.eventType || 'booking_requested';
      const style = LIFECYCLE_STYLE[eventType] || { emoji: '📬', accentColor: '#15803d', ctaText: 'View Booking' };

      subject = payload.title || `NestCare: ${eventType.replace(/_/g, ' ')}`;
      emailContent = renderLifecycleEmail({
        title: payload.title || 'Booking Update',
        body: payload.body || 'Your booking status has changed.',
        recipientName,
        bookingDate: payload.bookingDate || 'Upcoming Date',
        ctaText: style.ctaText,
        ctaUrl: `http://localhost:3000/bookings`,
        accentColor: style.accentColor,
        emoji: style.emoji,
      });
    } else {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('[API Notification Email Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
