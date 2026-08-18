'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Phone, 
  Monitor, ShieldCheck, Maximize2, Minimize2, Loader2, Sparkles, RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface VideoCallModalProps {
  conversationId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  currentUser: any;
  callMode: 'video' | 'audio';
  isIncoming?: boolean;
  incomingSignal?: any;
  onClose: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function VideoCallModal({
  conversationId,
  partnerId,
  partnerName,
  partnerAvatar,
  currentUser,
  callMode,
  isIncoming = false,
  incomingSignal,
  onClose,
}: VideoCallModalProps) {
  const supabase = createClient();

  const [callState, setCallState] = useState<'calling' | 'incoming' | 'connected' | 'ended'>(
    isIncoming ? 'incoming' : 'calling'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callMode === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const durationTimerRef = useRef<any>(null);
  const hasConnectedRef = useRef(false);
  const hasLoggedRef = useRef(false);

  // Initialize Call & WebRTC PeerConnection
  useEffect(() => {
    let isMounted = true;

    async function initCall() {
      try {
        // 1. Get user media (video & audio)
        const constraints = {
          audio: true,
          video: callMode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (mediaErr) {
          console.warn('[WebRTC] Video access fallback to audio:', mediaErr);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsVideoOff(true);
        }

        if (!isMounted) return;
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Setup RTCPeerConnection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add local tracks to PeerConnection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Handle remote stream tracks
        pc.ontrack = (event) => {
          console.log('[WebRTC] Received remote track:', event.streams);
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'ice_candidate',
              payload: { candidate: event.candidate, from: currentUser.id },
            });
          }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          console.log('[WebRTC] Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            hasConnectedRef.current = true;
            setCallState('connected');
            startDurationTimer();
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            handleEndCall();
          }
        };

        // 3. Setup Supabase Realtime Signaling Channel
        const channel = supabase.channel(`call_signaling_${conversationId}`, {
          config: { broadcast: { self: false } },
        });

        channelRef.current = channel;

        channel
          .on('broadcast', { event: 'offer' }, async ({ payload }) => {
            if (payload.from === currentUser.id) return;
            console.log('[Signaling] Received Offer');

            if (!pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: { answer, from: currentUser.id },
            });
          })
          .on('broadcast', { event: 'answer' }, async ({ payload }) => {
            if (payload.from === currentUser.id) return;
            console.log('[Signaling] Received Answer');

            if (pcRef.current && pcRef.current.signalingState !== 'stable') {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
              hasConnectedRef.current = true;
              setCallState('connected');
              startDurationTimer();
            }
          })
          .on('broadcast', { event: 'ice_candidate' }, async ({ payload }) => {
            if (payload.from === currentUser.id) return;
            if (pcRef.current && payload.candidate) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                console.warn('[Signaling] Candidate error:', e);
              }
            }
          })
          .on('broadcast', { event: 'accept_call' }, async ({ payload }) => {
            if (payload.from === currentUser.id) return;
            console.log('[Signaling] Call accepted by partner. Creating offer...');
            hasConnectedRef.current = true;
            setCallState('connected');
            startDurationTimer();

            if (pcRef.current) {
              const offer = await pcRef.current.createOffer();
              await pcRef.current.setLocalDescription(offer);

              channel.send({
                type: 'broadcast',
                event: 'offer',
                payload: { offer, from: currentUser.id },
              });
            }
          })
          .on('broadcast', { event: 'decline_call' }, ({ payload }) => {
            if (payload.from === currentUser.id) return;
            toast.info(`${partnerName} declined the call.`);
            handleEndCall();
          })
          .on('broadcast', { event: 'end_call' }, ({ payload }) => {
            if (payload.from === currentUser.id) return;
            toast.info('Call ended by user.');
            handleEndCall();
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED' && !isIncoming) {
              const invitePayload = {
                conversationId,
                callerId: currentUser.id,
                callerName: currentUser.user_metadata?.display_name || 'Care Partner',
                callerAvatar: currentUser.user_metadata?.avatar_url || '',
                callMode,
              };

              // Broadcast to conversation channel
              channel.send({
                type: 'broadcast',
                event: 'call_invite',
                payload: invitePayload,
              });

              // Also broadcast directly to partner's personal user channel
              const partnerChannel = supabase.channel(`call_broadcast_${partnerId}`);
              partnerChannel.subscribe((st) => {
                if (st === 'SUBSCRIBED') {
                  partnerChannel.send({
                    type: 'broadcast',
                    event: 'call_invite',
                    payload: invitePayload,
                  });
                }
              });

              // Insert DB call notification fallback to guarantee reception across all pages
              supabase.from('notifications').insert({
                profile_id: partnerId,
                type: 'incoming_call',
                title: `Incoming ${callMode === 'video' ? 'Video' : 'Audio'} Call`,
                content: JSON.stringify(invitePayload),
              }).then(() => {});
            }
          });
      } catch (err: any) {
        console.error('[WebRTC] Init call error:', err);
        toast.error('Could not access microphone/camera.');
        onClose();
      }
    }

    initCall();

    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, []);

  const callStartTimeRef = useRef<number | null>(null);

  const startDurationTimer = () => {
    if (!callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
    }
    if (durationTimerRef.current) return;
    durationTimerRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      } else {
        setCallDuration((prev) => prev + 1);
      }
    }, 1000);
  };

  const handleAcceptCall = async () => {
    hasConnectedRef.current = true;
    setCallState('connected');
    startDurationTimer();

    const sendAcceptSignal = () => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'accept_call',
          payload: { from: currentUser.id },
        });
      }
      const partnerChannel = supabase.channel(`call_broadcast_${partnerId}`);
      partnerChannel.subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          partnerChannel.send({
            type: 'broadcast',
            event: 'accept_call',
            payload: { from: currentUser.id },
          });
        }
      });
    };

    sendAcceptSignal();
    setTimeout(sendAcceptSignal, 600);
  };

  const handleDeclineCall = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'decline_call',
        payload: { from: currentUser.id },
      });
    }
    handleEndCall();
  };

  const handleEndCall = () => {
    if (hasLoggedRef.current) return;
    hasLoggedRef.current = true;

    if (!isIncoming) {
      if (hasConnectedRef.current || callState === 'connected') {
        const elapsedSecs = callStartTimeRef.current
          ? Math.max(1, Math.floor((Date.now() - callStartTimeRef.current) / 1000))
          : callDuration;

        const mins = Math.floor(elapsedSecs / 60);
        const secs = elapsedSecs % 60;
        const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        const callLabel = callMode === 'video' ? `Video Call (${durStr})` : `Audio Call (${durStr})`;

        supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          message_type: 'call_summary',
          content: callLabel,
        }).select('id').single().then(({ data: newMsg }) => {
          if (newMsg) {
            supabase.from('message_reads').upsert([
              { message_id: newMsg.id, user_id: currentUser.id },
              { message_id: newMsg.id, user_id: partnerId }
            ], { onConflict: 'message_id,user_id' }).then(() => {});
          }
        });
      } else {
        supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          message_type: 'missed_call',
          content: callMode === 'video' ? 'Missed Video Call' : 'Missed Audio Call',
        }).select('id').single().then(({ data: newMsg }) => {
          if (newMsg) {
            supabase.from('message_reads').upsert([
              { message_id: newMsg.id, user_id: currentUser.id }
            ], { onConflict: 'message_id,user_id' }).then(() => {});
          }
        });
      }
    }

    setCallState('ended');
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'end_call',
        payload: { from: currentUser.id },
      });
    }

    if (!isIncoming && partnerId) {
      const partnerChannel = supabase.channel(`call_broadcast_${partnerId}`);
      partnerChannel.subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          partnerChannel.send({
            type: 'broadcast',
            event: 'cancel_call',
            payload: { from: currentUser.id },
          });
        }
      });
    }
    cleanupCall();
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const cleanupCall = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          if (localStreamRef.current && sender) {
            const origVideoTrack = localStreamRef.current.getVideoTracks()[0];
            if (origVideoTrack) sender.replaceTrack(origVideoTrack);
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (e) {
        console.warn('Screen share canceled:', e);
      }
    } else {
      if (localStreamRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        const origVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (sender && origVideoTrack) {
          sender.replaceTrack(origVideoTrack);
        }
      }
      setIsScreenSharing(false);
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
        
        {/* Top Floating Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-slate-950/80 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={partnerAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
              alt={partnerName}
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/50 shadow-md"
            />
            <div>
              <h3 className="font-display text-sm font-black text-white flex items-center gap-1.5">
                {partnerName}
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Encrypted P2P {callMode === 'video' ? 'Video' : 'Audio'} Call
              </span>
            </div>
          </div>

          {callState === 'connected' && (
            <div className="px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-white font-mono text-xs font-bold tracking-wider">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {/* Central Stream Container */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center">
          {/* Remote Video Stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              callState === 'connected' ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Incoming Call Overlay */}
          {callState === 'incoming' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-slate-950/95 z-30">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/20 animate-ping opacity-75" />
                <img
                  src={partnerAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                  alt={partnerName}
                  className="relative w-28 h-28 rounded-full object-cover border-4 border-primary shadow-2xl"
                />
              </div>
              <div>
                <h2 className="font-display text-xl font-black text-white">{partnerName}</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">Incoming NestCare {callMode} call invite...</p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={handleDeclineCall}
                  className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl active-press transition-colors flex items-center gap-2 shadow-lg"
                >
                  <PhoneOff className="h-4 w-4" /> Decline
                </button>
                <button
                  onClick={handleAcceptCall}
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl active-press transition-colors flex items-center gap-2 shadow-lg animate-bounce"
                >
                  <Phone className="h-4 w-4" /> Accept Call
                </button>
              </div>
            </div>
          )}

          {/* Outgoing Calling / Dialing State */}
          {callState === 'calling' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-5 bg-slate-950/90 z-20">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/30 animate-pulse" />
                <img
                  src={partnerAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                  alt={partnerName}
                  className="relative w-24 h-24 rounded-full object-cover border-4 border-primary/60 shadow-xl"
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-black text-white">Calling {partnerName}...</h3>
                <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Waiting for response
                </p>
              </div>
            </div>
          )}

          {/* PIP Local Video Stream */}
          <div className="absolute bottom-20 right-4 z-20 w-32 sm:w-44 aspect-video bg-slate-800 rounded-2xl border-2 border-slate-700 overflow-hidden shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                <VideoOff className="h-6 w-6" />
                <span className="text-[9px] font-bold mt-1">Camera Off</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-center gap-3 z-30">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl border transition-all active-press ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Toggle Video */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl border transition-all active-press ${
              isVideoOff
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl border transition-all active-press ${
              isScreenSharing
                ? 'bg-primary border-primary text-white'
                : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            <Monitor className="h-5 w-5" />
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="p-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs active-press transition-colors shadow-lg flex items-center gap-2"
          >
            <PhoneOff className="h-5 w-5" /> End Call
          </button>
        </div>
      </div>
    </div>
  );
}
