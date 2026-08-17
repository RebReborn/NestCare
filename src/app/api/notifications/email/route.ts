import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendEmail,
  renderBookingRequestEmail,
  renderBookingStatusEmail,
  renderMessageDigestEmail,
} from '@/lib/email/email-service';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Ensure authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    let emailContent: { html: string; text: string };
    let subject = 'NestCare Notification';

    if (type === 'booking_request') {
      subject = `New Booking Request from ${payload.parentName || 'a parent'}`;
      emailContent = renderBookingRequestEmail({
        sitterName: recipientProfile.first_name || 'Caregiver',
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
        parentName: recipientProfile.first_name || 'Parent',
        sitterName: payload.sitterName || 'Sitter',
        status: payload.status || 'updated',
        bookingDate: payload.bookingDate || 'Date',
      });
    } else if (type === 'message_digest') {
      subject = `New message from ${payload.senderName}`;
      emailContent = renderMessageDigestEmail({
        recipientName: recipientProfile.first_name || 'User',
        senderName: payload.senderName || 'Contact',
        messagePreview: payload.messagePreview || 'You have a new message.',
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
