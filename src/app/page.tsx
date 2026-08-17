import Link from 'next/link';
import { ShieldCheck, Heart, Clock, Star, Users, MessageSquare } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-bg min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="max-w-5xl mx-auto w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <span className="font-display text-lg font-black text-heading">CareMarket</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-xs font-bold text-stone-600 hover:text-stone-900 px-3 py-2">
            Sign In
          </Link>
          <Link href="/register" className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl active-press hover:bg-emerald-800 transition-all shadow-sm">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20 flex-1 flex flex-col justify-center items-center text-center space-y-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 text-xs font-bold text-primary">
          <Heart className="h-3.5 w-3.5 fill-current" /> Trusted Childcare Marketplace
        </div>
        
        <h1 className="font-display text-4xl md:text-5xl font-black text-heading leading-[1.1] max-w-2xl">
          Connecting Parents with Trusted, Vetted Babysitters
        </h1>
        
        <p className="text-sm md:text-base text-muted-text max-w-lg leading-relaxed">
          Book background-checked childcare providers for in-home babysitting, after-school pickups, overnight care, and emergency requests.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full max-w-xs justify-center">
          <Link href="/register?role=parent" className="bg-primary text-white text-sm font-bold py-3.5 px-6 rounded-2xl active-press hover:bg-emerald-800 shadow-md">
            Find a Babysitter
          </Link>
          <Link href="/register?role=sitter" className="bg-white border border-stone-200 text-stone-700 text-sm font-bold py-3.5 px-6 rounded-2xl active-press hover:bg-stone-50 shadow-sm">
            Become a Sitter
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-10 border-t border-stone-200/65">
          <div className="flex flex-col items-center p-5 bg-white border border-stone-150 rounded-3xl shadow-xs">
            <div className="p-3 bg-emerald-50 rounded-2xl text-primary mb-3">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-display font-bold text-sm text-heading">100% Vetted Sitters</h3>
            <p className="text-xs text-muted-text mt-1 text-center leading-relaxed">Every sitter undergoes identity checks and rigorous background checks.</p>
          </div>

          <div className="flex flex-col items-center p-5 bg-white border border-stone-150 rounded-3xl shadow-xs">
            <div className="p-3 bg-amber-50 rounded-2xl text-secondary mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="font-display font-bold text-sm text-heading">Flexible Bookings</h3>
            <p className="text-xs text-muted-text mt-1 text-center leading-relaxed">Schedule recurring school pickups, weekend nights, or emergency care.</p>
          </div>

          <div className="flex flex-col items-center p-5 bg-white border border-stone-150 rounded-3xl shadow-xs">
            <div className="p-3 bg-stone-100 rounded-2xl text-stone-700 mb-3">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="font-display font-bold text-sm text-heading">Secure Platform</h3>
            <p className="text-xs text-muted-text mt-1 text-center leading-relaxed">Real-time messaging, cashless Stripe payouts, and dispute resolution.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white/70 py-6 text-center text-xs text-stone-400">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>© 2026 CareMarket Inc. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-stone-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-stone-600">Terms of Service</Link>
            <Link href="/support" className="hover:text-stone-600">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
