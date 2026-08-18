'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy, MessageCircle, Mail, ChevronDown, ChevronRight,
  BookOpen, CreditCard, User, Calendar, Shield, Search, Send, Loader2, CheckCircle2,
  Clock, Sparkles, AlertCircle
} from 'lucide-react';

const FAQ_CATEGORIES = [
  {
    id: 'bookings',
    icon: Calendar,
    label: 'Bookings & Extensions',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    questions: [
      {
        q: 'How do I book a sitter?',
        a: 'Go to the Search page, find a sitter you like, and tap "Book Sitter" on their profile. Select your desired dates and times, add any notes for the sitter, and confirm. You\'ll receive a notification once the sitter accepts.',
      },
      {
        q: 'How do booking extensions work during active care?',
        a: 'Parents can request a 15, 30, or 60-minute booking extension directly within the chat thread during active care. The sitter receives an in-chat request card and can approve or decline with a single tap. If approved, extended minutes are calculated automatically at the original pricing snapshot rates.',
      },
      {
        q: 'What happens if I am running late for pickup?',
        a: 'NestCare provides a 10-minute grace period after scheduled care ends. If pickup is delayed past 10 minutes without an approved extension, the booking transitions to overdue status and late care charges apply automatically at $0.50 per minute.',
      },
      {
        q: 'Can I cancel a booking?',
        a: 'Yes. Go to your Bookings page, find the booking, and tap "Cancel Booking." If you cancel more than 24 hours before the start time, you\'ll receive a full refund. Cancellations within 24 hours may incur a fee of up to 50%.',
      },
      {
        q: 'What happens if a sitter cancels?',
        a: 'If a sitter cancels a confirmed booking, you will receive a full refund automatically. We\'ll also send you a notification so you can search for an alternative sitter.',
      },
    ],
  },
  {
    id: 'messaging',
    icon: MessageCircle,
    label: 'Messaging & Carefeed',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-100 dark:border-teal-900/50',
    questions: [
      {
        q: 'How does booking-centric messaging work?',
        a: 'Every booking creates a dedicated, secure conversation between parent and sitter. Chat features real-time typing indicators, online presences, read receipts, quick reply buttons, and PDF/image attachment uploads.',
      },
      {
        q: 'Why are off-platform payments flagged in chat?',
        a: 'To protect families and caregivers against scams, fee avoidance, and uninsured off-platform risks, NestCare enforces strict on-platform payment rules. Messages suggesting off-platform cash/Zelle/Venmo payments are automatically flagged for trust & safety review.',
      },
      {
        q: 'What is the Childcare Activity Carefeed?',
        a: 'During active bookings, sitters log care updates (meals, naps, diaper changes, fun activities, and photos). Updates appear in real time on the parent\'s Carefeed dashboard.',
      },
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    label: 'Payments & Payouts',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-100 dark:border-violet-900/50',
    questions: [
      {
        q: 'How does payment work?',
        a: 'Payment is processed securely at the time of booking confirmation via Stripe. NestCare holds funds securely and releases sitter earnings after booking completion.',
      },
      {
        q: 'What fees does NestCare charge?',
        a: 'NestCare charges a small service fee on each transaction to maintain and improve platform safety. The breakdown is displayed clearly before booking confirmation.',
      },
      {
        q: 'How do sitters get paid?',
        a: 'Sitter earnings are released after each booking is marked complete. Payouts are transferred automatically to the sitter\'s connected Stripe account.',
      },
    ],
  },
  {
    id: 'safety',
    icon: Shield,
    label: 'Safety & Moderation',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-100 dark:border-rose-900/50',
    questions: [
      {
        q: 'Are sitters background checked?',
        a: 'NestCare background check verification is powered by certified third-party verification partners. Sitters who have completed background checks display a "Verified Caregiver" badge on their profile.',
      },
      {
        q: 'How do I report an issue or user?',
        a: 'You can report users or chat messages directly from any conversation using the overflow menu (⋮), or submit a report via the Settings page. All reports are handled confidentially by NestCare Trust & Safety.',
      },
    ],
  },
];

export default function SupportCenterPage() {
  const [activeCategory, setActiveCategory] = useState<string>('bookings');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'sent'>('idle');

  const currentCategoryObj = FAQ_CATEGORIES.find(c => c.id === activeCategory) || FAQ_CATEGORIES[0];

  const filteredQuestions = searchQuery.trim()
    ? FAQ_CATEGORIES.flatMap(c => c.questions.map(q => ({ ...q, categoryLabel: c.label })))
        .filter(q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) || q.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentCategoryObj.questions;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setTimeout(() => {
      setFormState('sent');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 1000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-emerald-950 via-stone-900 to-emerald-950 rounded-3xl p-7 text-white shadow-xl border border-stone-800 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-emerald-200 text-xs font-bold border border-white/10">
            <LifeBuoy className="h-3.5 w-3.5" /> NestCare Help & Support Center
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">How can we help you today?</h1>
          <p className="text-xs sm:text-sm text-stone-300 max-w-lg leading-relaxed">
            Search our knowledge base for instant answers on bookings, payments, carefeed updates, and platform policies.
          </p>

          {/* Search Input */}
          <div className="relative pt-2 max-w-lg">
            <Search className="absolute left-4 top-1/2 translate-y-1 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search help topics (e.g. late pickup, extensions, refund policy)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs placeholder:text-stone-300 outline-none focus:border-white transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setOpenIndex(0); }}
                className={`p-3.5 rounded-2xl border text-left transition-all active-press flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : `${cat.bg} ${cat.border} border`}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : cat.color}`} />
                </div>
                <span className="text-xs font-bold truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* FAQ Accordion List */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
          <h2 className="font-display text-sm font-black text-heading dark:text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            {searchQuery ? `Search Results (${filteredQuestions.length})` : currentCategoryObj.label}
          </h2>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            {filteredQuestions.length} Questions
          </span>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400 font-medium italic">
            No help topics match your search query "{searchQuery}".
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredQuestions.map((item: any, idx: number) => {
              const isOpen = searchQuery ? true : openIndex === idx;
              return (
                <div
                  key={idx}
                  className="border border-stone-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => !searchQuery && setOpenIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-bold text-xs text-heading dark:text-white flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`h-4 w-4 text-stone-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-stone-50/50 dark:bg-slate-800/40 border-t border-stone-100 dark:border-slate-800 text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Response Time Guarantees */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'General Inquiries', time: '< 24 hrs', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-100 dark:border-emerald-900/50' },
          { label: 'Billing & Payments', time: '< 12 hrs', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-100 dark:border-amber-900/50' },
          { label: 'Safety Concerns', time: '< 2 hrs', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-100 dark:border-rose-900/50' },
        ].map((rt) => (
          <div key={rt.label} className={`${rt.bg} border ${rt.border} rounded-2xl p-3.5 text-center shadow-2xs`}>
            <span className={`font-display text-base sm:text-lg font-black ${rt.color} block`}>{rt.time}</span>
            <span className="text-[10px] font-bold text-stone-600 dark:text-slate-300 block mt-0.5 leading-tight">{rt.label}</span>
          </div>
        ))}
      </div>

      {/* Contact Form */}
      <div id="contact-form" className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 scroll-mt-20">
        <div className="border-b border-stone-100 dark:border-slate-800 pb-4">
          <h2 className="font-display text-base font-black text-heading dark:text-white">Send Us a Direct Message</h2>
          <p className="text-xs text-stone-400 mt-1">Can't find what you're looking for? Our team will get back to you shortly.</p>
        </div>

        {formState === 'sent' ? (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-base font-black text-heading dark:text-white">Message Delivered</h3>
            <p className="text-xs text-stone-500 dark:text-slate-400 max-w-xs leading-relaxed">
              Thanks for reaching out. Our support team will review your inquiry and respond to your email within 24 hours.
            </p>
            <button
              onClick={() => setFormState('idle')}
              className="mt-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 active-press transition-colors"
            >
              Send Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Your Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary transition-colors"
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
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Subject</label>
              <select
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary transition-colors font-bold"
              >
                <option value="">Select a topic...</option>
                <option value="booking">Booking & Extension Query</option>
                <option value="payment">Payment / Billing Dispute</option>
                <option value="account">Account & Children Info</option>
                <option value="safety">Safety & Moderation Report</option>
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
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={formState === 'submitting'}
              className="w-full py-3.5 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 active-press transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
            >
              {formState === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send Message
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
