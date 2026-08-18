import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { logAdminAction } from '@/lib/admin/audit-logger';

const getServiceSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(req: NextRequest) {
  try {
    const userSupabase = await createServerSupabase();
    const { data: { user }, error: authErr } = await userSupabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Administrator access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { parentFeePct, sitterCommPct, minFee, maxFee, taxPct } = body;

    if (parentFeePct === undefined || sitterCommPct === undefined) {
      return NextResponse.json({ error: 'Missing required fee parameters.' }, { status: 400 });
    }

    const serviceSupabase = getServiceSupabase();

    // 1. Deactivate existing pricing configs
    await serviceSupabase
      .from('pricing_config')
      .update({ is_active: false })
      .eq('is_active', true);

    // 2. Insert new active pricing config with service role
    const totalPlatformTake = Number(parentFeePct) + Number(sitterCommPct);

    const { data: newPricing, error: insertErr } = await serviceSupabase
      .from('pricing_config')
      .insert({
        parent_service_fee_pct: Number(parentFeePct),
        sitter_commission_pct: Number(sitterCommPct),
        platform_percentage: totalPlatformTake,
        min_platform_fee: Number(minFee || 2),
        max_platform_fee: Number(maxFee || 50),
        tax_percentage: Number(taxPct || 5),
        currency: 'USD',
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[Pricing Config Insert Error]:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 3. Log Audit Action
    await logAdminAction({
      adminId: user.id,
      action: 'updated_financial_rules',
      entityType: 'pricing_config',
      entityId: newPricing.id,
      details: `Admin updated financial rules (Parent Fee: ${parentFeePct}%, Sitter Cut: ${sitterCommPct}%, Tax: ${taxPct}%)`,
      metadata: { parentFeePct, sitterCommPct, minFee, maxFee, taxPct, totalPlatformTake },
    });

    return NextResponse.json({ success: true, pricing: newPricing });

  } catch (err: any) {
    console.error('[Pricing API Exception]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
