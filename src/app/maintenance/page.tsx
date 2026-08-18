import Link from 'next/link';
import { ShieldCheck, Wrench, Clock, ShieldAlert, ArrowRight, Heart, LifeBuoy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function MaintenancePage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('platform_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  const title = settings?.maintenance_title || 'Scheduled Platform Maintenance';
  const message = settings?.maintenance_message || 'NestCare is currently undergoing scheduled platform upgrades to enhance system performance and security.';
  const estimatedTime = settings?.estimated_completion || '30-60 minutes';

  return (
    <div className="bg-bg dark:bg-slate-950 min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="w-full bg-white/80 dark:bg-slate-950/80 border-b border-stone-200/80 dark:border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="font-display text-xl font-black text-heading dark:text-white">NestCare</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-amber-200 dark:border-amber-900/50">
              <Wrench className="h-3.5 w-3.5" /> Maintenance Mode
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-16 flex-1 flex flex-col items-center justify-center text-center space-y-8">
        
        {/* Maintenance Icon Badge */}
        <div className="p-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-3xl text-amber-600 dark:text-amber-400 shadow-md animate-pulse-subtle">
          <Wrench className="h-12 w-12" />
        </div>

        {/* Title & Body */}
        <div className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-black text-heading dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-stone-600 dark:text-slate-300 leading-relaxed font-medium max-w-lg mx-auto">
            {message}
          </p>
        </div>

        {/* Status Callout Card */}
        <div className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-around text-xs">
            <div className="space-y-1 text-center">
              <span className="text-stone-400 font-bold uppercase text-[10px] block">Estimated Duration</span>
              <span className="font-display font-extrabold text-heading dark:text-white text-sm flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 text-amber-500" /> {estimatedTime}
              </span>
            </div>
            <div className="h-8 w-px bg-stone-200 dark:bg-slate-800" />
            <div className="space-y-1 text-center">
              <span className="text-stone-400 font-bold uppercase text-[10px] block">Active Sessions</span>
              <span className="font-display font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-center gap-1">
                <ShieldCheck className="h-4 w-4 text-primary" /> Fully Protected
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-150 dark:border-slate-700 text-xs text-stone-600 dark:text-slate-300 font-medium">
            💡 <strong className="text-heading dark:text-white">Note for Parents & Sitters:</strong> All scheduled care sessions, ongoing live carefeeds, and emergency support channels remain active. We appreciate your patience while we upgrade NestCare!
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Link
            href="/support"
            className="flex-1 py-3.5 px-5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-200 rounded-2xl text-xs font-bold active-press hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <LifeBuoy className="h-4 w-4 text-primary" /> Contact Support
          </Link>
          <Link
            href="/admin"
            className="flex-1 py-3.5 px-5 bg-stone-900 dark:bg-slate-800 text-white rounded-2xl text-xs font-bold active-press hover:bg-stone-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            Admin Sign In <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 py-6 text-center text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
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
