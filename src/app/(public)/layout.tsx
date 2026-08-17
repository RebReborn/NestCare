import Link from 'next/link';
import { Baby } from 'lucide-react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Minimal public header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-primary rounded-xl">
              <Baby className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-black text-sm text-heading">NestCare</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 active-press transition-all"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-emerald-800 active-press transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 px-4 py-8 md:px-8 md:py-10">
        {children}
      </main>

      {/* Simple footer */}
      <footer className="border-t border-stone-200 bg-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-stone-400 font-semibold">
            © {new Date().getFullYear()} NestCare. All rights reserved.
          </span>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-[11px] font-bold text-stone-500 hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[11px] font-bold text-stone-500 hover:text-primary transition-colors">Terms</Link>
            <Link href="/support" className="text-[11px] font-bold text-stone-500 hover:text-primary transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
