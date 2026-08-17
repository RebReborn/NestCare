'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function HeaderBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isShrunk, setIsShrunk] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
        }
      } catch (err) {
        console.error('Error fetching profile avatar in header:', err);
      }
    }
    getProfile();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Shrink header if scrolled down past 20px
      if (currentScrollY > 20) {
        setIsShrunk(true);
      } else {
        setIsShrunk(false);
      }

      // Hide/Show based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // Scrolling DOWN and passed threshold -> Hide
        setIsVisible(false);
      } else {
        // Scrolling UP -> Show
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header 
      className={`bg-white/80 dark:bg-slate-900/80 border-b border-stone-200/50 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } ${
        isShrunk ? 'py-2 shadow-xs' : 'py-3.5'
      }`}
    >
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden active-press">
        <img src="/logo.png" alt="NestCare Logo" className="h-6 w-6 object-contain rounded-md" />
        <span className="font-display font-black text-heading text-sm tracking-tight">NestCare</span>
      </Link>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <NotificationBell />
        <Link href="/profile" className="flex items-center hover-scale active-press">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Profile" 
              className="w-8 h-8 rounded-full object-cover border border-stone-200 dark:border-slate-800 shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center border border-stone-200 dark:border-slate-700 text-stone-500 dark:text-slate-400">
              <User className="h-4 w-4" />
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
