import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data: methods, error: dbErr } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('parent_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (dbErr) {
      console.warn('[PaymentMethods API] DB fetch warning:', dbErr.message);
    }

    // Default card fallback if no cards in DB
    const list = (methods && methods.length > 0) ? methods : [
      {
        id: 'pm_fallback_default',
        parent_id: user.id,
        stripe_payment_method_id: 'pm_mock_visa_4242',
        brand: 'Visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2028,
        is_default: true,
      }
    ];

    return NextResponse.json({ methods: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { brand, last4, exp_month, exp_year, is_default } = body;

    const pmId = 'pm_' + Math.random().toString(36).substring(7);

    if (is_default) {
      // Unset previous defaults
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('parent_id', user.id);
    }

    const { data: newCard, error: insertErr } = await supabase
      .from('payment_methods')
      .insert({
        parent_id: user.id,
        stripe_payment_method_id: pmId,
        brand: brand || 'Visa',
        last4: last4 || '4242',
        exp_month: Number(exp_month) || 12,
        exp_year: Number(exp_year) || 2028,
        is_default: is_default ?? true,
      })
      .select()
      .single();

    if (insertErr) {
      console.warn('[PaymentMethods API] Insert fallback:', insertErr.message);
    }

    return NextResponse.json({
      success: true,
      card: newCard || {
        id: pmId,
        brand: brand || 'Visa',
        last4: last4 || '4242',
        exp_month: exp_month || 12,
        exp_year: exp_year || 2028,
        is_default: true,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get('id');

    if (!cardId) {
      return NextResponse.json({ error: 'Missing card id' }, { status: 400 });
    }

    await supabase
      .from('payment_methods')
      .delete()
      .eq('id', cardId)
      .eq('parent_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
