import { FileText, AlertTriangle, CreditCard, Star, Ban, Scale, RefreshCw, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | NestCare',
  description: 'Read the Terms of Service for NestCare — the trusted childcare marketplace connecting families with vetted, local caregivers.',
};

const LAST_UPDATED = 'August 15, 2026';
const EFFECTIVE_DATE = 'August 15, 2026';

const sections = [
  {
    id: 'acceptance',
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    title: 'Acceptance of Terms',
    items: [
      'By creating a NestCare account or using any part of our platform, you agree to be bound by these Terms of Service and our Privacy Policy.',
      'If you do not agree with any part of these terms, you must not use NestCare.',
      'You must be at least 18 years old to create an account. By registering, you confirm that you meet this age requirement.',
      'We may update these Terms from time to time. Continued use of NestCare after changes are posted constitutes your acceptance of the updated Terms.',
    ],
  },
  {
    id: 'account-responsibilities',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    title: 'Account Responsibilities',
    items: [
      'You are responsible for maintaining the confidentiality of your account credentials. Do not share your password with anyone.',
      'You must provide accurate, current, and complete information during registration and keep your profile up to date.',
      'You are responsible for all activity that occurs under your account.',
      'If you suspect unauthorized access to your account, you must notify us immediately at security@nestcare.app.',
      'One person may not maintain multiple accounts. Duplicate accounts will be suspended.',
    ],
  },
  {
    id: 'sitter-obligations',
    icon: Star,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    title: 'Caregiver (Sitter) Obligations',
    items: [
      'Sitters represent that all information in their profile — including experience, qualifications, certifications, and availability — is truthful and accurate.',
      'Sitters agree to fulfill accepted bookings as confirmed. Repeated cancellations may result in account suspension.',
      'Sitters are independent contractors, not employees of NestCare. NestCare is a marketplace platform only.',
      'Sitters must not engage in any care activities that could endanger the health, safety, or wellbeing of children in their care.',
      'Sitters consent to background check verification processes initiated through NestCare\'s verification partners.',
      'Sitters must comply with all applicable local, provincial, and federal laws regarding child care and labor.',
    ],
  },
  {
    id: 'parent-obligations',
    icon: FileText,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    title: 'Parent Obligations',
    items: [
      'Parents represent that all information provided about their children is accurate, including ages, medical conditions, allergies, and behavioral needs relevant to their care.',
      'Parents are responsible for ensuring the sitter has all information necessary to provide safe care prior to the start of a booking.',
      'Parents agree to treat sitters with respect and not engage in harassment, discrimination, or abusive behavior.',
      'Parents are responsible for payment of all confirmed bookings per the agreed hourly rate.',
      'Parents must cancel bookings within the cancellation window specified in their booking agreement to avoid cancellation fees.',
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    title: 'Payments & Cancellations',
    items: [
      'Booking payments are processed at the time of booking confirmation through our secure payment processor.',
      'NestCare charges a platform service fee on each transaction to maintain and improve the platform.',
      'Cancellations made more than 24 hours before the booking start time are eligible for a full refund.',
      'Cancellations made less than 24 hours before the booking start time may be subject to a cancellation fee of up to 50% of the booking value.',
      'No-shows (parent fails to be present or provide access) are non-refundable.',
      'Sitter-initiated cancellations after confirmation will result in a full refund to the parent.',
      'Disputes regarding payments must be raised within 7 days of the booking completion via our Support Center.',
    ],
  },
  {
    id: 'prohibited-conduct',
    icon: Ban,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    title: 'Prohibited Conduct',
    items: [
      'You may not use NestCare for any unlawful purpose or in a way that violates these Terms.',
      'You may not attempt to circumvent NestCare\'s payment system by arranging off-platform payments with users you met through NestCare.',
      'You may not post false, misleading, or fraudulent information in your profile or reviews.',
      'You may not harass, threaten, or abuse other users on the platform.',
      'You may not use automated bots or scraping tools to access NestCare without our written permission.',
      'You may not impersonate another person or misrepresent your identity or qualifications.',
      'Violation of these rules may result in immediate account suspension or termination without refund.',
    ],
  },
  {
    id: 'liability',
    icon: Scale,
    color: 'text-stone-600',
    bg: 'bg-stone-100',
    border: 'border-stone-200',
    title: 'Limitation of Liability',
    items: [
      'NestCare is a marketplace platform that connects families with caregivers. We are not a childcare agency and do not directly employ sitters.',
      'NestCare does not guarantee the quality, safety, or suitability of any sitter listed on the platform. Parents are responsible for conducting their own due diligence.',
      'To the maximum extent permitted by law, NestCare\'s liability for any claim arising out of your use of the platform is limited to the amount you paid to NestCare in the 3 months preceding the claim.',
      'NestCare is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.',
    ],
  },
  {
    id: 'termination',
    icon: RefreshCw,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    title: 'Termination',
    items: [
      'You may delete your account at any time from the Settings page. Account deletion removes your profile from the marketplace but booking records may be retained for legal compliance.',
      'NestCare reserves the right to suspend or terminate any account that violates these Terms, with or without prior notice.',
      'Upon termination, all licenses granted to you under these Terms immediately terminate.',
      'Sections of these Terms that by their nature should survive termination (including Limitation of Liability and Governing Law) will remain in effect.',
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-3xl p-7 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/10 rounded-2xl">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-stone-300">Legal Document</span>
        </div>
        <h1 className="font-display text-2xl font-black mb-2">Terms of Service</h1>
        <p className="text-sm text-stone-300 leading-relaxed">
          These terms govern your use of the NestCare platform. Please read them carefully before using our services.
          They outline the rights and responsibilities of all participants in our childcare community.
        </p>
        <div className="flex gap-4 mt-5 pt-5 border-t border-white/10 text-[11px] font-semibold text-stone-400">
          <span>Effective: {EFFECTIVE_DATE}</span>
          <span>·</span>
          <span>Last Updated: {LAST_UPDATED}</span>
        </div>
      </div>

      {/* Key Points Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <span className="p-2 bg-amber-100 rounded-xl border border-amber-200 shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </span>
          <div>
            <h2 className="text-xs font-black text-amber-900 mb-1.5">Key Points Summary</h2>
            <ul className="text-[11px] text-amber-800 space-y-1 leading-relaxed list-disc list-inside">
              <li>You must be 18+ to use NestCare</li>
              <li>Sitters are independent contractors, not NestCare employees</li>
              <li>Cancellations within 24 hours may incur a fee</li>
              <li>Off-platform payments are strictly prohibited</li>
              <li>NestCare is a marketplace — vet sitters carefully</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Nav */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
        <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Jump to Section</h2>
        <div className="space-y-1">
          {sections.map((s) => (
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
      {sections.map((section, sIdx) => (
        <div
          key={section.id}
          id={section.id}
          className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4 scroll-mt-20"
        >
          <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
            <span className={`p-2.5 rounded-2xl ${section.bg} border ${section.border}`}>
              <section.icon className={`h-5 w-5 ${section.color}`} />
            </span>
            <h2 className="font-display text-base font-black text-heading">{section.title}</h2>
          </div>
          <ul className="space-y-3">
            {section.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-500 leading-relaxed">
                <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${section.bg.replace('bg-', 'bg-')} border ${section.border}`}
                  style={{ backgroundColor: 'currentColor' }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Governing Law */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
        <h2 className="font-display text-base font-black text-heading mb-3">Governing Law</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          These Terms are governed by the laws of the Province of Alberta, Canada, without regard to conflict of law principles.
          Any disputes arising from these Terms or your use of NestCare shall be resolved through binding arbitration
          in Edmonton, Alberta, or through the courts of Alberta if arbitration is not applicable.
        </p>
      </div>

      {/* Contact & Links */}
      <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 space-y-4">
        <h2 className="font-display text-sm font-black text-heading">Questions About These Terms?</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          If you have questions about our Terms of Service or need clarification on any provision, our team is here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:legal@nestcare.app"
            className="flex-1 py-3 text-center bg-stone-800 text-white rounded-2xl text-xs font-bold hover:bg-stone-900 active-press transition-colors"
          >
            legal@nestcare.app
          </a>
          <Link
            href="/support"
            className="flex-1 py-3 text-center bg-white border border-stone-200 text-stone-700 rounded-2xl text-xs font-bold hover:bg-stone-50 active-press transition-colors"
          >
            Contact Support
          </Link>
        </div>
        <div className="flex gap-4 pt-2 border-t border-stone-200">
          <Link href="/privacy" className="text-[11px] font-bold text-primary hover:underline">Privacy Policy</Link>
          <Link href="/support" className="text-[11px] font-bold text-stone-500 hover:underline">Support Center</Link>
        </div>
      </div>
    </div>
  );
}
