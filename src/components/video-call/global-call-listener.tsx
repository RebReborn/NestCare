'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import VideoCallModal from '@/components/video-call/video-call-modal';

export function GlobalCallListener() {
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    conversationId: string;
    partnerId: string;
    partnerName: string;
    partnerAvatar: string;
    callMode: 'video' | 'audio';
    incomingSignal: any;
  } | null>(null);

  useEffect(() => {
    let broadcastChannel: any = null;
    let dbChannel: any = null;
    let isSubscribed = true;

    async function initUserCallListener() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !isSubscribed) return;
      setCurrentUser(user);

      const broadcastTopic = `call_broadcast_${user.id}`;
      const dbTopic = `call_db_${user.id}`;

      // Clean up previous channel references if registered to avoid duplicate listeners
      try {
        const existingChannels = supabase.getChannels();
        existingChannels.forEach((ch: any) => {
          if (ch.topic === `realtime:${broadcastTopic}` || ch.topic === `realtime:${dbTopic}`) {
            supabase.removeChannel(ch);
          }
        });
      } catch (e) {
        console.warn('[Global Call Listener] Channel cleanup error:', e);
      }

      // 1. Dedicated WebSocket Broadcast Channel
      broadcastChannel = supabase
        .channel(broadcastTopic, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'call_invite' }, ({ payload }) => {
          console.log('[Global Call Listener] Incoming broadcast signal received:', payload);
          if (payload?.callerId && payload.callerId !== user.id) {
            setIncomingCall({
              conversationId: payload.conversationId,
              partnerId: payload.callerId,
              partnerName: payload.callerName || 'Care Partner',
              partnerAvatar: payload.callerAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
              callMode: payload.callMode || 'video',
              incomingSignal: payload,
            });
          }
        })
        .on('broadcast', { event: 'cancel_call' }, () => {
          console.log('[Global Call Listener] Call cancelled by caller');
          setIncomingCall(null);
        })
        .subscribe((status) => {
          console.log(`[Global Call Listener] Broadcast channel status for ${user.id}:`, status);
        });

      // 2. Dedicated PostgreSQL DB Notification Changes Channel
      dbChannel = supabase
        .channel(dbTopic)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${user.id}`,
          },
          (payload: any) => {
            const newNotif = payload.new;
            if (newNotif && newNotif.type === 'incoming_call') {
              try {
                const callData = JSON.parse(newNotif.content);
                if (callData?.callerId && callData.callerId !== user.id) {
                  console.log('[Global Call Listener] Received DB incoming_call notification:', callData);
                  setIncomingCall({
                    conversationId: callData.conversationId,
                    partnerId: callData.callerId,
                    partnerName: callData.callerName || 'Care Partner',
                    partnerAvatar: callData.callerAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
                    callMode: callData.callMode || 'video',
                    incomingSignal: callData,
                  });
                }
              } catch (e) {
                console.warn('[Global Call Listener] Failed to parse call notification content:', e);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`[Global Call Listener] DB channel status for ${user.id}:`, status);
        });
    }

    initUserCallListener();

    // Listen to Auth State Changes so channels re-initialize instantly when logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (!currentUser || currentUser.id !== session.user.id)) {
        initUserCallListener();
      }
    });

    return () => {
      isSubscribed = false;
      subscription?.unsubscribe();
      if (broadcastChannel) supabase.removeChannel(broadcastChannel);
      if (dbChannel) supabase.removeChannel(dbChannel);
    };
  }, []);

  if (!incomingCall || !currentUser) return null;

  return (
    <VideoCallModal
      conversationId={incomingCall.conversationId}
      partnerId={incomingCall.partnerId}
      partnerName={incomingCall.partnerName}
      partnerAvatar={incomingCall.partnerAvatar}
      currentUser={currentUser}
      callMode={incomingCall.callMode}
      isIncoming={true}
      incomingSignal={incomingCall.incomingSignal}
      onClose={() => setIncomingCall(null)}
    />
  );
}
