// Server component wrapper — exports generateMetadata for SEO,
// then renders the actual client-side sitter profile component.
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import SitterProfileClient from './client';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://nestcare.ca';

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [{ data: profile }, { data: sitterProfile }] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, bio, avatar_url')
        .eq('id', id)
        .eq('role', 'sitter')
        .single(),
      supabase
        .from('sitter_profiles')
        .select('headline, city, province, base_hourly_rate_cents')
        .eq('id', id)
        .single(),
    ]);

    if (!profile) {
      return {
        title: 'Caregiver Not Found',
        robots: { index: false, follow: false },
      };
    }

    const name = profile.display_name || 'Trusted Caregiver';
    const city = sitterProfile?.city || 'Your Area';
    const province = sitterProfile?.province || '';
    const headline = sitterProfile?.headline || `Professional Childcare Provider in ${city}`;
    const rate = sitterProfile?.base_hourly_rate_cents
      ? `From $${Math.round(Number(sitterProfile.base_hourly_rate_cents) / 100)}/hr`
      : '';
    const bioSnippet = profile.bio ? profile.bio.slice(0, 120) + '...' : '';

    const title = `${name} — Childcare Provider in ${city}${province ? ', ' + province : ''}`;
    const description = `${headline}. ${rate ? rate + '. ' : ''}${bioSnippet || 'Background-checked and vetted by NestCare.'}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/sitter/${id}`,
        type: 'profile',
        siteName: 'NestCare',
        images: profile.avatar_url
          ? [{ url: profile.avatar_url, width: 400, height: 400, alt: name }]
          : [{ url: '/og-image.png', width: 1200, height: 630, alt: 'NestCare Caregiver' }],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: profile.avatar_url ? [profile.avatar_url] : ['/og-image.png'],
      },
      alternates: {
        canonical: `${BASE_URL}/sitter/${id}`,
      },
    };
  } catch {
    return {
      title: 'Caregiver Profile',
      description: 'View this verified childcare provider on NestCare.',
    };
  }
}

export default function SitterProfilePage() {
  return <SitterProfileClient />;
}
