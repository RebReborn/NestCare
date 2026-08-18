import { FileText, AlertTriangle, CreditCard, Star, Ban, Scale, RefreshCw, ChevronRight, Clock, ShieldCheck, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | NestCare',
  description: 'Read the Terms of Service for NestCare — the trusted childcare marketplace connecting families with vetted, local caregivers.',
};

const LAST_UPDATED = 'August 18, 2026';
const EFFECTIVE_DATE = 'August 18, 2026';

const sections = [
  {
    id: 'acceptance',
    icon: FileText,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    title: '1. Acceptance of Terms',
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
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-100 dark:border-amber-900/50',
    title: '2. Account Responsibilities',
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
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-100 dark:border-violet-900/50',
    title: '3. Caregiver (Sitter) Obligations',
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
    icon: ShieldCheck,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-100 dark:border-sky-900/50',
    title: '4. Parent Obligations',
    items: [
      'Parents represent that all information provided about their children is accurate, including ages, medical conditions, allergies, and behavioral needs relevant to their care.',
      'Parents are responsible for ensuring the sitter has all information necessary to provide safe care prior to the start of a booking.',
      'Parents agree to treat sitters with respect and not engage in harassment, discrimination, or abusive behavior.',
      'Parents are responsible for payment of all confirmed bookings, additional extended minutes, and late pickup charges.',
      'Parents must cancel bookings within the cancellation window specified in their booking agreement to avoid cancellation fees.',
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-100 dark:border-rose-900/50',
    title: '5. Platform Fees, Commission Cuts, Taxes & Payment Terms',
    items: [
      'Booking Payment Processing: All booking fees are processed securely through our PCI-DSS compliant Stripe payment integration at the time of booking confirmation.',
      'Platform Service Fees & Commission Cuts: NestCare charges a Platform Service Fee on each booking transaction (calculated as a platform percentage, subject to dynamic fee schedules) to maintain 24/7 support, platform infrastructure, and Trust & Safety verification. Caregiver (Sitter) earnings reflect the gross booking value minus applicable platform service commissions as detailed in the Sitter Agreement.',
      'Applicable Sales Taxes (GST/HST): Local, provincial, and federal sales taxes — including Canadian GST/HST or local state sales taxes — are calculated at checkout based on the location of care services provided and itemized on transaction receipts.',
      'Booking Extensions: Parents may request 15, 30, or 60-minute booking extensions during active care sessions. Upon sitter approval, extended minutes are billed automatically at the effective hourly rate snapshot.',
      'Late Pickups & Grace Period: A 10-minute grace period applies following scheduled care completion. If pickup is delayed past the grace period without an approved extension, late care charges apply at $0.50 per minute billed to the primary payment method.',
      'Cancellation & Refund Policy: Cancellations submitted more than 24 hours prior to booking start time receive a 100% refund. Cancellations made less than 24 hours prior to start time are subject to a 50% cancellation fee to compensate the caregiver for reserved availability.',
      'Sitter-Initiated Cancellations: If a sitter cancels a confirmed booking at any time, the parent receives an immediate 100% full refund.',
    ],
  },
  {
    id: 'messaging-rules',
    icon: MessageSquare,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-100 dark:border-teal-900/50',
    title: '6. Messaging, Carefeed & Anti-Abuse',
    items: [
      'Conversations are tied directly to confirmed bookings. Messages remain available for support and dispute record purposes.',
      'Off-Platform Payment Rules: Soliciting or attempting off-platform cash/Zelle/Venmo payments is strictly prohibited. Automated content detection flags suspicious payment requests for administrative review.',
      'Abuse & Moderation: Users may report inappropriate messages or safety concerns directly within chat. Reported conversations are reviewed by NestCare Trust & Safety administrators.',
      'Blocking: Blocking a user restricts future communication and prevents booking requests between the two accounts.',
    ],
  },
  {
    id: 'prohibited-conduct',
    icon: Ban,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-100 dark:border-red-900/50',
    title: '7. Prohibited Conduct',
    items: [
      'You may not use NestCare for any unlawful purpose or in a way that violates these Terms.',
      'You may not attempt to circumvent NestCare\'s payment system by arranging off-platform payments with users you met through NestCare.',
      'You may not post false, misleading, or fraudulent information in your profile or reviews.',
      'You may not harass, threaten, or abuse other users on the platform.',
      'You may not use automated bots or scraping tools to access NestCare without our written permission.',
      'Violation of these rules may result in immediate account suspension or termination without refund.',
    ],
  },
  {
    id: 'liability',
    icon: Scale,
    color: 'text-stone-600 dark:text-slate-400',
    bg: 'bg-stone-100 dark:bg-slate-800',
    border: 'border-stone-200 dark:border-slate-700',
    title: '8. Limitation of Liability',
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
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-100 dark:border-indigo-900/50',
    title: '9. Termination',
    items: [
      'You may delete your account at any time from the Settings page. Account deletion removes your profile from the marketplace but booking records may be retained for legal compliance.',
      'NestCare reserves the right to suspend or terminate any account that violates these Terms, with or without prior notice.',
      'Upon termination, all licenses granted to you under these Terms immediately terminate.',
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-900 rounded-3xl p-7 text-white shadow-xl border border-stone-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">Legal Policy</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black mb-2">Terms of Service</h1>
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
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
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-2xl border border-amber-200 dark:border-amber-800 shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </span>
          <div>
            <h2 className="text-xs font-black text-amber-900 dark:text-amber-200 mb-1.5">Key Terms Summary</h2>
            <ul className="text-[11px] text-amber-800 dark:text-amber-300 space-y-1 leading-relaxed list-disc list-inside font-medium">
              <li>You must be 18+ to create an account on NestCare</li>
              <li>Sitters are independent contractors, not NestCare employees</li>
              <li>10-minute grace period applies after care session ends; late pickups incur $0.50/min charge</li>
              <li>Booking extensions require sitter approval via chat</li>
              <li>Off-platform payments (Zelle, Venmo, Cash) are strictly prohibited</li>
              <li>Cancellations within 24 hours may incur a fee up to 50%</li>
            </ul>
          </div>
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

      {/* Sections List */}
      <div className="space-y-6">
        {sections.map((s) => (
          <div
            key={s.id}
            id={s.id}
            className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 scroll-mt-20"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${s.bg} ${s.border} border`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <h2 className="font-display text-base font-black text-heading dark:text-white">{s.title}</h2>
            </div>

            <ul className="space-y-2.5 text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
              {s.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer Navigation Link */}
      <div className="p-6 bg-stone-100 dark:bg-slate-800/80 rounded-3xl border border-stone-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-xs text-heading dark:text-white">Have questions about our terms?</h3>
          <p className="text-[11px] text-stone-500 dark:text-slate-400">Reach out to our support team for legal or policy inquiries.</p>
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
