import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalCallListener } from "@/components/video-call/global-call-listener";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://nestcare.ca';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  applicationName: 'NestCare',
  title: {
    default: 'NestCare — Trusted Childcare & Babysitting Marketplace',
    template: '%s | NestCare',
  },
  description: 'Book background-checked, vetted childcare providers for in-home babysitting, after-school pickups, overnight care, and emergency childcare. Trusted by families across Canada.',
  keywords: [
    'childcare', 'babysitter', 'babysitting', 'trusted sitter', 'vetted caregiver',
    'in-home childcare', 'after school pickup', 'overnight care', 'emergency childcare',
    'nanny', 'childcare marketplace', 'background checked sitters',
  ],
  authors: [{ name: 'NestCare', url: BASE_URL }],
  creator: 'NestCare',
  publisher: 'NestCare',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: BASE_URL,
    siteName: 'NestCare',
    title: 'NestCare — Trusted Childcare & Babysitting Marketplace',
    description: 'Find background-checked, vetted babysitters and caregivers near you. Book in-home childcare, after-school pickups, overnight care, and more.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NestCare — Trusted Childcare Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NestCare — Trusted Childcare & Babysitting Marketplace',
    description: 'Find background-checked, vetted babysitters and caregivers near you.',
    images: ['/og-image.png'],
    creator: '@nestcare',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: 'childcare marketplace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'NestCare',
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/logo.png`,
          width: 200,
          height: 200,
        },
        description: 'Trusted childcare and babysitting marketplace connecting families with background-checked, vetted caregivers.',
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: 'NestCare',
        description: 'Book background-checked childcare providers for in-home babysitting, after-school pickups, and overnight care.',
        publisher: { '@id': `${BASE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg dark:bg-slate-950 text-stone-900 dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <GlobalCallListener />
          {children}
          <Toaster
            position="top-right"
            closeButton
            toastOptions={{
              classNames: {
                toast: "group toast bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-stone-200/60 dark:border-slate-800 text-stone-900 dark:text-slate-100 rounded-2xl shadow-xl p-4 flex gap-3 items-center !font-sans",
                title: "text-xs font-bold leading-normal",
                description: "text-[11px] text-stone-500 dark:text-slate-400 font-semibold leading-relaxed",
                actionButton: "bg-primary text-white text-xs font-bold rounded-xl px-3 py-1.5 hover:bg-emerald-800 transition-colors",
                cancelButton: "bg-stone-150 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-bold rounded-xl px-3 py-1.5 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors",
                closeButton: "hover:bg-stone-100 dark:hover:bg-slate-800 border-none transition-colors",
                success: "!border-l-4 !border-l-emerald-500 dark:!border-l-emerald-400",
                error: "!border-l-4 !border-l-rose-500 dark:!border-l-rose-400",
                info: "!border-l-4 !border-l-sky-500 dark:!border-l-sky-400",
                warning: "!border-l-4 !border-l-amber-500 dark:!border-l-amber-400",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
