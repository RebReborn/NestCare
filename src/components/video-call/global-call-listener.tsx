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
    let callChannel: any = null;

    async function initUserCallListener() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // Single unified Realtime channel for both WebSockets & DB notifications
      callChannel = supabase.channel(`global_user_calls_${user.id}`)
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
        .subscribe();
    }

    initUserCallListener();

    return () => {
      if (callChannel) {
        supabase.removeChannel(callChannel);
      }
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
