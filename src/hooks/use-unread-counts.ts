'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUnreadCounts() {
  const supabase = createClient();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let notifChannel: any = null;
    let msgChannel: any = null;
    let participantChannel: any = null;

    async function fetchCounts(uId: string) {
      try {
        // 1. Fetch unread notifications
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', uId)
          .eq('is_read', false);

        if (isMounted) setUnreadNotifications(notifCount || 0);

        // 2. Fetch unread messages
        const { data: parts } = await supabase
          .from('conversation_participants')
          .select('conversation_id, last_read_at')
          .eq('profile_id', uId);

        if (parts && parts.length > 0) {
          const convIds = parts.map(p => p.conversation_id);
          const { data: msgs } = await supabase
            .from('messages')
            .select('conversation_id, created_at')
            .neq('sender_id', uId)
            .in('conversation_id', convIds);

          if (msgs) {
            const count = msgs.filter(msg => {
              const cp = parts.find(p => p.conversation_id === msg.conversation_id);
              return cp ? new Date(msg.created_at) > new Date(cp.last_read_at) : false;
            }).length;
            if (isMounted) setUnreadMessages(count);
          } else {
            if (isMounted) setUnreadMessages(0);
          }
        } else {
          if (isMounted) setUnreadMessages(0);
        }
      } catch (err) {
        console.error('Error fetching unread counts:', err);
      }
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;
      setUserId(user.id);
      await fetchCounts(user.id);

      const suffix = Math.random().toString(36).substring(2, 9);

      // Subscribe to Notifications
      notifChannel = supabase
        .channel(`unread-notifs-${user.id}-${suffix}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${user.id}`
          },
          () => {
            if (isMounted) fetchCounts(user.id);
          }
        )
        .subscribe();

      // Subscribe to messages in all user conversations
      // Since filter doesn't support list-ins natively in supabase client side filter, we subscribe to all message inserts and check locally
      msgChannel = supabase
        .channel(`unread-messages-${user.id}-${suffix}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            if (isMounted && payload.new.sender_id !== user.id) {
              fetchCounts(user.id);
            }
          }
        )
        .subscribe();

      // Subscribe to conversation participant updates (last_read_at updates)
      participantChannel = supabase
        .channel(`unread-participants-${user.id}-${suffix}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_participants',
            filter: `profile_id=eq.${user.id}`
          },
          () => {
            if (isMounted) fetchCounts(user.id);
          }
        )
        .subscribe();

      // Cleanup if unmounted while subscribing
      if (!isMounted) {
        if (notifChannel) supabase.removeChannel(notifChannel);
        if (msgChannel) supabase.removeChannel(msgChannel);
        if (participantChannel) supabase.removeChannel(participantChannel);
      }
    }

    init();

    return () => {
      isMounted = false;
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (msgChannel) supabase.removeChannel(msgChannel);
      if (participantChannel) supabase.removeChannel(participantChannel);
    };
  }, []);

  return { unreadNotifications, unreadMessages };
}
