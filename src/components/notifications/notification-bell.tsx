'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, Loader2, Calendar, AlertCircle, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function NotificationBell() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function initNotifications() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        setCurrentUser(user);

        // Fetch unread count
        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', user.id)
          .eq('is_read', false);

        if (isMounted) setUnreadCount(count || 0);

        // Fetch latest 5 notifications
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (isMounted) setNotifications(data || []);

        // Tear down any existing channel before creating a new one
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        if (!isMounted) return;

        // Subscribe to real-time notifications
        const suffix = Math.random().toString(36).substring(2, 9);
        const newChannel = supabase
          .channel(`notifs-${user.id}-${suffix}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `profile_id=eq.${user.id}`
            },
            (payload) => {
              if (isMounted) {
                setNotifications(prev => [payload.new, ...prev.slice(0, 4)]);
                setUnreadCount(c => c + 1);
              }
            }
          )
          .subscribe();

        channelRef.current = newChannel;
      } catch (err) {
        console.error('Error loading notifications:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initNotifications();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('profile_id', currentUser.id)
        .eq('is_read', false);

      if (error) throw error;

      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
        return <Calendar className="h-3.5 w-3.5 text-amber-600" />;
      case 'booking_accepted':
        return <Check className="h-3.5 w-3.5 text-emerald-600" />;
      case 'booking_cancelled':
      case 'booking_declined':
        return <ShieldAlert className="h-3.5 w-3.5 text-red-600" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-stone-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-stone-50 border border-stone-200 text-stone-600 rounded-full hover:bg-stone-100 hover:text-stone-900 active-press transition-all animate-fade-in"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-[7px] font-extrabold text-white h-3.5 w-3.5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden py-0.5 animate-fade-in">
          <div className="px-3 py-2 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
            <span className="font-display font-black text-[10px] text-heading uppercase tracking-wider">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] font-bold text-primary hover:underline transition-all"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[220px] overflow-y-auto divide-y divide-stone-50">
            {loading ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-6 text-center text-stone-400 text-[10px] space-y-1">
                <Bell className="h-5 w-5 text-stone-300 mx-auto" />
                <p>No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.link || '/bookings'}
                  onClick={() => setIsOpen(false)}
                  className={`p-2.5 flex gap-2.5 text-left transition-colors hover:bg-stone-50/50 ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <span className="p-1.5 bg-stone-50 rounded-lg border border-stone-150 h-fit self-start">
                    {getIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] text-heading leading-tight truncate">{notification.title}</p>
                    <p className="text-[9px] text-stone-500 leading-snug mt-0.5 whitespace-pre-line">{notification.content}</p>
                    <span className="text-[7.5px] text-stone-400 mt-1 block font-semibold">
                      {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="p-1.5 border-t border-stone-100 bg-stone-50/30 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[9.5px] font-bold text-stone-500 hover:text-stone-700 block py-1 hover:underline"
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
