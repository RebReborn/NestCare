'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send, ArrowLeft, Loader2, MessageSquare, ShieldCheck,
  Image as ImageIcon, MoreVertical, Flag, Ban, X, AlertCircle,
  CheckCheck, Calendar, ExternalLink, Paperclip, FileText,
  Phone, AlertTriangle, Clock, Zap, Check, ThumbsUp, UserCheck,
  Shield, Lock, Sparkles, ChevronRight, Eye, Search as SearchIcon, Video, PhoneOff
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import VideoCallModal from '@/components/video-call/video-call-modal';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  
  const newChatSitterId = searchParams.get('newChat');
  const bookingIdParam = searchParams.get('bookingId');

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Attachments state
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'document' | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Read receipts and presence
  const [partnerLastRead, setPartnerLastRead] = useState<string | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState<boolean>(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState<boolean>(false);

  // Menu & Modals
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('Harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Emergency & Extension Modal states
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionMinutes, setExtensionMinutes] = useState(30);
  const [requestingExtension, setRequestingExtension] = useState(false);

  // Video & Audio Calling state
  const [activeCall, setActiveCall] = useState<{ callMode: 'video' | 'audio'; isIncoming?: boolean; incomingSignal?: any } | null>(null);

  // Blocking states
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByPartner, setIsBlockedByPartner] = useState(false);
  const [blockRecordId, setBlockRecordId] = useState<string | null>(null);

  // Search & Filter state for Conversations Sidebar
  const [convSearch, setConvSearch] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Mobile body class for responsive full screen chat
  useEffect(() => {
    if (activeConv) {
      document.body.classList.add('mobile-chat-active');
    } else {
      document.body.classList.remove('mobile-chat-active');
    }
    return () => document.body.classList.remove('mobile-chat-active');
  }, [activeConv]);

  // Initialize user & load conversations list
  useEffect(() => {
    async function initMessages() {
      try {
        setLoadingConvs(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUser(user);

        // Fetch conversations joined with bookings and profiles
        const { data: convData, error: convErr } = await supabase
          .from('conversations')
          .select(`
            id,
            booking_id,
            parent_id,
            sitter_id,
            status,
            last_message_at,
            created_at,
            updated_at,
            booking:bookings(
              id,
              status,
              start_time,
              end_time,
              duration_minutes,
              total,
              currency,
              special_notes,
              pickup_required,
              pickup_location
            ),
            parent:profiles!conversations_parent_id_fkey(id, display_name, avatar_url, role, phone),
            sitter:profiles!conversations_sitter_id_fkey(id, display_name, avatar_url, role, phone)
          `)
          .or(`parent_id.eq.${user.id},sitter_id.eq.${user.id}`)
          .order('last_message_at', { ascending: false });

        if (convErr) {
          console.warn('Fallback loading conversations via participants:', convErr);
        }

        let mappedConvs: any[] = [];

        if (convData && convData.length > 0) {
          mappedConvs = convData.map((conv: any) => {
            const isUserParent = conv.parent_id === user.id;
            const partner = isUserParent ? conv.sitter : conv.parent;
            
            return {
              id: conv.id,
              booking_id: conv.booking_id,
              booking: conv.booking,
              parent_id: conv.parent_id,
              sitter_id: conv.sitter_id,
              status: conv.status || 'active',
              last_message_at: conv.last_message_at,
              partner_id: partner?.id,
              partner_name: partner?.display_name || (isUserParent ? 'Caregiver' : 'Parent'),
              partner_avatar: partner?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
              partner_role: partner?.role || (isUserParent ? 'sitter' : 'parent'),
              partner_phone: partner?.phone,
              user_role: isUserParent ? 'parent' : 'sitter'
            };
          });
        } else {
          // Fallback legacy participant fetch if migration backfill is pending
          const { data: partData } = await supabase
            .from('conversation_participants')
            .select(`
              conversation_id,
              conversation:conversations(
                id,
                booking_id,
                conversation_participants(
                  profile:profiles(id, display_name, avatar_url, role, phone),
                  last_read_at
                )
              )
            `)
            .eq('profile_id', user.id);

          mappedConvs = (partData || []).map((c: any) => {
            const conv = c.conversation;
            const otherParticipant = conv?.conversation_participants?.find(
              (p: any) => p.profile.id !== user.id
            );
            return {
              id: conv.id,
              booking_id: conv.booking_id,
              partner_id: otherParticipant?.profile?.id,
              partner_name: otherParticipant?.profile?.display_name || 'User',
              partner_avatar: otherParticipant?.profile?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
              partner_role: otherParticipant?.profile?.role || 'sitter',
              partner_phone: otherParticipant?.profile?.phone,
              status: 'active'
            };
          });
        }

        setConversations(mappedConvs);

        // Auto-select conversation based on query parameters (convId, conversationId, bookingId)
        const convIdParam = searchParams.get('convId') || searchParams.get('conversationId');
        const targetId = convIdParam || bookingIdParam;

        if (targetId) {
          const match = mappedConvs.find(c => c.id === targetId || c.booking_id === targetId);
          if (match) {
            setActiveConv(match);
          } else {
            // Direct conversation fetch (e.g. for Admin inspection or direct link)
            const { data: directConv } = await supabase
              .from('conversations')
              .select('*, parent:profiles!parent_id(id, display_name, avatar_url, role, phone), sitter:profiles!sitter_id(id, display_name, avatar_url, role, phone)')
              .eq('id', targetId)
              .maybeSingle();

            if (directConv) {
              const isParent = directConv.parent_id === user.id;
              const partner = isParent ? directConv.sitter : directConv.parent;
              const formattedDirect = {
                id: directConv.id,
                booking_id: directConv.booking_id,
                partner_id: partner?.id || (isParent ? directConv.sitter_id : directConv.parent_id),
                partner_name: partner?.display_name || 'Care Partner',
                partner_avatar: partner?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
                partner_role: partner?.role || 'sitter',
                partner_phone: partner?.phone,
                status: directConv.status || 'active'
              };
              setConversations(prev => [formattedDirect, ...prev.filter(c => c.id !== formattedDirect.id)]);
              setActiveConv(formattedDirect);
            }
          }
        } else if (newChatSitterId) {
          if (newChatSitterId === user.id) {
            toast.error("You cannot initiate a conversation with yourself.");
            if (mappedConvs.length > 0) setActiveConv(mappedConvs[0]);
            return;
          }
          const existing = mappedConvs.find(c => c.partner_id === newChatSitterId);
          if (existing) {
            setActiveConv(existing);
          } else {
            // Draft conversation initiation
            const { data: sitterProf } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url, role, phone')
              .eq('id', newChatSitterId)
              .single();

            const draftConv = {
              id: `draft-${newChatSitterId}`,
              booking_id: null,
              parent_id: user.id,
              sitter_id: newChatSitterId,
              partner_id: newChatSitterId,
              partner_name: sitterProf?.display_name || 'Caregiver',
              partner_avatar: sitterProf?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
              partner_role: sitterProf?.role || 'sitter',
              partner_phone: sitterProf?.phone,
              status: 'active',
              isDraft: true,
            };

            setConversations(prev => [draftConv, ...prev.filter(c => c.id !== draftConv.id)]);
            setActiveConv(draftConv);
          }
        } else if (mappedConvs.length > 0 && !activeConv) {
          setActiveConv(mappedConvs[0]);
        }
      } catch (err) {
        console.error('Error initializing messages:', err);
      } finally {
        setLoadingConvs(false);
      }
    }

    initMessages();
  }, [newChatSitterId, bookingIdParam]);

  // Realtime Presence (Online Status & Typing Indicator)
  useEffect(() => {
    if (!currentUser || !activeConv?.partner_id) return;

    const channel = supabase.channel(`presence-${activeConv.id}`, {
      config: { presence: { key: currentUser.id } }
    });

    const callChannel = supabase.channel(`call_signaling_${activeConv.id}`);
    callChannel
      .on('broadcast', { event: 'call_invite' }, ({ payload }) => {
        if (payload.callerId !== currentUser.id) {
          setActiveCall({ callMode: payload.callMode || 'video', isIncoming: true, incomingSignal: payload });
        }
      })
      .subscribe();

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const partnerPresences = state[activeConv.partner_id];
        if (partnerPresences && partnerPresences.length > 0) {
          setIsPartnerOnline(true);
          const latest = partnerPresences[partnerPresences.length - 1] as any;
          setIsPartnerTyping(!!latest.is_typing);
        } else {
          setIsPartnerOnline(false);
          setIsPartnerTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          presenceChannelRef.current = channel;
          await channel.track({ online_at: new Date().toISOString(), is_typing: false });
        }
      });

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(callChannel);
    };
  }, [activeConv, currentUser]);

  // Global Personal User Call Signaling Listener
  useEffect(() => {
    if (!currentUser) return;

    const userCallChannel = supabase.channel(`user_calls_${currentUser.id}`);
    userCallChannel
      .on('broadcast', { event: 'call_invite' }, ({ payload }) => {
        if (payload.callerId !== currentUser.id) {
          setActiveCall({ callMode: payload.callMode || 'video', isIncoming: true, incomingSignal: payload });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(userCallChannel);
    };
  }, [currentUser]);

  // Handle typing presence indicator broadcast
  const handleUserTyping = () => {
    if (!currentUser || !activeConv || activeConv.isDraft || !presenceChannelRef.current) return;
    presenceChannelRef.current.track({ online_at: new Date().toISOString(), is_typing: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({ online_at: new Date().toISOString(), is_typing: false });
      }
    }, 2000);
  };

  // Check Block Status when activeConv changes
  useEffect(() => {
    async function checkBlockStatus() {
      if (!currentUser || !activeConv?.partner_id) {
        setIsBlockedByMe(false);
        setIsBlockedByPartner(false);
        setBlockRecordId(null);
        return;
      }
      const { data: myBlock } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', activeConv.partner_id)
        .maybeSingle();

      const { data: partnerBlock } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', activeConv.partner_id)
        .eq('blocked_id', currentUser.id)
        .maybeSingle();

      setIsBlockedByMe(!!myBlock);
      setBlockRecordId(myBlock?.id || null);
      setIsBlockedByPartner(!!partnerBlock);
    }

    checkBlockStatus();
  }, [activeConv, currentUser]);

  // Load Messages & Setup Realtime Database Subscription
  useEffect(() => {
    if (!activeConv || !currentUser) return;
    if (activeConv.isDraft) { setMessages([]); return; }

    let dbChannel: any;

    async function loadMessages() {
      try {
        setLoadingMessages(true);
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConv.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);

        // Mark messages as read by adding to message_reads table
        if (data && data.length > 0) {
          const unreadMsgs = data.filter(m => m.sender_id !== currentUser.id);
          if (unreadMsgs.length > 0) {
            const readsToInsert = unreadMsgs.map(m => ({
              message_id: m.id,
              user_id: currentUser.id,
            }));
            await supabase.from('message_reads').upsert(readsToInsert, { onConflict: 'message_id,user_id' });
          }
        }

        // Fetch partner's last read timestamp
        const { data: partnerReads } = await supabase
          .from('message_reads')
          .select('read_at')
          .eq('user_id', activeConv.partner_id)
          .order('read_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setPartnerLastRead(partnerReads?.read_at || null);

      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();

    // Subscribe to Postgres database changes for instant messaging
    dbChannel = supabase
      .channel(`db-room-${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, async (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });

        // Insert read receipt if message is from partner
        if (payload.new.sender_id !== currentUser.id) {
          try {
            await supabase.from('message_reads').insert({
              message_id: payload.new.id,
              user_id: currentUser.id
            });
          } catch (e) {}
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(dbChannel); };
  }, [activeConv, currentUser]);

  // Handle Attachment Selection (Image or PDF Document)
  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10 MB.');
      return;
    }

    const isImg = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImg && !isPdf) {
      toast.error('Please upload an image (JPG, PNG, WEBP) or PDF document.');
      return;
    }

    setAttachmentFile(file);
    setAttachmentType(isImg ? 'image' : 'document');

    if (isImg) {
      const reader = new FileReader();
      reader.onload = ev => setAttachmentPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(file.name);
    }
  };

  // Send Message Handler (With Optimistic Instant UI Update)
  const handleSendMessage = async (e?: React.FormEvent, customContent?: string, customType?: string) => {
    if (e) e.preventDefault();

    const textToSend = customContent !== undefined ? customContent : inputText;
    const msgType = customType || (attachmentType === 'document' ? 'document' : attachmentType === 'image' ? 'image' : 'text');

    if ((!textToSend.trim() && !attachmentFile) || !activeConv || !currentUser) return;
    if (isBlockedByMe || isBlockedByPartner) {
      toast.error('Messaging is disabled for blocked relationships.');
      return;
    }

    if (customContent === undefined) setInputText('');
    const file = attachmentFile;
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setAttachmentType(null);

    try {
      let conversationId = activeConv.id;

      // Handle Draft Conversation Creation
      if (activeConv.isDraft) {
        const { data: newConv, error: newConvErr } = await supabase
          .from('conversations')
          .insert({
            booking_id: activeConv.booking_id || null,
            parent_id: currentUser.id,
            sitter_id: activeConv.partner_id,
            status: 'active'
          })
          .select()
          .single();

        if (newConvErr) throw newConvErr;

        await supabase.from('conversation_participants').insert([
          { conversation_id: newConv.id, profile_id: currentUser.id },
          { conversation_id: newConv.id, profile_id: activeConv.partner_id },
        ]);

        conversationId = newConv.id;
        const updatedConv = { ...activeConv, id: newConv.id, isDraft: false };
        setConversations(prev => prev.map(c => c.id === activeConv.id ? updatedConv : c));
        setActiveConv(updatedConv);
      }

      let attachmentUrl: string | null = null;

      // Handle Attachment Upload to message-attachments bucket
      if (file) {
        setUploadingAttachment(true);
        try {
          const ext = file.name.split('.').pop();
          const filePath = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
          const { error: upErr } = await supabase.storage.from('message-attachments').upload(filePath, file);
          if (upErr) throw upErr;

          const { data: urlData } = supabase.storage.from('message-attachments').getPublicUrl(filePath);
          attachmentUrl = urlData.publicUrl;
        } catch (uploadErr: any) {
          console.warn('Attachment upload error:', uploadErr);
          toast.error('Attachment upload failed. Sending text only.');
        } finally {
          setUploadingAttachment(false);
        }
      }

      const safetyCheck = detectTrustSafetyViolations(textToSend);
      if (safetyCheck.flagged) {
        toast.warning(`⚠️ Trust & Safety Warning: ${safetyCheck.reason}. All booking, address, and payment details must remain on NestCare for safety and insurance coverage.`);
      }

      // Insert message into Database
      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          message_type: msgType,
          content: textToSend || (attachmentUrl ? (msgType === 'document' ? '📄 Document' : '📷 Image') : ''),
          attachment_url: attachmentUrl || null,
          flagged_for_review: safetyCheck.flagged,
          flag_reason: safetyCheck.reason || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic Instant UI Update
      if (newMsg) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Update last message timestamp in sidebar list
        setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, last_message_at: newMsg.created_at } : c));
      }

      // Fire email notification to partner (non-blocking)
      if (activeConv.partner_id && textToSend) {
        fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'message_digest',
            recipientId: activeConv.partner_id,
            payload: {
              senderName: currentUser.user_metadata?.display_name || 'Someone',
              messagePreview: textToSend.length > 80 ? textToSend.slice(0, 80) + '…' : textToSend,
            },
          }),
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast.error(err.message || 'Failed to send message.');
    }
  };

  // Quick Reply Handler (Point 12)
  const handleQuickReply = async (quickText: string, actionKey?: string) => {
    await handleSendMessage(undefined, quickText, 'text');

    if (actionKey === 'eta_15') {
      toast.success('ETA updated! Partner notified.');
    } else if (actionKey === 'request_extension') {
      setShowExtensionModal(true);
    }
  };

  // Extension Request Submit Handler
  const handleRequestExtensionSubmit = async () => {
    if (!activeConv?.booking_id) {
      toast.error('No active booking linked to this conversation.');
      return;
    }

    try {
      setRequestingExtension(true);
      const res = await fetch('/api/bookings/extensions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: activeConv.booking_id,
          booking_id: activeConv.booking_id,
          additionalMinutes: extensionMinutes,
          requested_minutes: extensionMinutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request extension');

      toast.success(`Requested a ${extensionMinutes}-minute extension!`);
      setShowExtensionModal(false);

      // Post system message into chat
      await handleSendMessage(undefined, `⏰ Extension Request: ${extensionMinutes} minutes requested.`, 'extension_request');
    } catch (err: any) {
      toast.error(err.message || 'Extension request failed.');
    } finally {
      setRequestingExtension(false);
    }
  };

  // Sitter Extension Respond Handler (Approve / Decline)
  const handleRespondExtension = async (extensionId: string, approve: boolean) => {
    try {
      const res = await fetch('/api/bookings/extensions/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extension_id: extensionId,
          booking_id: activeConv?.booking_id,
          approved: approve,
          action: approve ? 'approve' : 'decline'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to respond to extension');

      toast.success(approve ? 'Extension approved!' : 'Extension declined.');
      await handleSendMessage(undefined, approve ? '✅ Extension approved!' : '❌ Extension declined.', approve ? 'extension_approved' : 'extension_declined');
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    }
  };

  // Block & Unblock handlers
  const handleBlock = async () => {
    if (!currentUser || !activeConv?.partner_id) return;
    try {
      const { data, error } = await supabase.from('user_blocks').insert({
        blocker_id: currentUser.id,
        blocked_id: activeConv.partner_id,
      }).select().single();

      if (error) throw error;
      toast.success(`${activeConv.partner_name} has been blocked.`);
      setIsBlockedByMe(true);
      if (data) setBlockRecordId(data.id);
    } catch (err: any) {
      toast.error(err.message || 'Could not block user.');
    }
    setShowMenu(false);
  };

  const handleUnblock = async () => {
    if (!currentUser || !activeConv?.partner_id) return;
    try {
      let err = null;
      if (blockRecordId) {
        const { error } = await supabase.from('user_blocks').delete().eq('id', blockRecordId);
        err = error;
      } else {
        const { error } = await supabase.from('user_blocks').delete()
          .eq('blocker_id', currentUser.id)
          .eq('blocked_id', activeConv.partner_id);
        err = error;
      }

      if (err) throw err;
      toast.success(`${activeConv.partner_name} has been unblocked.`);
      setIsBlockedByMe(false);
      setBlockRecordId(null);
    } catch (err: any) {
      toast.error(err.message || 'Could not unblock user.');
    }
    setShowMenu(false);
  };

  // Moderation Report Submit Handler
  const handleReportSubmit = async () => {
    if (!currentUser || !activeConv?.partner_id) return;
    try {
      setSubmittingReport(true);
      const { error } = await supabase.from('message_reports').insert({
        conversation_id: activeConv.id,
        reporter_id: currentUser.id,
        reported_id: activeConv.partner_id,
        reason_category: reportCategory,
        details: reportDetails.trim(),
      });

      if (error) throw error;
      toast.success('Report submitted. Our moderation team will review within 24 hours.');
      setShowReportModal(false);
      setReportDetails('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Filter conversations in sidebar
  const filteredConvs = conversations.filter(c => {
    if (!convSearch.trim()) return true;
    const query = convSearch.toLowerCase();
    return (
      c.partner_name?.toLowerCase().includes(query) ||
      c.booking_id?.toLowerCase().includes(query)
    );
  });

  const isReadOnlyMode = activeConv?.booking?.status === 'completed' || activeConv?.booking?.status === 'cancelled';

  return (
    <div className="h-full md:h-[calc(100vh-6.5rem)] flex bg-white rounded-none md:rounded-3xl border-0 md:border border-stone-200 shadow-none md:shadow-sm overflow-hidden">
      
      {/* SIDEBAR: CONVERSATIONS LIST */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-stone-200 flex flex-col bg-stone-50/50 ${activeConv ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-stone-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg font-black text-heading flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Messages
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-black">
              {conversations.length}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search chats by name or booking..."
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs outline-none focus:border-primary transition-all font-medium placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100/80">
          {loadingConvs ? (
            <div className="flex justify-center items-center py-12 text-stone-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-xs font-bold">Loading chats…</span>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 font-medium italic space-y-2">
              <p>No conversations found.</p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isActive = activeConv?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                    isActive ? 'bg-emerald-50/70 border-l-4 border-primary' : 'hover:bg-stone-100/60'
                  }`}
                >
                  {/* Partner Avatar with Online Indicator */}
                  <div className="relative shrink-0">
                    <img
                      src={conv.partner_avatar}
                      alt={conv.partner_name}
                      className="w-11 h-11 rounded-2xl object-cover border border-stone-200 shadow-2xs"
                    />
                    {isPartnerOnline && activeConv?.id === conv.id && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-bold text-xs text-heading truncate">
                        {conv.partner_name}
                      </h4>
                      {conv.last_message_at && (
                        <span className="text-[9px] font-semibold text-stone-400 shrink-0">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {/* Booking Context Pill */}
                    {conv.booking_id && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/60 text-[9px] font-extrabold text-stone-600 mb-1">
                        <Calendar className="h-2.5 w-2.5 text-primary" />
                        <span>#NC-{conv.booking_id.slice(0, 5).toUpperCase()}</span>
                      </div>
                    )}

                    <span className="text-[10px] text-stone-500 block truncate font-medium">
                      {conv.isDraft ? 'Draft message...' : 'Tap to open care conversation'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className={`flex-1 flex flex-col ${!activeConv ? 'hidden md:flex bg-stone-50 items-center justify-center' : 'flex'}`}>
        {activeConv ? (
          <>
            {/* THREAD HEADER */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setActiveConv(null)} className="md:hidden p-1.5 rounded-xl hover:bg-stone-100 active-press">
                  <ArrowLeft className="h-5 w-5 text-stone-600" />
                </button>

                <div className="relative shrink-0">
                  <img src={activeConv.partner_avatar} alt={activeConv.partner_name} className="w-10 h-10 rounded-2xl object-cover border border-stone-200" />
                  {isPartnerOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display font-extrabold text-sm text-heading truncate">
                      {activeConv.partner_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[9px] font-black uppercase">
                      {activeConv.partner_role}
                    </span>
                  </div>

                  {/* Presence Status */}
                  <span className="text-[10px] font-semibold text-stone-400 block">
                    {isPartnerTyping ? (
                      <span className="text-primary font-bold animate-pulse">Typing message...</span>
                    ) : isPartnerOnline ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">🟢 Online</span>
                    ) : (
                      'Last active recently'
                    )}
                  </span>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Video Call Button */}
                <button
                  onClick={() => setActiveCall({ callMode: 'video' })}
                  className="p-2 sm:p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 active-press transition-colors flex items-center gap-1.5 font-bold text-xs shadow-2xs"
                  title="Start Video Call"
                >
                  <Video className="h-4 w-4 text-primary shrink-0" />
                  <span className="hidden sm:inline">Video Call</span>
                </button>

                {/* Audio Call Button (Visible on tablet & desktop, integrated into menu on mobile) */}
                <button
                  onClick={() => setActiveCall({ callMode: 'audio' })}
                  className="hidden sm:flex p-2.5 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-600 active-press transition-colors items-center gap-1.5 font-bold text-xs"
                  title="Start Audio Call"
                >
                  <Phone className="h-4 w-4" />
                </button>

                {/* Emergency Safety Button (Visible on desktop, integrated into menu on mobile) */}
                <button
                  onClick={() => setShowEmergencyModal(true)}
                  className="hidden md:flex p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 active-press transition-colors items-center gap-1.5 font-bold text-xs"
                  title="Safety & Emergency"
                >
                  <AlertTriangle className="h-4 w-4" />
                </button>

                {/* Overflow Menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(v => !v)}
                    className="p-2 sm:p-2.5 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-600 active-press transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 top-12 z-30 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 w-60 animate-fade-in divide-y divide-stone-100 dark:divide-slate-800">
                      
                      {/* Mobile-Only Action Items */}
                      <div className="sm:hidden py-1">
                        <button
                          onClick={() => { setShowMenu(false); setActiveCall({ callMode: 'audio' }); }}
                          className="w-full px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left"
                        >
                          <Phone className="h-4 w-4 text-emerald-600" /> Start Audio Call
                        </button>
                        <button
                          onClick={() => { setShowMenu(false); setShowEmergencyModal(true); }}
                          className="w-full px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 text-left"
                        >
                          <AlertTriangle className="h-4 w-4 text-rose-600" /> Safety & Emergency
                        </button>
                      </div>

                      {/* General Action Items */}
                      <div className="py-1">
                        {activeConv.booking_id && (
                          <Link
                            href="/bookings"
                            className="w-full px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                          >
                            <ExternalLink className="h-4 w-4 text-primary" /> View Booking Details
                          </Link>
                        )}

                        <button
                          onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                          className="w-full px-4 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 text-left"
                        >
                          <Flag className="h-4 w-4" /> Report User / Chat
                        </button>

                        {isBlockedByMe ? (
                          <button
                            onClick={handleUnblock}
                            className="w-full px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 text-left"
                          >
                            <Ban className="h-4 w-4" /> Unblock User
                          </button>
                        ) : (
                          <button
                            onClick={handleBlock}
                            className="w-full px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 text-left"
                          >
                            <Ban className="h-4 w-4" /> Block User
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BOOKING CONTEXT HEADER BANNER */}
            {activeConv.booking_id && (
              <div className="bg-emerald-50/80 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>Linked Booking #NC-{activeConv.booking_id.slice(0, 5).toUpperCase()}</span>
                </div>
                <Link
                  href="/bookings"
                  className="text-xs font-black text-primary hover:underline flex items-center gap-1"
                >
                  View Care Overview <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* MESSAGES SCROLL AREA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/40">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full text-stone-400">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-xs font-bold">Loading care messages…</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 text-stone-400 text-xs font-medium space-y-2">
                  <MessageSquare className="h-10 w-10 mx-auto text-stone-300" />
                  <p className="font-bold text-stone-700">No messages yet in this booking chat.</p>
                  <p className="text-[10px]">Use quick replies below or type a message to coordinate care.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOwn = msg.sender_id === currentUser?.id;
                  const isSystem = msg.message_type === 'system' || msg.message_type === 'booking_update' || msg.message_type === 'extension_approved' || msg.message_type === 'extension_declined';

                  if (isSystem) {
                    return (
                      <div key={msg.id || i} className="flex justify-center my-3">
                        <div className="px-4 py-2 bg-stone-100 border border-stone-200 rounded-2xl text-[11px] font-bold text-stone-700 shadow-2xs flex items-center gap-2 max-w-md text-center">
                          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{msg.content}</span>
                        </div>
                      </div>
                    );
                  }

                  if (msg.message_type === 'missed_call') {
                    const cleanText = msg.content?.replace(/^[📹📞]\s*/, '') || 'Missed Video Call';
                    return (
                      <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} my-2`}>
                        <div className="max-w-sm bg-rose-50/90 dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 p-4 rounded-3xl shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold text-xs">
                              <PhoneOff className="h-4 w-4 shrink-0 text-rose-600" />
                              <span>{cleanText}</span>
                            </div>
                            <span className="text-[9px] text-stone-400 font-bold">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!isOwn && (
                            <button
                              onClick={() => setActiveCall({ callMode: 'video' })}
                              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold active-press transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                            >
                              <Video className="h-3.5 w-3.5" /> Call Back
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (msg.message_type === 'call_summary') {
                    const cleanText = msg.content?.replace(/^[📹📞]\s*/, '') || 'Video Call';
                    const isAudio = msg.content?.includes('Audio') || msg.content?.includes('📞');
                    return (
                      <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} my-2`}>
                        <div className="max-w-sm bg-emerald-50/90 dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-3xl shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
                              {isAudio ? <Phone className="h-4 w-4 shrink-0 text-emerald-600" /> : <Video className="h-4 w-4 shrink-0 text-emerald-600" />}
                              <span>{cleanText}</span>
                            </div>
                            <span className="text-[9px] text-stone-400 font-bold">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (msg.message_type === 'extension_request') {
                    return (
                      <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} my-2`}>
                        <div className="max-w-sm bg-white border border-amber-200 p-4 rounded-3xl shadow-sm space-y-3">
                          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>Booking Extension Requested</span>
                          </div>
                          <p className="text-xs text-stone-600 font-medium leading-relaxed">{msg.content}</p>
                          
                          {!isOwn && (
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleRespondExtension(msg.id, true)}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active-press shadow-xs"
                              >
                                Approve Extension
                              </button>
                              <button
                                onClick={() => handleRespondExtension(msg.id, false)}
                                className="flex-1 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-50 active-press"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        
                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isOwn
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-white text-stone-800 rounded-bl-none border border-stone-200'
                        }`}>
                          
                          {/* Image Attachment */}
                          {msg.attachment_url && msg.message_type === 'image' && (
                            <div className="mb-2.5 rounded-xl overflow-hidden max-w-xs border border-stone-200">
                              <img
                                src={msg.attachment_url}
                                alt="Attachment"
                                className="w-full max-h-56 object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => window.open(msg.attachment_url, '_blank')}
                              />
                            </div>
                          )}

                          {/* PDF Document Attachment */}
                          {msg.attachment_url && msg.message_type === 'document' && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`mb-2.5 p-3 rounded-xl border flex items-center gap-2.5 transition-colors ${
                                isOwn ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                              }`}
                            >
                              <FileText className="h-5 w-5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold truncate text-xs">Care Document (PDF)</p>
                                <p className="text-[9px] opacity-80">Tap to open / download</p>
                              </div>
                            </a>
                          )}

                          {/* Text Content */}
                          {msg.content && <p className="whitespace-pre-line">{msg.content}</p>}

                          {/* Flagged Warning */}
                          {msg.flagged_for_review && (
                            <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[9px] font-bold">
                              <AlertCircle className="h-3 w-3" /> Flagged for review
                            </span>
                          )}

                          <span className={`text-[8px] block mt-1 text-right font-semibold ${isOwn ? 'text-white/70' : 'text-stone-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Read receipt for own sent messages */}
                        {isOwn && (
                          <div className="flex items-center gap-1 pr-1">
                            <CheckCheck className={`h-3 w-3 ${partnerLastRead && new Date(partnerLastRead) >= new Date(msg.created_at) ? 'text-primary font-bold' : 'text-stone-400'}`} />
                            <span className={`text-[9px] font-bold ${partnerLastRead && new Date(partnerLastRead) >= new Date(msg.created_at) ? 'text-primary' : 'text-stone-400'}`}>
                              {partnerLastRead && new Date(partnerLastRead) >= new Date(msg.created_at) ? 'Read' : isPartnerOnline ? 'Delivered' : 'Sent'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* QUICK REPLIES BAR (Point 12) */}
            {!isReadOnlyMode && !isBlockedByMe && !isBlockedByPartner && (
              <div className="px-4 py-2 bg-white border-t border-stone-100 flex gap-2 overflow-x-auto scrollbar-none">
                {activeConv.user_role === 'parent' ? (
                  <>
                    <button
                      onClick={() => handleQuickReply("🚗 I'm on my way!", "eta_15")}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-50 hover:text-primary text-stone-700 text-xs font-bold active-press shrink-0 border border-stone-200/60"
                    >
                      🚗 I'm on my way
                    </button>
                    <button
                      onClick={() => handleQuickReply("⏰ I'll be 10 minutes late.", "eta_10")}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-amber-50 hover:text-amber-700 text-stone-700 text-xs font-bold active-press shrink-0 border border-stone-200/60"
                    >
                      ⏰ I'll be 10m late
                    </button>
                    <button
                      onClick={() => handleQuickReply("", "request_extension")}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-sky-50 hover:text-sky-700 text-stone-700 text-xs font-bold active-press shrink-0 border border-stone-200/60"
                    >
                      ⏳ Extend Booking
                    </button>
                    <button
                      onClick={() => handleQuickReply("🏠 I've arrived at the door!")}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-50 hover:text-primary text-stone-700 text-xs font-bold active-press shrink-0 border border-stone-200/60"
                    >
                      🏠 I'm here!
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleQuickReply("👍 Everything is going well!")}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-50 hover:text-primary text-stone-700 text-xs font-bold active-press shrink-0 border border-stone-200/60"
                    >
                      👍 Everything is going well
                    </button>
                    <button
                      onClick={() => handleQuickReply("🎒 Child is ready for pickup!")}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-sky-50 hover:text-sky-700 text-stone-700 text-xs font-bold active-press shrink-0 border border-stone-200/60"
                    >
                      🎒 Ready for pickup
                    </button>
                    <button
                      onClick={() => handleQuickReply("🕒 Please update your estimated pickup time.")}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-amber-50 hover:text-amber-700 text-stone-700 text-xs font-bold active-press shrink-0 border border-stone-200/60"
                    >
                      🕒 Please update ETA
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ATTACHMENT PREVIEW BAR */}
            {attachmentPreview && (
              <div className="px-4 py-2 bg-white border-t border-stone-100 flex items-center gap-3">
                {attachmentType === 'image' ? (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 shrink-0">
                    <img src={attachmentPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="p-2 bg-stone-100 rounded-xl text-stone-600 border border-stone-200">
                    <FileText className="h-6 w-6" />
                  </div>
                )}
                <span className="text-xs text-stone-600 font-bold truncate flex-1">{attachmentFile?.name}</span>
                <button
                  onClick={() => { setAttachmentFile(null); setAttachmentPreview(null); setAttachmentType(null); }}
                  className="p-1 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* INPUT FOOTER OR RESTRICTED BANNERS */}
            {isReadOnlyMode ? (
              <div className="p-4 bg-stone-100 border-t border-stone-200 text-xs flex items-center gap-2 text-stone-600 font-bold">
                <Lock className="h-4 w-4 text-stone-500 shrink-0" />
                <span>This booking has completed or been cancelled. Conversation is in read-only mode.</span>
              </div>
            ) : isBlockedByMe || isBlockedByPartner ? (
              <div className="p-4 bg-rose-50 border-t border-rose-200 text-xs flex items-center justify-between text-rose-800">
                <span className="flex items-center gap-2 font-bold">
                  <Ban className="h-4 w-4 text-rose-600 shrink-0" />
                  {isBlockedByMe ? `You have blocked ${activeConv.partner_name}.` : `Messaging is unavailable for this user.`}
                </span>
                {isBlockedByMe && (
                  <button
                    onClick={handleUnblock}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold active-press shadow-2xs shrink-0"
                  >
                    Unblock
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-stone-200 bg-white flex gap-2 items-center shrink-0">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  ref={fileInputRef}
                  onChange={handleAttachmentSelect}
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-500 hover:text-primary active-press transition-colors shrink-0"
                  title="Attach image or PDF document"
                >
                  {uploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Paperclip className="h-4 w-4" />}
                </button>

                <input
                  type="text"
                  placeholder={activeConv.isDraft ? 'Send your first care message…' : 'Type a message...'}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    handleUserTyping();
                  }}
                  className="flex-1 px-4 py-3.5 rounded-2xl border border-stone-200 outline-none focus:border-primary text-xs bg-stone-50/70 font-medium"
                />

                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachmentFile) || uploadingAttachment}
                  className="p-3.5 bg-primary text-white rounded-2xl hover:bg-emerald-800 active-press transition-colors disabled:opacity-50 shrink-0 shadow-xs"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="text-center text-stone-400 text-xs space-y-3">
            <MessageSquare className="h-12 w-12 mx-auto text-stone-300" />
            <p className="font-bold text-stone-700">Select a booking conversation to start messaging.</p>
          </div>
        )}
      </div>

      {/* EXTENSION REQUEST MODAL */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-sm text-heading">Request Booking Extension</h3>
              <button onClick={() => setShowExtensionModal(false)} className="ml-auto text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-stone-500">Select duration to extend your active childcare session:</p>
            
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 60].map(mins => (
                <button
                  key={mins}
                  onClick={() => setExtensionMinutes(mins)}
                  className={`py-3 rounded-2xl text-xs font-bold border transition-colors ${
                    extensionMinutes === mins 
                      ? 'bg-primary text-white border-primary shadow-xs' 
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  +{mins} mins
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowExtensionModal(false)}
                className="flex-1 py-3 border border-stone-200 rounded-2xl text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestExtensionSubmit}
                disabled={requestingExtension}
                className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 active-press flex items-center justify-center gap-1"
              >
                {requestingExtension ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-sm text-heading">Report User / Conversation</h3>
              <button onClick={() => setShowReportModal(false)} className="ml-auto text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                Reason Category
              </label>
              <select
                value={reportCategory}
                onChange={e => setReportCategory(e.target.value)}
                className="w-full p-3 border border-stone-200 rounded-2xl text-xs outline-none bg-stone-50 font-bold"
              >
                <option value="Harassment">Harassment or Offensive Behavior</option>
                <option value="Off-Platform Payment Request">Off-Platform Payment Request (Scam/Fee Avoidance)</option>
                <option value="Inappropriate Content">Inappropriate Content</option>
                <option value="Unsafe Behavior">Unsafe Childcare Behavior</option>
                <option value="Scam / Fraud">Scam / Fraud</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <textarea
              rows={4}
              placeholder="Provide details to assist our moderation team..."
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              className="w-full p-3.5 border border-stone-200 rounded-2xl text-xs outline-none focus:border-amber-400 resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-3 border border-stone-200 rounded-2xl text-xs font-bold text-stone-600"
              >
                Cancel
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={!reportDetails.trim() || submittingReport}
                className="flex-1 py-3 bg-amber-500 text-white rounded-2xl text-xs font-bold disabled:opacity-50 active-press"
              >
                {submittingReport ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFETY & EMERGENCY MODAL */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
              <div>
                <h3 className="font-display font-black text-sm text-rose-700">Safety & Emergency Assistance</h3>
                <p className="text-[10px] text-stone-500">NestCare Childcare Safety System</p>
              </div>
              <button onClick={() => setShowEmergencyModal(false)} className="ml-auto text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <a
                href="tel:911"
                className="w-full p-4 bg-rose-600 text-white rounded-2xl font-black text-xs flex items-center justify-between active-press hover:bg-rose-700 transition-colors shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Call Emergency Services (911)
                </span>
                <span>›</span>
              </a>

              {activeConv?.partner_phone && (
                <a
                  href={`tel:${activeConv.partner_phone}`}
                  className="w-full p-3.5 border border-stone-200 text-stone-800 rounded-2xl font-bold text-xs flex items-center justify-between hover:bg-stone-50 active-press transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" /> Call {activeConv.partner_name}
                  </span>
                  <span>{activeConv.partner_phone}</span>
                </a>
              )}

              <Link
                href="/support"
                className="w-full p-3.5 border border-stone-200 text-stone-800 rounded-2xl font-bold text-xs flex items-center justify-between hover:bg-stone-50 active-press transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sky-600" /> Contact NestCare Support Center
                </span>
                <span>›</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO & AUDIO CALLING MODAL */}
      {activeCall && currentUser && activeConv && (
        <VideoCallModal
          conversationId={activeConv.id}
          partnerId={activeConv.partner_id}
          partnerName={activeConv.partner_name}
          partnerAvatar={activeConv.partner_avatar}
          currentUser={currentUser}
          callMode={activeCall.callMode}
          isIncoming={activeCall.isIncoming}
          incomingSignal={activeCall.incomingSignal}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}

export function detectTrustSafetyViolations(text: string): { flagged: boolean; reason?: string; category?: 'payment' | 'address' | 'contact' } {
  if (!text) return { flagged: false };
  const lower = text.toLowerCase();

  // 1. Off-Platform Payment Terms
  const paymentKeywords = [
    'cash', 'zelle', 'venmo', 'paypal', 'cashapp', 'cash app', 'wire transfer',
    'etransfer', 'e-transfer', 'pay outside', 'pay offline', 'direct pay', 'bank transfer',
    'interac', 'crypto', 'bitcoin', 'dollars outside'
  ];

  for (const kw of paymentKeywords) {
    if (lower.includes(kw)) {
      return { flagged: true, reason: `Off-platform payment keyword detected ("${kw}")`, category: 'payment' };
    }
  }

  // 2. Physical Address / Location Patterns (Postal/Zip codes, Street, Ave, Blvd, Rd)
  const postalCodeRegex = /\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b|\b\d{5}(-\d{4})?\b/;
  const streetAddressRegex = /\b\d+\s+([A-Za-z0-9\.]+\s+){1,3}(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|circle|cir|trail|trl)\b/i;

  if (postalCodeRegex.test(text)) {
    return { flagged: true, reason: 'Postal or ZIP code address format detected', category: 'address' };
  }

  if (streetAddressRegex.test(text)) {
    return { flagged: true, reason: 'Street address format detected', category: 'address' };
  }

  // 3. Contact Details (Phone / Email)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?\d{1,2}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;

  if (emailRegex.test(text)) {
    return { flagged: true, reason: 'Email address contact info detected', category: 'contact' };
  }

  if (phoneRegex.test(text.replace(/\s+/g, '')) && text.replace(/\D/g, '').length >= 10) {
    return { flagged: true, reason: 'Phone number contact info detected', category: 'contact' };
  }

  return { flagged: false };
}
