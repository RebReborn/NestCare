'use client';

import { useState, useEffect, useRef } from 'react';
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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function initUserCallListener() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // Subscribe to persistent personal call signaling channel for incoming calls
      const callChannel = supabase.channel(`user_calls_${user.id}`);

      callChannel
        .on('broadcast', { event: 'call_invite' }, ({ payload }) => {
          console.log('[Global Call Listener] Incoming call signal received:', payload);
          if (payload.callerId && payload.callerId !== user.id) {
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
        .on('broadcast', { event: 'cancel_call' }, ({ payload }) => {
          console.log('[Global Call Listener] Call cancelled by caller');
          setIncomingCall(null);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(callChannel);
      };
    }

    initUserCallListener();
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
