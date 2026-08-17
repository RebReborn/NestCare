export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Baby } from 'lucide-react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Minimal header — no dashboard nav */}
      <header className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 bg-primary rounded-xl">
            <Baby className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-black text-sm text-heading">NestCare</span>
        </Link>
        <Link
          href="/dashboard"
          className="text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors"
        >
          Save & Exit
        </Link>
      </header>

      <main className="flex-1 pb-10">
        {children}
      </main>
    </div>
  );
}
