'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2, Calendar, AlertCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function NotificationsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    async function loadNotifications() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUser(user);

        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });

        setNotifications(data || []);
      } catch (err) {
        console.error('Error loading notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
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

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDeleteAll = async () => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete all notifications?')) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('profile_id', currentUser.id);

      if (error) throw error;

      setNotifications([]);
    } catch (err) {
      console.error('Error deleting notifications:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
        return <Calendar className="h-5 w-5 text-amber-600" />;
      case 'booking_accepted':
        return <Check className="h-5 w-5 text-emerald-600" />;
      case 'booking_cancelled':
      case 'booking_declined':
        return <ShieldAlert className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-stone-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <h1 className="font-display text-xl font-black text-heading">Notifications</h1>
          <p className="text-xs text-stone-400 mt-0.5">Keep track of your bookings and marketplace alerts</p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-bold rounded-xl active-press transition-colors"
            >
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl active-press transition-colors"
              title="Delete all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-sm max-w-md mx-auto space-y-4">
          <div className="p-4 bg-stone-50 border border-stone-150 rounded-full w-fit mx-auto text-stone-400">
            <Bell className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-heading text-sm">All clear!</h3>
            <p className="text-xs text-stone-400 mt-1">You don't have any notifications at the moment.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-3xl shadow-sm overflow-hidden divide-y divide-stone-100">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-5 flex gap-4 transition-colors ${
                !notification.is_read ? 'bg-primary/5/30 border-l-4 border-primary' : ''
              }`}
            >
              <span className="p-2.5 bg-stone-50 rounded-xl border border-stone-150 h-fit self-start">
                {getIcon(notification.type)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-bold text-sm text-heading leading-tight">{notification.title}</h4>
                  <span className="text-[9px] text-stone-400 font-semibold whitespace-nowrap shrink-0">
                    {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed mt-1 whitespace-pre-line">{notification.content}</p>
                {notification.link && (
                  <Link
                    href={notification.link}
                    className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-bold text-primary hover:underline"
                  >
                    View Details &rarr;
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
