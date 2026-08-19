import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const BASE_URL = 'https://nestcare.ca'; // TODO: Update to your production domain

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/login',
          '/register',
          '/terms',
          '/privacy',
          '/support',
          '/sitter/',
        ],
        disallow: [
          '/dashboard/',
          '/profile/',
          '/bookings/',
          '/messages/',
          '/search/',
          '/availability/',
          '/notifications/',
          '/transactions/',
          '/settings/',
          '/admin/',
          '/onboarding/',
          '/api/',
          '/_next/',
        ],
      },
      {
        // Block AI training bots
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'Google-Extended',
          'PerplexityBot',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
