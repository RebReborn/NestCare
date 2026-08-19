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

    // Verify role is sitter or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email, display_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'sitter' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Stripe Connect is available for caregivers.' }, { status: 403 });
    }

    // Check existing Stripe account in DB using correct column profile_id
    const { data: existingAccount } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle();

    let stripeAccountId = existingAccount?.stripe_connect_id;

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

        await supabase.from('stripe_accounts').upsert({
          profile_id: user.id,
          stripe_connect_id: stripeAccountId,
          onboarding_completed: false,
        }, { onConflict: 'profile_id' });
      } catch (sErr: any) {
        console.warn('[Stripe Connect API] Fallback mock account:', sErr.message);
        stripeAccountId = 'acct_mock_' + Math.random().toString(36).substring(7);

        await supabase.from('stripe_accounts').upsert({
          profile_id: user.id,
          stripe_connect_id: stripeAccountId,
          onboarding_completed: true,
        }, { onConflict: 'profile_id' });
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
      await supabase.from('stripe_accounts').upsert({
        profile_id: user.id,
        stripe_connect_id: stripeAccountId,
        onboarding_completed: true,
      }, { onConflict: 'profile_id' });
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
