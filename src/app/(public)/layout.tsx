import Link from 'next/link';
import { LandingHeader } from '@/components/navigation/landing-header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg dark:bg-slate-950 flex flex-col justify-between">
      {/* Dynamic Header with session check, Notifications, and Profile Avatar */}
      <LandingHeader />

      {/* Page content */}
      <main className="flex-1 px-4 py-8 md:px-8 md:py-10 max-w-4xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-stone-400 dark:text-slate-400 font-semibold">
            © {new Date().getFullYear()} NestCare. All rights reserved.
          </span>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-xs font-bold text-stone-500 dark:text-slate-400 hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-xs font-bold text-stone-500 dark:text-slate-400 hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="/support" className="text-xs font-bold text-stone-500 dark:text-slate-400 hover:text-primary transition-colors">Support & Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
