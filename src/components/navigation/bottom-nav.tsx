'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Calendar, MessageSquare, User } from 'lucide-react';
import { useUnreadCounts } from '@/hooks/use-unread-counts';

export function BottomNav() {
  const pathname = usePathname();
  const { unreadMessages } = useUnreadCounts();

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Bookings', href: '/bookings', icon: Calendar },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 pb-safe backdrop-blur-md md:hidden">
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
