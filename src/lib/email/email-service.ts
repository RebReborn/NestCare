// ============================================================
// NestCare Transactional Email Dispatcher Service
// Supports Resend / SendGrid / SMTP / Console Fallback Logging
// ============================================================

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  try {
    // If RESEND_API_KEY is configured in .env.local, use Resend API
    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'NestCare <notifications@nestcare.app>',
          to,
          subject,
          html,
          text,
        }),
      });
      const data = await res.json();
      console.log(`[Email Dispatcher] Sent via Resend to ${to}:`, data);
      return { success: true, data };
    }

    // Default Fallback: Log email contents in development console
    console.log(`
============================================================
📧 [TRANSACTIONAL EMAIL DISPATCH]
To: ${to}
Subject: ${subject}
------------------------------------------------------------
${text || 'HTML Content Rendered'}
============================================================
`);
    return { success: true, simulated: true };
  } catch (err) {
    console.error('[Email Dispatcher Error]:', err);
    return { success: false, error: err };
  }
}

// ── 1. Booking Request Email Template ───────────────────────
export function renderBookingRequestEmail({
  sitterName,
  parentName,
  bookingDate,
  startTime,
  endTime,
  totalAmount,
  bookingId,
}: {
  sitterName: string;
  parentName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  bookingId: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family: Arial, sans-serif; background-color: #fafaf9; margin: 0; padding: 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e7e5e4; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
          <div style="background: #15803d; width: 32px; height: 32px; border-radius: 10px; display: inline-block; vertical-align: middle;"></div>
          <span style="font-size: 20px; font-weight: 900; color: #1c1917; margin-left: 8px; vertical-align: middle;">NestCare</span>
        </div>
        
        <h1 style="font-size: 20px; font-weight: 800; color: #1c1917; margin-top: 0;">New Booking Request from ${parentName}!</h1>
        <p style="font-size: 14px; color: #57534e; line-height: 1.6;">
          Hi ${sitterName}, you've received a new care booking request on NestCare.
        </p>

        <div style="background: #f5f5f4; border-radius: 16px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #44403c;">
            <tr><td style="padding: 6px 0; color: #78716c;">Date:</td><td style="font-weight: 700; text-align: right;">${bookingDate}</td></tr>
            <tr><td style="padding: 6px 0; color: #78716c;">Time:</td><td style="font-weight: 700; text-align: right;">${startTime} – ${endTime}</td></tr>
            <tr><td style="padding: 6px 0; color: #78716c;">Estimated Earnings:</td><td style="font-weight: 700; text-align: right; color: #15803d;">$${totalAmount.toFixed(2)}</td></tr>
          </table>
        </div>

        <a href="http://localhost:3000/bookings" style="display: block; width: 100%; background: #15803d; color: #ffffff; text-align: center; padding: 14px 0; border-radius: 14px; font-weight: 700; font-size: 14px; text-decoration: none;">
          Review & Accept Request →
        </a>

        <p style="font-size: 11px; color: #a8a29e; text-align: center; margin-top: 24px;">
          © ${new Date().getFullYear()} NestCare Inc. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${sitterName}, you have a new booking request from ${parentName} for ${bookingDate} (${startTime} - ${endTime}). View request at: http://localhost:3000/bookings`;

  return { html, text };
}

// ── 2. Booking Status Email Template (Accepted / Declined) ─────
export function renderBookingStatusEmail({
  parentName,
  sitterName,
  status,
  bookingDate,
}: {
  parentName: string;
  sitterName: string;
  status: 'accepted' | 'declined' | 'cancelled';
  bookingDate: string;
}) {
  const isAccepted = status === 'accepted';
  const title = isAccepted
    ? `Booking Confirmed by ${sitterName}! 🎉`
    : `Booking Update from ${sitterName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family: Arial, sans-serif; background-color: #fafaf9; margin: 0; padding: 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e7e5e4; padding: 32px;">
        <h1 style="font-size: 20px; font-weight: 800; color: #1c1917;">${title}</h1>
        <p style="font-size: 14px; color: #57534e; line-height: 1.6;">
          Hi ${parentName}, your booking request with <strong>${sitterName}</strong> for <strong>${bookingDate}</strong> has been <strong style="color: ${isAccepted ? '#15803d' : '#dc2626'}">${status}</strong>.
        </p>
        <a href="http://localhost:3000/bookings" style="display: inline-block; background: #1c1917; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 13px; text-decoration: none; margin-top: 16px;">
          View Booking Details
        </a>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${parentName}, your booking with ${sitterName} on ${bookingDate} has been ${status}. View details at: http://localhost:3000/bookings`;

  return { html, text };
}


// ── 3. Unread Message Digest Template ───────────────────────
export function renderMessageDigestEmail({
  recipientName,
  senderName,
  messagePreview,
}: {
  recipientName: string;
  senderName: string;
  messagePreview: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family: Arial, sans-serif; background-color: #fafaf9; margin: 0; padding: 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e7e5e4; padding: 32px;">
        <h1 style="font-size: 18px; font-weight: 800; color: #1c1917;">New message from ${senderName}</h1>
        <p style="font-size: 14px; color: #57534e; font-style: italic; background: #f5f5f4; padding: 16px; border-radius: 12px; border-left: 4px solid #15803d;">
          "${messagePreview}"
        </p>
        <a href="http://localhost:3000/messages" style="display: inline-block; background: #15803d; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 13px; text-decoration: none; margin-top: 16px;">
          Reply in Chat →
        </a>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${recipientName}, you have a new message from ${senderName}: "${messagePreview}". Reply at: http://localhost:3000/messages`;

  return { html, text };
}

// ── 4. Lifecycle Event Email Template ────────────────────────
// Handles all 12 booking lifecycle events with a unified, polished template
export function renderLifecycleEmail({
  title,
  body,
  recipientName,
  bookingDate,
  ctaText = 'View Booking',
  ctaUrl = 'http://localhost:3000/bookings',
  accentColor = '#15803d',
  emoji = '📬',
}: {
  title: string;
  body: string;
  recipientName: string;
  bookingDate: string;
  ctaText?: string;
  ctaUrl?: string;
  accentColor?: string;
  emoji?: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #fafaf9; margin: 0; padding: 20px;">
      <div style="max-width: 560px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px; padding: 0 4px;">
          <div style="background: #15803d; width: 28px; height: 28px; border-radius: 8px; display: inline-block; vertical-align: middle;"></div>
          <span style="font-size: 18px; font-weight: 900; color: #1c1917; margin-left: 8px; vertical-align: middle;">NestCare</span>
        </div>

        <!-- Card -->
        <div style="background: #ffffff; border-radius: 20px; border: 1px solid #e7e5e4; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04);">
          <!-- Emoji icon -->
          <div style="font-size: 36px; margin-bottom: 16px;">${emoji}</div>

          <h1 style="font-size: 20px; font-weight: 800; color: #1c1917; margin: 0 0 12px 0; line-height: 1.3;">${title}</h1>

          <p style="font-size: 14px; color: #57534e; line-height: 1.7; margin: 0 0 20px 0;">
            Hi <strong>${recipientName}</strong>, ${body}
          </p>

          <!-- Booking date pill -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; display: inline-block;">
            <span style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em;">📅 Session Date</span>
            <p style="margin: 4px 0 0; font-size: 15px; font-weight: 800; color: #14532d;">${bookingDate}</p>
          </div>

          <!-- CTA Button -->
          <div style="margin-top: 8px;">
            <a href="${ctaUrl}" style="display: inline-block; background: ${accentColor}; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 14px; text-decoration: none;">
              ${ctaText} →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <p style="font-size: 11px; color: #a8a29e; text-align: center; margin-top: 24px;">
          © ${new Date().getFullYear()} NestCare Inc. · Trusted Childcare Marketplace<br/>
          <a href="http://localhost:3000/settings" style="color: #a8a29e;">Manage notification preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${recipientName}, ${body} | Session Date: ${bookingDate} | ${ctaText}: ${ctaUrl}`;

  return { html, text };
}
