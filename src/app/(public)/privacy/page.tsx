import { Shield, Lock, Eye, Database, Bell, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | NestCare',
  description: 'Learn how NestCare collects, uses, and protects your personal information on our childcare marketplace platform.',
};

const LAST_UPDATED = 'August 15, 2026';
const EFFECTIVE_DATE = 'August 15, 2026';

const sections = [
  {
    id: 'information-we-collect',
    icon: Database,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    title: 'Information We Collect',
    content: [
      {
        subtitle: 'Account Information',
        body: 'When you register on NestCare, we collect your name, email address, date of birth (to verify you are 18+), and your role (parent or sitter). This information is required to create and maintain your account.',
      },
      {
        subtitle: 'Profile Information',
        body: 'Sitters may optionally provide a biography, profile photo, cover image, care gallery photos, hourly rate, years of experience, spoken languages, and offered services. Parents may optionally add child profiles with names, ages, and care notes.',
      },
      {
        subtitle: 'Booking & Payment Data',
        body: 'We collect booking details including dates, times, duration, and notes associated with care requests. Payment processing is handled by third-party processors; we store only the booking record and status — never raw card details.',
      },
      {
        subtitle: 'Messages',
        body: 'We store messages exchanged between parents and sitters within the platform to facilitate communication and to help resolve disputes if they arise.',
      },
      {
        subtitle: 'Usage Data',
        body: 'We automatically collect information about how you interact with NestCare, including pages visited, features used, device type, browser, IP address, and timestamps.',
      },
    ],
  },
  {
    id: 'how-we-use',
    icon: Eye,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    title: 'How We Use Your Information',
    content: [
      {
        subtitle: 'Platform Operations',
        body: 'Your information enables core platform functionality: matching parents with sitters, processing bookings, sending confirmation and reminder notifications, and displaying sitter profiles to families searching for care.',
      },
      {
        subtitle: 'Safety & Trust',
        body: 'We use profile data, booking history, and reviews to maintain a safe and trusted community. This may include identity verification and background check coordination with authorized third-party providers.',
      },
      {
        subtitle: 'Communications',
        body: 'We send transactional emails (booking confirmations, messages, receipts) and, where you have opted in, marketing communications about new features and care tips. You can unsubscribe at any time in your settings.',
      },
      {
        subtitle: 'Improvements',
        body: 'Aggregate, anonymized usage data helps us understand how families and caregivers use NestCare so we can improve features, fix issues, and build a better product.',
      },
    ],
  },
  {
    id: 'data-sharing',
    icon: Users,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    title: 'How We Share Your Information',
    content: [
      {
        subtitle: 'Between Users',
        body: 'Sitter profile information (name, photo, bio, services, availability, rate, and gallery) is visible to any logged-in parent. Contact details and private messages are only shared between the direct parties to a conversation.',
      },
      {
        subtitle: 'Service Providers',
        body: 'We share necessary data with trusted third-party vendors who help us operate NestCare — including our database provider (Supabase), email delivery, payment processing, and analytics. These vendors are bound by data processing agreements.',
      },
      {
        subtitle: 'Legal Requirements',
        body: 'We may disclose your information where required by law, court order, or to protect the rights and safety of NestCare, our users, or the public.',
      },
      {
        subtitle: 'We Do Not Sell Your Data',
        body: 'NestCare does not sell, rent, or trade your personal information to third-party marketers or data brokers, ever.',
      },
    ],
  },
  {
    id: 'data-security',
    icon: Lock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    title: 'Data Security',
    content: [
      {
        subtitle: 'Encryption',
        body: 'All data transmitted to and from NestCare is encrypted in transit using TLS (HTTPS). Data at rest is encrypted within our database infrastructure provided by Supabase.',
      },
      {
        subtitle: 'Access Controls',
        body: 'We implement Row Level Security (RLS) on all database tables so that users can only access data they are authorized to view. Authentication tokens are stored securely and expire after a configurable period.',
      },
      {
        subtitle: 'Breach Notification',
        body: 'In the event of a data breach that affects your personal information, we will notify you by email within 72 hours of becoming aware of the incident, in compliance with applicable privacy laws.',
      },
    ],
  },
  {
    id: 'your-rights',
    icon: Shield,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    title: 'Your Rights & Choices',
    content: [
      {
        subtitle: 'Access & Correction',
        body: 'You can view and update most of your personal information at any time from your Profile and Settings pages.',
      },
      {
        subtitle: 'Account Deletion',
        body: 'You may request deletion of your account and associated data from the Settings page or by emailing privacy@nestcare.app. We will process deletion requests within 30 days, subject to legal retention obligations (e.g., completed booking records).',
      },
      {
        subtitle: 'Data Portability',
        body: 'You may request a machine-readable export of your personal data by emailing privacy@nestcare.app.',
      },
      {
        subtitle: 'Marketing Opt-Out',
        body: 'You can opt out of marketing communications at any time by adjusting your notification preferences in Settings or clicking the unsubscribe link in any marketing email.',
      },
    ],
  },
  {
    id: 'children-privacy',
    icon: Bell,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    title: 'Children\'s Privacy',
    content: [
      {
        subtitle: 'Account Holders Must Be Adults',
        body: 'NestCare accounts may only be created by individuals who are 18 years of age or older. We do not knowingly collect personal information from children under 13.',
      },
      {
        subtitle: 'Child Profiles',
        body: 'Parents may add child profiles (name, date of birth, care group, and care notes) to facilitate bookings. This information is only visible to the parent and the sitters they book — it is never publicly displayed.',
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/90 to-emerald-700 rounded-3xl p-7 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/20 rounded-2xl">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">Legal Document</span>
        </div>
        <h1 className="font-display text-2xl font-black mb-2">Privacy Policy</h1>
        <p className="text-sm text-emerald-100 leading-relaxed">
          At NestCare, your family's privacy is as important to us as the safety of your children.
          This policy explains exactly what data we collect, why we need it, and how we protect it.
        </p>
        <div className="flex gap-4 mt-5 pt-5 border-t border-white/20 text-[11px] font-semibold text-emerald-200">
          <span>Effective: {EFFECTIVE_DATE}</span>
          <span>·</span>
          <span>Last Updated: {LAST_UPDATED}</span>
        </div>
      </div>

      {/* Quick Nav */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
        <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Jump to Section</h2>
        <div className="space-y-1">
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <span className={`p-1.5 rounded-lg ${s.bg} ${s.border} border`}>
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                </span>
                <span className="text-xs font-semibold text-stone-700 group-hover:text-heading transition-colors">{s.title}</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-stone-500 transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Content Sections */}
      {sections.map((section) => (
        <div
          key={section.id}
          id={section.id}
          className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5 scroll-mt-20"
        >
          <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
            <span className={`p-2.5 rounded-2xl ${section.bg} border ${section.border}`}>
              <section.icon className={`h-5 w-5 ${section.color}`} />
            </span>
            <h2 className="font-display text-base font-black text-heading">{section.title}</h2>
          </div>
          <div className="space-y-4">
            {section.content.map((item, idx) => (
              <div key={idx} className={idx > 0 ? 'pt-4 border-t border-stone-50' : ''}>
                <h3 className="text-xs font-bold text-heading mb-1.5">{item.subtitle}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Contact & Links */}
      <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 space-y-4">
        <h2 className="font-display text-sm font-black text-heading">Questions or Concerns?</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          If you have any questions about this Privacy Policy or how we handle your data, please reach out to our Privacy Team.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:privacy@nestcare.app"
            className="flex-1 py-3 text-center bg-primary text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 active-press transition-colors"
          >
            privacy@nestcare.app
          </a>
          <Link
            href="/support"
            className="flex-1 py-3 text-center bg-white border border-stone-200 text-stone-700 rounded-2xl text-xs font-bold hover:bg-stone-50 active-press transition-colors"
          >
            Contact Support
          </Link>
        </div>
        <div className="flex gap-4 pt-2 border-t border-stone-200">
          <Link href="/terms" className="text-[11px] font-bold text-primary hover:underline">Terms of Service</Link>
          <Link href="/support" className="text-[11px] font-bold text-stone-500 hover:underline">Support Center</Link>
        </div>
      </div>
    </div>
  );
}
