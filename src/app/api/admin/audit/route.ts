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
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, entityType, entityId, details, reason, result, severity, requestId, sessionId, metadata } = body;

    if (!action || !details) {
      return NextResponse.json({ error: 'Missing action or details' }, { status: 400 });
    }

    // Require reason for critical financial changes
    if (action === 'updated_financial_rules' && !reason?.trim()) {
      return NextResponse.json({ error: 'A valid reason is required for financial rule changes.' }, { status: 400 });
    }

    // Require reason for inspecting chat transcripts
    if (action === 'inspected_chat_transcript' && !reason?.trim()) {
      return NextResponse.json({ error: 'A valid compliance reason is required to inspect private chat transcripts.' }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'client_web';
    const userAgent = req.headers.get('user-agent') || 'NestCare Admin Console';

    const success = await logAdminAction({
      adminId: user.id,
      actorRole: profile?.role || 'admin',
      action,
      entityType: entityType || 'admin_action',
      entityId: entityId || null,
      details,
      reason: reason || undefined,
      result: result || 'success',
      severity: severity || undefined,
      requestId: requestId || req.headers.get('x-request-id') || undefined,
      sessionId: sessionId || undefined,
      metadata: metadata || {},
      ipAddress: clientIp,
      userAgent,
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to write audit log' }, { status: 500 });
    }

    return NextResponse.json({ success: true, action, details });
  } catch (err: any) {
    console.error('[Admin Audit API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
