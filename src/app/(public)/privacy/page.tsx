import { Shield, Lock, Eye, Database, Bell, Users, ChevronRight, Activity, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | NestCare',
  description: 'Learn how NestCare collects, uses, and protects your personal information on our childcare marketplace platform.',
};

const LAST_UPDATED = 'August 18, 2026';
const EFFECTIVE_DATE = 'August 18, 2026';

const sections = [
  {
    id: 'information-we-collect',
    icon: Database,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-100 dark:border-blue-900/50',
    title: '1. Information We Collect',
    content: [
      {
        subtitle: 'Account Information',
        body: 'When you register on NestCare, we collect your name, email address, phone number, date of birth (to verify 18+ requirement), and role (parent or sitter). This data is essential for account management.',
      },
      {
        subtitle: 'Profile & Child Information',
        body: 'Sitters provide bios, profile photos, hourly rates, experience, and certifications. Parents may optionally record registered child profiles (names, dates of birth, allergies, medical notes, emergency contacts, authorized pickup persons).',
      },
      {
        subtitle: 'Care Activity & Carefeed Logs',
        body: 'During active care sessions, sitters log care updates (naps, meals, activities, photos). Carefeed updates are visible exclusively to the parent linked to that specific booking.',
      },
      {
        subtitle: 'Booking, Payment, Fees & Tax Financial Data',
        body: 'We collect booking session logs (scheduled hours, extensions, late pickup minutes, platform fees, sitter payout commission cuts, and GST/HST tax calculations). Payment card tokenization and payout bank account transfers are managed directly by Stripe (PCI-DSS Level 1 certified). NestCare retains transaction logs, itemized receipts, and tax records strictly for financial compliance, reporting, and dispute resolution — we never store raw credit card numbers or banking passwords on our servers.',
      },
      {
        subtitle: 'Messages & Real-time Presence Data',
        body: 'We store messages exchanged between parents and sitters within booking conversations. Transient presence data (online status, typing indicators) is transmitted over secure WebSockets and is never stored permanently in database logs.',
      },
    ],
  },
  {
    id: 'how-we-use',
    icon: Eye,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    title: '2. How We Use Your Information',
    content: [
      {
        subtitle: 'Platform Operations & Matching',
        body: 'Your information enables core platform services: connecting parents with sitters, processing bookings, delivering real-time care updates, and facilitating booking extensions.',
      },
      {
        subtitle: 'Safety & Verification',
        body: 'We use profile data, identity verification records, and background checks to maintain a trusted community. We process report submissions to investigate policy violations.',
      },
      {
        subtitle: 'Transactional Notifications',
        body: 'We send transactional alerts (booking confirmations, message digests, ETA updates, late pickup notices). You can configure your email and SMS notification preferences in Settings.',
      },
    ],
  },
  {
    id: 'data-sharing',
    icon: Users,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-100 dark:border-violet-900/50',
    title: '3. How We Share Your Information',
    content: [
      {
        subtitle: 'Between Parents & Sitters',
        body: 'Sitter profile information (name, avatar, bio, services, rate) is visible to searching parents. Child details, care notes, and messages are shared ONLY between confirmed parties to a booking.',
      },
      {
        subtitle: 'Service Providers',
        body: 'We share data with infrastructure partners essential for operating NestCare — including Supabase (cloud database), Stripe (payments), and email service providers. All partners adhere to strict data processing agreements.',
      },
      {
        subtitle: 'Zero Data Selling',
        body: 'NestCare does not sell, rent, or trade your personal information or child profile data to third-party data brokers or advertisers. Ever.',
      },
    ],
  },
  {
    id: 'data-security',
    icon: Lock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-100 dark:border-amber-900/50',
    title: '4. Data Security & Row-Level Authorization',
    content: [
      {
        subtitle: 'Database Encryption & RLS',
        body: 'All database queries strictly enforce Row Level Security (RLS). Users can only access booking records, messages, and child profiles where they are explicitly authorized as parent, sitter, or platform administrator.',
      },
      {
        subtitle: 'Encryption in Transit & at Rest',
        body: 'All platform traffic is encrypted using TLS 1.3 in transit. Sensitive stored data is encrypted at rest using industry-standard AES-256 encryption.',
      },
    ],
  },
  {
    id: 'your-rights',
    icon: Shield,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-100 dark:border-rose-900/50',
    title: '5. Your Privacy Rights & Data Control',
    content: [
      {
        subtitle: 'Access & Portability',
        body: 'You may request a complete export of your personal data, booking history, and carefeed logs by contacting privacy@nestcare.app.',
      },
      {
        subtitle: 'Account Deletion & Data Erasure',
        body: 'You can deactivate or delete your account at any time in Settings. Upon deletion request, personal profile data is purged within 30 days, subject to legal auditing obligations.',
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-7 text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300">Privacy & Trust</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black mb-2">Privacy Policy</h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          At NestCare, we treat the privacy and safety of families and caregivers with the highest priority.
          This policy explains what information we collect, how it is protected, and your control over your data.
        </p>
        <div className="flex gap-4 mt-5 pt-5 border-t border-white/10 text-[11px] font-semibold text-slate-400">
          <span>Effective: {EFFECTIVE_DATE}</span>
          <span>·</span>
          <span>Last Updated: {LAST_UPDATED}</span>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Table of Contents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors group border border-transparent hover:border-stone-200 dark:hover:border-slate-700"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`p-1.5 rounded-xl ${s.bg} ${s.border} border shrink-0`}>
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                </span>
                <span className="text-xs font-bold text-stone-700 dark:text-slate-200 group-hover:text-primary transition-colors truncate">
                  {s.title}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Policy Sections */}
      <div className="space-y-6">
        {sections.map((s) => (
          <div
            key={s.id}
            id={s.id}
            className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 scroll-mt-20"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${s.bg} ${s.border} border`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <h2 className="font-display text-base font-black text-heading dark:text-white">{s.title}</h2>
            </div>

            <div className="space-y-4">
              {s.content.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <h3 className="text-xs font-bold text-heading dark:text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {item.subtitle}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed pl-3.5">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Support Navigation */}
      <div className="p-6 bg-stone-100 dark:bg-slate-800/80 rounded-3xl border border-stone-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-xs text-heading dark:text-white">Questions about data privacy?</h3>
          <p className="text-[11px] text-stone-500 dark:text-slate-400">Email our Data Protection Officer at privacy@nestcare.app.</p>
        </div>
        <Link
          href="/support"
          className="px-5 py-2.5 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 active-press transition-all shrink-0 shadow-xs"
        >
          Contact Support Center
        </Link>
      </div>
    </div>
  );
}
