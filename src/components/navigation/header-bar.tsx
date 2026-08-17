'use client';

import { useState, useEffect } from 'react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';

export function HeaderBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isShrunk, setIsShrunk] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

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
      <span className="font-display font-black text-heading text-sm tracking-tight md:hidden">NestCare</span>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
}
