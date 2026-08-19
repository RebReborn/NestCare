'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, User, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function LandingHeader() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
        }
      } catch (err) {
        console.error('Error checking user session in landing header:', err);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  return (
    <header className="w-full bg-white/80 dark:bg-slate-950/80 border-b border-stone-200/80 dark:border-slate-800 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 active-press">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <span className="font-display text-xl font-black text-heading dark:text-white">NestCare</span>
        </Link>

        <div className="flex items-center gap-3">
          {!loading && currentUser ? (
            <>
              {/* Notifications Bell */}
              <NotificationBell />

              {/* Dashboard Shortcut Link */}
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-primary dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors active-press shadow-2xs"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>

              {/* User Profile Avatar Link */}
              <Link
                href="/profile"
                className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-2xl border border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-900 transition-colors active-press"
                title="View Profile"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="User Profile"
                    className="w-8 h-8 rounded-full object-cover border border-stone-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-stone-600 dark:text-slate-300 font-bold text-xs">
                    {currentUser.user_metadata?.display_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                  </div>
                )}
                <span className="hidden md:inline text-xs font-bold text-stone-700 dark:text-slate-200">
                  {currentUser.user_metadata?.display_name || 'My Profile'}
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs font-bold text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl active-press hover:bg-emerald-800 transition-all shadow-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
