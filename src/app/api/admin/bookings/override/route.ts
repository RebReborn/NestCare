import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Administrator access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { bookingId, extensionId, action, reason } = body;
    // action: 'waive_late_charge' | 'refund_extension' | 'resolve_dispute'

    if (!bookingId || !action || !reason) {
      return NextResponse.json({ error: 'Missing required parameters. Required bookingId, action, and explicit reason.' }, { status: 400 });
    }

    // 1. Fetch current booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    let previousValue: any = {};
    let newValue: any = {};

    if (action === 'waive_late_charge') {
      previousValue = { late_pickup_minutes: booking.late_pickup_minutes, late_pickup_status: booking.late_pickup_status };
      newValue = { late_pickup_minutes: 0, late_pickup_status: 'resolved' };

      await supabase
        .from('bookings')
        .update({ late_pickup_minutes: 0, late_pickup_status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (extensionId) {
        await supabase
          .from('booking_extensions')
          .update({ status: 'cancelled', payment_status: 'refunded', updated_at: new Date().toISOString() })
          .eq('id', extensionId);
      }
    } else if (action === 'refund_extension' && extensionId) {
      const { data: ext } = await supabase.from('booking_extensions').select('*').eq('id', extensionId).single();
      previousValue = { extension: ext };
      newValue = { status: 'cancelled', payment_status: 'refunded' };

      await supabase
        .from('booking_extensions')
        .update({ status: 'cancelled', payment_status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', extensionId);
    } else if (action === 'resolve_dispute') {
      previousValue = { status: booking.status };
      newValue = { status: 'completed' };

      await supabase
        .from('bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', bookingId);
    }

    // 2. Insert mandatory Admin Audit Log entry
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      target_type: 'booking',
      target_id: bookingId,
      action,
      reason,
      previous_value: previousValue,
      new_value: newValue,
    });

    await logAdminAction({
      adminId: user.id,
      action: `admin_override_${action}`,
      entityType: 'booking',
      entityId: bookingId,
      details: `Administrator override (${action.replace(/_/g, ' ')}). Reason: "${reason}".`,
      metadata: { action, reason, previousValue, newValue },
    });

    // 3. Log timeline event
    await supabase.from('booking_timeline_events').insert({
      booking_id: bookingId,
      event_type: `admin_${action}`,
      description: `Administrator override: ${action.replace(/_/g, ' ')}. Reason: "${reason}".`,
      actor_id: user.id,
      metadata: { action, reason },
    });

    return NextResponse.json({ success: true, action, reason });

  } catch (err: any) {
    console.error('[Admin Override Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
