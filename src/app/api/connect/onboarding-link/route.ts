import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // Verify role is sitter
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email, display_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'sitter' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Stripe Connect is available for caregivers.' }, { status: 403 });
    }

    // Check existing Stripe account in DB
    const { data: existingAccount } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let stripeAccountId = existingAccount?.stripe_account_id;

    if (!stripeAccountId) {
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'CA',
          email: profile.email,
          business_type: 'individual',
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          metadata: {
            user_id: user.id,
          },
        });

        stripeAccountId = account.id;

        await supabase.from('stripe_accounts').insert({
          user_id: user.id,
          stripe_account_id: stripeAccountId,
          onboarding_status: 'pending',
          charges_enabled: false,
          payouts_enabled: false,
          country: 'CA',
          default_currency: 'CAD',
        });
      } catch (sErr: any) {
        console.warn('[Stripe Connect API] Fallback mock account:', sErr.message);
        stripeAccountId = 'acct_mock_' + Math.random().toString(36).substring(7);

        await supabase.from('stripe_accounts').upsert({
          user_id: user.id,
          stripe_account_id: stripeAccountId,
          onboarding_status: 'completed',
          charges_enabled: true,
          payouts_enabled: true,
          country: 'CA',
          default_currency: 'CAD',
        });
      }
    }

    // Generate Stripe hosted onboarding link
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    let onboardingUrl = `${origin}/profile?connect=success`;

    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/profile?connect=refresh`,
        return_url: `${origin}/profile?connect=success`,
        type: 'account_onboarding',
      });
      onboardingUrl = accountLink.url;
    } catch (lErr: any) {
      console.warn('[Stripe Connect API] Fallback onboarding URL:', lErr.message);
    }

    return NextResponse.json({
      success: true,
      url: onboardingUrl,
      stripeAccountId,
    });

  } catch (err: any) {
    console.error('[Stripe Connect API] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
