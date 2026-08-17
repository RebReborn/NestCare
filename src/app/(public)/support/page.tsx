'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy, MessageCircle, Mail, ChevronDown, ChevronRight,
  BookOpen, CreditCard, User, Calendar, Shield, Search, Send, Loader2, CheckCircle2
} from 'lucide-react';

const FAQ_CATEGORIES = [
  {
    id: 'bookings',
    icon: Calendar,
    label: 'Bookings',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    questions: [
      {
        q: 'How do I book a sitter?',
        a: 'Go to the Search page, find a sitter you like, and tap "Book Sitter" on their profile. Select your desired dates and times, add any notes for the sitter, and confirm. You\'ll receive a notification once the sitter accepts.',
      },
      {
        q: 'Can I cancel a booking?',
        a: 'Yes. Go to your Bookings page, find the booking, and tap "Cancel Booking." If you cancel more than 24 hours before the start time, you\'ll receive a full refund. Cancellations within 24 hours may incur a fee — see our Terms for details.',
      },
      {
        q: 'What happens if a sitter cancels?',
        a: 'If a sitter cancels a confirmed booking, you will receive a full refund automatically. We\'ll also send you a notification so you can search for an alternative sitter. Repeated sitter cancellations are reviewed by our trust & safety team.',
      },
      {
        q: 'Can I book the same sitter regularly?',
        a: 'Absolutely! Once you find a sitter you love, you can book them as often as you like. You can also favorite them from their profile so they\'re easy to find. We\'re working on recurring booking subscriptions — stay tuned!',
      },
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    label: 'Payments',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    questions: [
      {
        q: 'How does payment work?',
        a: 'Payment is processed securely at the time of booking confirmation. NestCare collects payment on behalf of the sitter and transfers earnings after the booking is completed. We never store your raw card details.',
      },
      {
        q: 'What fees does NestCare charge?',
        a: 'NestCare charges a small service fee on each transaction to maintain and improve the platform. This fee is displayed clearly before you confirm any booking so there are no surprises.',
      },
      {
        q: 'How do sitters get paid?',
        a: 'Sitter earnings are released after each booking is marked complete. Payouts are sent to the sitter\'s linked bank account or payment method within 2-3 business days.',
      },
      {
        q: 'I was charged incorrectly — what do I do?',
        a: 'Please contact our Support team within 7 days of the booking completion. You can use the contact form on this page or email billing@nestcare.app with your booking details. We investigate all billing disputes promptly.',
      },
    ],
  },
  {
    id: 'accounts',
    icon: User,
    label: 'Accounts & Profiles',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    questions: [
      {
        q: 'How do I update my profile?',
        a: 'Go to the Profile page from the bottom navigation. You can update your name, bio, avatar photo, and for sitters — your hourly rate, services, gallery photos, and availability. All changes are saved and reflected publicly immediately.',
      },
      {
        q: 'How do I add my children\'s information?',
        a: 'As a parent, go to Settings and scroll to the "Registered Children" section. You can add your children\'s names, dates of birth, care group, and any allergies or special notes for sitters.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to Settings and scroll to the bottom. You\'ll find a "Deactivate Account" option. You can also email privacy@nestcare.app to request permanent account deletion. We process deletion requests within 30 days.',
      },
      {
        q: 'I forgot my password — how do I reset it?',
        a: 'On the Login page, tap "Forgot password?" and enter your email. We\'ll send you a secure reset link. The link expires after 1 hour for security.',
      },
    ],
  },
  {
    id: 'safety',
    icon: Shield,
    label: 'Safety & Trust',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    questions: [
      {
        q: 'Are sitters background checked?',
        a: 'NestCare offers background check verification through our trusted third-party provider. Sitters who have completed a background check display a "Background Checked" badge on their profile. We strongly recommend choosing verified sitters.',
      },
      {
        q: 'How do I report a sitter or a safety concern?',
        a: 'Safety is our top priority. If you have a concern about a sitter\'s conduct or a safety issue, please contact our Trust & Safety team immediately at safety@nestcare.app or use the contact form below. Urgent safety matters should be reported to local emergency services first.',
      },
      {
        q: 'Can I leave a review for my sitter?',
        a: 'Yes! After a booking is completed, you\'ll receive a prompt to leave a rating and review. Reviews help other families make informed decisions and help great sitters grow their business.',
      },
      {
        q: 'What if a sitter\'s profile information seems inaccurate?',
        a: 'You can report a profile concern using the contact form below. Include the sitter\'s name and what information appears to be inaccurate. Our Trust & Safety team will review and follow up within 48 hours.',
      },
    ],
  },
];

const QUICK_LINKS = [
  { label: 'Privacy Policy', href: '/privacy', icon: Shield },
  { label: 'Terms of Service', href: '/terms', icon: BookOpen },
  { label: 'Search for Sitters', href: '/search', icon: Search },
  { label: 'My Bookings', href: '/bookings', icon: Calendar },
];

type FormState = 'idle' | 'sending' | 'sent' | 'error';

export default function SupportPage() {
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('bookings');

  // Contact Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');

  const activeCategory_data = FAQ_CATEGORIES.find(c => c.id === activeCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('sending');
    // Simulate async submission
    await new Promise(r => setTimeout(r, 1500));
    // In production, this would call an API route that sends the email
    setFormState('sent');
    setName(''); setEmail(''); setSubject(''); setMessage('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-3xl p-7 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/20 rounded-2xl">
            <LifeBuoy className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-100">Help Center</span>
        </div>
        <h1 className="font-display text-2xl font-black mb-2">Support Center</h1>
        <p className="text-sm text-sky-100 leading-relaxed">
          Find answers to common questions, or reach out to our team. We're here to help
          families and caregivers have the best possible experience on NestCare.
        </p>
        {/* Quick Contact Chips */}
        <div className="flex gap-2 mt-5 flex-wrap">
          <a
            href="mailto:support@nestcare.app"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-[11px] font-bold text-white transition-colors active-press"
          >
            <Mail className="h-3 w-3" /> support@nestcare.app
          </a>
          <a
            href="#contact-form"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-[11px] font-bold text-white transition-colors active-press"
          >
            <MessageCircle className="h-3 w-3" /> Send Message
          </a>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3 hover:border-primary hover:bg-emerald-50/30 active-press transition-all group shadow-sm"
          >
            <span className="p-2 bg-stone-100 group-hover:bg-primary/10 rounded-xl transition-colors">
              <link.icon className="h-4 w-4 text-stone-500 group-hover:text-primary transition-colors" />
            </span>
            <span className="text-xs font-bold text-stone-700 group-hover:text-heading transition-colors">{link.label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-primary ml-auto transition-colors" />
          </Link>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="border-b border-stone-100 pb-4">
          <h2 className="font-display text-base font-black text-heading">Frequently Asked Questions</h2>
          <p className="text-xs text-stone-400 mt-1">Browse by topic to find the answer you need.</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 no-scrollbar">
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setActiveFaq(null); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap shrink-0 active-press ${
                activeCategory === cat.id
                  ? `${cat.bg} ${cat.color} border ${cat.border}`
                  : 'bg-stone-50 text-stone-500 border border-stone-150 hover:bg-stone-100'
              }`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-2">
          {activeCategory_data?.questions.map((item, idx) => {
            const faqId = `${activeCategory}-${idx}`;
            const isOpen = activeFaq === faqId;
            return (
              <div
                key={faqId}
                className={`border rounded-2xl overflow-hidden transition-all ${
                  isOpen
                    ? `${activeCategory_data.border} ${activeCategory_data.bg}`
                    : 'border-stone-150 bg-stone-50/40 hover:bg-stone-50'
                }`}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : faqId)}
                  className="w-full flex items-center justify-between p-4 text-left gap-3"
                >
                  <span className={`text-xs font-bold leading-snug ${isOpen ? 'text-heading' : 'text-stone-700'}`}>
                    {item.q}
                  </span>
                  <span className={`shrink-0 p-1 rounded-lg transition-colors ${isOpen ? `${activeCategory_data.bg} ${activeCategory_data.color}` : 'text-stone-400'}`}>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-stone-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Response Times */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'General Queries', time: '< 24 hrs', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Billing Issues', time: '< 12 hrs', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Safety Concerns', time: '< 2 hrs', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
        ].map((rt) => (
          <div key={rt.label} className={`${rt.bg} border ${rt.border} rounded-2xl p-3.5 text-center`}>
            <span className={`font-display text-lg font-black ${rt.color} block`}>{rt.time}</span>
            <span className="text-[10px] font-bold text-stone-600 block mt-0.5 leading-tight">{rt.label}</span>
          </div>
        ))}
      </div>

      {/* Contact Form */}
      <div id="contact-form" className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5 scroll-mt-20">
        <div className="border-b border-stone-100 pb-4">
          <h2 className="font-display text-base font-black text-heading">Send Us a Message</h2>
          <p className="text-xs text-stone-400 mt-1">Can't find what you're looking for? Our team will get back to you shortly.</p>
        </div>

        {formState === 'sent' ? (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="p-4 bg-emerald-50 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-base font-black text-heading">Message Sent!</h3>
            <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
              Thanks for reaching out. Our support team will review your message and respond to your email within 24 hours.
            </p>
            <button
              onClick={() => setFormState('idle')}
              className="mt-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 active-press transition-colors"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Your Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Subject</label>
              <select
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="">Select a topic...</option>
                <option value="booking">Booking Issue</option>
                <option value="payment">Payment / Billing</option>
                <option value="account">Account & Profile</option>
                <option value="safety">Safety Concern</option>
                <option value="technical">Technical Problem</option>
                <option value="feedback">General Feedback</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Please describe your issue in detail. Include any relevant booking IDs or screenshots if helpful."
                className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={formState === 'sending'}
              className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 active-press transition-colors"
            >
              {formState === 'sending' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4" /> Send Message</>
              )}
            </button>

            <p className="text-center text-[10px] text-stone-400">
              By submitting, you agree to our{' '}
              <Link href="/privacy" className="text-primary hover:underline font-bold">Privacy Policy</Link>.
              We'll respond to your email within 24 hours.
            </p>
          </form>
        )}
      </div>

      {/* Direct Contact */}
      <div className="bg-gradient-to-r from-stone-50 to-stone-100 border border-stone-200 rounded-3xl p-6 space-y-4">
        <h2 className="font-display text-sm font-black text-heading">Direct Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'General Support', email: 'support@nestcare.app', color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
            { label: 'Billing', email: 'billing@nestcare.app', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
            { label: 'Safety', email: 'safety@nestcare.app', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          ].map((contact) => (
            <a
              key={contact.email}
              href={`mailto:${contact.email}`}
              className={`${contact.bg} border ${contact.border} rounded-2xl p-3.5 flex flex-col gap-1 hover:opacity-80 active-press transition-opacity`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${contact.color}`}>{contact.label}</span>
              <span className="text-[11px] font-semibold text-stone-700 truncate">{contact.email}</span>
            </a>
          ))}
        </div>
        <div className="flex gap-4 pt-2 border-t border-stone-200">
          <Link href="/privacy" className="text-[11px] font-bold text-primary hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="text-[11px] font-bold text-stone-500 hover:underline">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
