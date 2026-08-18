import Link from 'next/link';
import { ShieldCheck, Heart, Clock, Star, Users, MessageSquare, CheckCircle2, Lock, CreditCard, Sparkles, Search, Calendar, Shield, ThumbsUp, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NestCare | Trusted, Vetted Childcare & Babysitting Marketplace',
  description: 'Find trusted, vetted babysitters for in-home care, school pickups, evenings, overnight care, and last-minute childcare needs.',
};

export default function Home() {
  return (
    <div className="w-full bg-bg dark:bg-slate-950 min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="w-full bg-white/80 dark:bg-slate-950/80 border-b border-stone-200/80 dark:border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="font-display text-xl font-black text-heading dark:text-white">NestCare</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs font-bold text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white px-3 py-2 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl active-press hover:bg-emerald-800 transition-all shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-8 md:py-16 flex-1 flex flex-col items-center space-y-14">
        
        {/* HERO SECTION */}
        <div className="text-center flex flex-col items-center space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100 dark:border-emerald-900/50 text-xs font-bold text-primary">
            <Heart className="h-3.5 w-3.5 fill-current" /> Trusted Childcare Marketplace
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-heading dark:text-white leading-[1.15] tracking-tight">
            Childcare You Can Trust.<br />
            <span className="text-primary">Sitters You Can Count On.</span>
          </h1>
          
          <p className="text-sm sm:text-base text-stone-600 dark:text-slate-300 max-w-xl leading-relaxed font-medium">
            Find trusted, vetted babysitters for in-home care, school pickups, evenings, overnight care, and last-minute childcare needs.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-2 w-full max-w-sm justify-center">
            <Link href="/register?role=parent" className="bg-primary text-white text-xs sm:text-sm font-bold py-4 px-6 rounded-2xl active-press hover:bg-emerald-800 shadow-md transition-colors flex items-center justify-center gap-2">
              Find a Babysitter
            </Link>
            <Link href="/register?role=sitter" className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-200 text-xs sm:text-sm font-bold py-4 px-6 rounded-2xl active-press hover:bg-stone-50 dark:hover:bg-slate-800 shadow-xs transition-colors flex items-center justify-center gap-2">
              Become a Sitter
            </Link>
          </div>

          {/* Quick Verification Bullets */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs font-bold text-stone-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Identity Verified</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Background Checked</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Secure Payments</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Real-Time Messaging</span>
          </div>
        </div>

        {/* TRUST PILLAR BANNER */}
        <div className="w-full bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-around gap-4 text-xs font-extrabold text-emerald-900 dark:text-emerald-300 shadow-2xs">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4.5 w-4.5 text-primary shrink-0" /> Identity Verification</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /> Background Checks</div>
          <div className="flex items-center gap-2"><Lock className="h-4.5 w-4.5 text-primary shrink-0" /> Authorized Pickup</div>
          <div className="flex items-center gap-2"><CreditCard className="h-4.5 w-4.5 text-primary shrink-0" /> Secure Payments</div>
          <div className="flex items-center gap-2"><Sparkles className="h-4.5 w-4.5 text-primary shrink-0" /> Real-Time Booking Updates</div>
        </div>

        {/* FEATURE CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-4">
          <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-3 text-center">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="font-display font-extrabold text-base text-heading dark:text-white">Trusted & Vetted Sitters</h3>
            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed font-medium">
              Every sitter completes identity verification and required background screening before becoming eligible for bookings.
            </p>
          </div>

          <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-3 text-center">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-600">
              <Clock className="h-7 w-7" />
            </div>
            <h3 className="font-display font-extrabold text-base text-heading dark:text-white">Flexible Bookings</h3>
            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed font-medium">
              Book one-time, recurring, evening, overnight, and school-pickup childcare based on your family's needs.
            </p>
          </div>

          <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-3 text-center">
            <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 rounded-2xl text-sky-600">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="font-display font-extrabold text-base text-heading dark:text-white">Secure Platform</h3>
            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed font-medium">
              Message securely, pay through Stripe, track bookings, and get support when something doesn't go as planned.
            </p>
          </div>
        </div>

        {/* HOW NESTCARE WORKS STEP-BY-STEP */}
        <div className="w-full space-y-8 pt-8 border-t border-stone-200/70 dark:border-slate-800">
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-heading dark:text-white">How NestCare Works</h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 font-medium max-w-md mx-auto">
              Simple, transparent, and built around safety at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
            {/* Step 1 */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl space-y-3 relative flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center">
                  1
                </div>
                <h4 className="font-display font-extrabold text-sm text-heading dark:text-white">Find a sitter</h4>
                <p className="text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
                  Search by location, availability, experience, pricing, and childcare needs.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl space-y-3 relative flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center">
                  2
                </div>
                <h4 className="font-display font-extrabold text-sm text-heading dark:text-white">Book with confidence</h4>
                <p className="text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
                  Review the sitter's profile, verification status, reviews, pricing, and availability.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl space-y-3 relative flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center">
                  3
                </div>
                <h4 className="font-display font-extrabold text-sm text-heading dark:text-white">Stay connected</h4>
                <p className="text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
                  Message your sitter, receive booking updates, and manage pickup information in real time.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl space-y-3 relative flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center">
                  4
                </div>
                <h4 className="font-display font-extrabold text-sm text-heading dark:text-white">Pay securely</h4>
                <p className="text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
                  Payments are processed through Stripe, with transparent pricing and digital receipts.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl space-y-3 relative flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center">
                  5
                </div>
                <h4 className="font-display font-extrabold text-sm text-heading dark:text-white">Care is completed</h4>
                <p className="text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
                  Confirm pickup, leave a review, and keep your booking history organized.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CALLOUT */}
        <div className="w-full bg-stone-900 dark:bg-slate-900 text-white rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="font-display text-xl sm:text-2xl font-black">Ready to find trusted care for your family?</h3>
            <p className="text-xs sm:text-sm text-stone-300 font-medium">Create your account in minutes and connect with vetted local sitters.</p>
          </div>
          <Link href="/register?role=parent" className="bg-primary hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold py-3.5 px-6 rounded-2xl active-press transition-colors shrink-0 flex items-center gap-2 shadow-md">
            Get Started Now <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 py-6 text-center text-xs text-stone-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-medium">© 2026 NestCare Inc. All rights reserved.</span>
          <div className="flex gap-4 font-bold">
            <Link href="/privacy" className="hover:text-stone-600 dark:hover:text-slate-200">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-stone-600 dark:hover:text-slate-200">Terms of Service</Link>
            <Link href="/support" className="hover:text-stone-600 dark:hover:text-slate-200">Support Center</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
