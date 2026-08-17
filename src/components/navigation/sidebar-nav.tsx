'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Calendar, MessageSquare, User, ShieldCheck, Settings, Bell } from 'lucide-react';
import { useUnreadCounts } from '@/hooks/use-unread-counts';

export function SidebarNav() {
  const pathname = usePathname();
  const { unreadNotifications, unreadMessages } = useUnreadCounts();

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Bookings', href: '/bookings', icon: Calendar },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-6">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-3 mb-8 hover:opacity-85 transition-opacity active-press">
        <img src="/logo.png" alt="NestCare Logo" className="h-8 w-8 object-contain rounded-lg" />
        <span className="font-display text-lg font-bold text-heading dark:text-white">NestCare</span>
      </Link>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-emerald-400 font-bold'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-slate-800 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <div className="flex-1 flex items-center justify-between">
                <span>{item.label}</span>
                {item.label === 'Messages' && unreadMessages > 0 && (
                  <span className="bg-red-500 text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded-full">
                    {unreadMessages}
                  </span>
                )}
                {item.label === 'Notifications' && unreadNotifications > 0 && (
                  <span className="bg-red-500 text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded-full">
                    {unreadNotifications}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-stone-100 dark:border-slate-800 pt-4">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-slate-800 hover:text-stone-900 dark:hover:text-white"
        >
          <ShieldCheck className="h-5 w-5 text-stone-400" />
          Admin Portal
        </Link>
      </div>
    </aside>
  );
}
