'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Calendar, MessageSquare, User, Compass, X } from 'lucide-react';
import { useUnreadCounts } from '@/hooks/use-unread-counts';

export function BottomNav() {
  const pathname = usePathname();
  const { unreadMessages } = useUnreadCounts();
  const [useFloatingNav, setUseFloatingNav] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkSetting = () => {
      setUseFloatingNav(localStorage.getItem('use_floating_nav') === 'true');
    };
    
    checkSetting();
    window.addEventListener('floating_nav_changed', checkSetting);
    return () => window.removeEventListener('floating_nav_changed', checkSetting);
  }, []);

  if (!mounted) {
    // Return standard layout for SSR to avoid hydration flicker
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 pb-safe backdrop-blur-md md:hidden">
        <div className="flex h-16 justify-around items-center px-2">
          <div className="flex flex-col items-center justify-center flex-1 py-2 text-stone-400">
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1">Home</span>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 py-2 text-stone-400">
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1">Search</span>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 py-2 text-stone-400">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1">Bookings</span>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 py-2 text-stone-400">
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1">Messages</span>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 py-2 text-stone-400">
            <User className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1">Profile</span>
          </div>
        </div>
      </nav>
    );
  }

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: Home, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/50' },
    { label: 'Search', href: '/search', icon: Search, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/50' },
    { label: 'Bookings', href: '/bookings', icon: Calendar, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50' },
    { label: 'Messages', href: '/messages', icon: MessageSquare, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50', badge: unreadMessages },
    { label: 'Profile', href: '/profile', icon: User, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/50' },
  ];

  if (!useFloatingNav) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 pb-safe backdrop-blur-md md:hidden animate-in fade-in duration-300">
        <div className="flex h-16 justify-around items-center px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 py-2 text-center transition-colors active-press ${
                  isActive ? 'text-primary dark:text-emerald-400 font-bold' : 'text-stone-400 dark:text-slate-400'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  {item.label === 'Messages' && unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-[8px] font-extrabold text-white h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      {unreadMessages}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Floating Action Navigation
  return (
    <div className="md:hidden">
      {/* Backdrop with subtle blur */}
      <div 
        className={`fixed inset-0 z-40 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Floating Menu Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3.5">
        {/* Navigation Items (Staggered Vertical Stack) */}
        <div className={`flex flex-col items-end gap-3.5 transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3.5 group"
                style={{
                  transitionDelay: isOpen ? `${index * 40}ms` : '0ms'
                }}
              >
                {/* Tooltip Capsule with glass effect */}
                <span className={`px-3 py-1.5 text-[10px] font-black tracking-wider uppercase rounded-xl shadow-md border backdrop-blur-xs transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-white border-emerald-600' 
                    : 'bg-white/95 dark:bg-slate-900/95 text-stone-700 dark:text-slate-200 border-stone-200/80 dark:border-slate-800'
                }`}>
                  {item.label}
                </span>

                {/* Circular Icon Button with matching theme color */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border relative transition-all duration-200 active-press hover-scale ${
                  isActive
                    ? 'bg-primary text-white border-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.3)]'
                    : `bg-white dark:bg-slate-900 border-stone-200/80 dark:border-slate-800 ${item.color}`
                }`}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-[8px] font-black text-white h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Primary Toggle FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 transition-all duration-300 ease-out active-press hover-scale ${
            isOpen ? 'rotate-90 ring-4 ring-emerald-500/20' : 'shadow-[0_8px_30px_rgba(16,185,129,0.3)] animate-pulse'
          }`}
        >
          {isOpen ? (
            <X className="h-6 w-6" strokeWidth={2.5} />
          ) : (
            <Compass className="h-6 w-6" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
