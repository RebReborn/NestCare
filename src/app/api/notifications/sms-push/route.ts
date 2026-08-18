import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export type AlertType =
  | 'sitter_arrived'
  | 'carefeed_update'
  | 'extension_requested'
  | 'late_pickup_warning';

interface SMSPushPayload {
  bookingId: string;
  recipientId: string;
  type: AlertType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body: SMSPushPayload = await req.json();

    const { bookingId, recipientId, type, title, message, link, metadata } = body;

    if (!bookingId || !recipientId || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required SMS/Push parameters' }, { status: 400 });
    }

    // 1. Fetch Recipient Profile & Verified Phone Number
    const { data: recipientProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, display_name, phone, email')
      .eq('id', recipientId)
      .single();

    if (profileErr || !recipientProfile) {
      return NextResponse.json({ error: 'Recipient profile not found' }, { status: 404 });
    }

    // 2. Insert In-App Push Notification Badge Record into Database
    const notifLink = link || `/bookings/${bookingId}/carefeed`;
    const { error: pushErr } = await supabase
      .from('notifications')
      .insert({
        profile_id: recipientId,
        type: `sms_alert_${type}`,
        title,
        content: message,
        link: notifLink,
      });

    if (pushErr) {
      console.warn('[Push Alert Error]:', pushErr.message);
    }

    // 3. Dispatch Twilio SMS Alert if Phone Number & Twilio Credentials Exist
    let smsStatus = 'simulated';
    const recipientPhone = recipientProfile.phone;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromPhone && recipientPhone) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const bodyParams = new URLSearchParams({
          To: recipientPhone,
          From: fromPhone,
          Body: `📱 NestCare: ${title}\n${message}\nView: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://nestcare.ca'}${notifLink}`,
        });

        const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: bodyParams.toString(),
        });

        if (twilioRes.ok) {
          smsStatus = 'sent';
          console.log(`[Twilio SMS Sent] To: ${recipientPhone} | Msg: ${title}`);
        } else {
          const errData = await twilioRes.json();
          console.warn('[Twilio SMS Error]:', errData);
          smsStatus = 'failed';
        }
      } catch (smsErr: any) {
        console.error('[Twilio Dispatch Exception]:', smsErr.message);
        smsStatus = 'error';
      }
    } else {
      console.log(`[SMS Alert Simulator] To: ${recipientPhone || 'No Phone on File'} | Title: ${title} | Message: ${message}`);
    }

    return NextResponse.json({
      success: true,
      type,
      recipientId,
      smsStatus,
      pushBadgeCreated: !pushErr,
    });
  } catch (err: any) {
    console.error('[SMS/Push API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
