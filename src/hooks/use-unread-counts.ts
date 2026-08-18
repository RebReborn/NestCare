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
    let readsChannel: any = null;

    async function fetchCounts(uId: string) {
      try {
        // 1. Fetch unread notifications
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', uId)
          .eq('is_read', false);

        if (isMounted) setUnreadNotifications(notifCount || 0);

        // 2. Fetch unread messages via message_reads
        const { data: convs } = await supabase
          .from('conversations')
          .select('id')
          .or(`parent_id.eq.${uId},sitter_id.eq.${uId}`);

        if (convs && convs.length > 0) {
          const convIds = convs.map(c => c.id);
          const { data: userMsgs } = await supabase
            .from('messages')
            .select('id, conversation_id, created_at')
            .neq('sender_id', uId)
            .in('conversation_id', convIds);

          if (userMsgs && userMsgs.length > 0) {
            const msgIds = userMsgs.map(m => m.id);
            const { data: readRecords } = await supabase
              .from('message_reads')
              .select('message_id')
              .eq('user_id', uId)
              .in('message_id', msgIds);

            const readSet = new Set((readRecords || []).map(r => r.message_id));
            const unreadCount = userMsgs.filter(m => !readSet.has(m.id)).length;
            if (isMounted) setUnreadMessages(unreadCount);
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

      // Subscribe to Notifications changes
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

      // Subscribe to Message inserts
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

      // Subscribe to Message Reads inserts/deletes for instant badge updates
      readsChannel = supabase
        .channel(`unread-reads-${user.id}-${suffix}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reads',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            if (isMounted) fetchCounts(user.id);
          }
        )
        .subscribe();
    }

    init();

    return () => {
      isMounted = false;
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (msgChannel) supabase.removeChannel(msgChannel);
      if (readsChannel) supabase.removeChannel(readsChannel);
    };
  }, []);

  return {
    unreadNotifications,
    unreadMessages,
    userId,
  };
}
