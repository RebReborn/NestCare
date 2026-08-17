'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send, ArrowLeft, Loader2, MessageSquare, ShieldCheck,
  Image as ImageIcon, MoreVertical, Flag, Ban, X, AlertCircle,
  CheckCheck, Calendar, ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const newChatSitterId = searchParams.get('newChat');

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const [partnerLastRead, setPartnerLastRead] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // Mobile body class
  useEffect(() => {
    if (activeConv) {
      document.body.classList.add('mobile-chat-active');
    } else {
      document.body.classList.remove('mobile-chat-active');
    }
    return () => document.body.classList.remove('mobile-chat-active');
  }, [activeConv]);

  // Load conversations
  useEffect(() => {
    async function initMessages() {
      try {
        setLoadingConvs(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUser(user);

        const { data: convData } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversation:conversations(
              id,
              booking_id,
              conversation_participants(
                profile:profiles(id, display_name, avatar_url, role),
                last_read_at
              )
            )
          `)
          .eq('profile_id', user.id);

        const mappedConvs = (convData || []).map((c: any) => {
          const conv = c.conversation;
          const otherParticipant = conv.conversation_participants.find(
            (p: any) => p.profile.id !== user.id
          );
          const myParticipant = conv.conversation_participants.find(
            (p: any) => p.profile.id === user.id
          );

          return {
            id: conv.id,
            booking_id: conv.booking_id,
            partner_id: otherParticipant?.profile?.id,
            partner_name: otherParticipant?.profile?.display_name || 'Caregiver',
            partner_avatar: otherParticipant?.profile?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
            partner_role: otherParticipant?.profile?.role || 'sitter',
            partner_last_read: otherParticipant?.last_read_at,
            my_last_read: myParticipant?.last_read_at,
          };
        });

        setConversations(mappedConvs);

        // Handle newChat init
        if (newChatSitterId) {
          const existing = mappedConvs.find(c => c.partner_id === newChatSitterId);
          if (existing) {
            setActiveConv(existing);
          } else {
            const { data: sitterProf } = await supabase
              .from('profiles')
              .select('display_name, avatar_url, role')
              .eq('id', newChatSitterId)
              .single();

            const draftConv = {
              id: `draft-${newChatSitterId}`,
              booking_id: null,
              partner_id: newChatSitterId,
              partner_name: sitterProf?.display_name || 'Caregiver',
              partner_avatar: sitterProf?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
              partner_role: sitterProf?.role || 'sitter',
              isDraft: true,
            };

            setConversations(prev => [draftConv, ...prev.filter(c => c.id !== draftConv.id)]);
            setActiveConv(draftConv);
          }
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setLoadingConvs(false);
      }
    }
    initMessages();
  }, [newChatSitterId]);

  // Load messages + real-time subscription
  useEffect(() => {
    if (!activeConv || !currentUser) return;
    if (activeConv.isDraft) { setMessages([]); return; }

    let channel: any;

    async function loadMessages() {
      try {
        setLoadingMessages(true);
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConv.id)
          .order('created_at', { ascending: true });

        setMessages(data || []);

        // Mark as read
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', activeConv.id)
          .eq('profile_id', currentUser.id);

        // Fetch partner's last_read_at for read receipts
        const { data: partnerPart } = await supabase
          .from('conversation_participants')
          .select('last_read_at')
          .eq('conversation_id', activeConv.id)
          .neq('profile_id', currentUser.id)
          .maybeSingle();

        setPartnerLastRead(partnerPart?.last_read_at || null);
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();

    // Realtime: new messages
    channel = supabase
      .channel(`room-${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, async (payload) => {
        setMessages(prev => [...prev, payload.new]);
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', activeConv.id)
          .eq('profile_id', currentUser.id);
      })
      // Realtime: partner read receipt updates
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversation_participants',
        filter: `conversation_id=eq.${activeConv.id}`
      }, (payload) => {
        if (payload.new.profile_id !== currentUser.id) {
          setPartnerLastRead(payload.new.last_read_at);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv, currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !imageFile) || !activeConv || !currentUser) return;

    const text = inputText;
    setInputText('');
    const file = imageFile;
    setImageFile(null);
    setImagePreview(null);

    try {
      let conversationId = activeConv.id;

      if (activeConv.isDraft) {
        const { data: newConv, error: newConvErr } = await supabase
          .from('conversations')
          .insert({})
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

      let imageUrl: string | null = null;

      if (file) {
        setSendingImage(true);
        try {
          const ext = file.name.split('.').pop();
          const path = `${currentUser.id}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('message-images').upload(path, file);
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from('message-images').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        } catch (uploadErr) {
          console.warn('Image upload failed:', uploadErr);
          toast.error('Image could not be uploaded. Sending text only.');
        } finally {
          setSendingImage(false);
        }
      }

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: text || (imageUrl ? '' : '📷 Image'),
        image_url: imageUrl || null,
      });

      if (error) throw error;

      // Fire message_digest email notification to partner (non-blocking)
      if (activeConv.partner_id && text) {
        fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'message_digest',
            recipientId: activeConv.partner_id,
            payload: {
              senderName: currentUser.user_metadata?.display_name || 'Someone',
              messagePreview: text.length > 80 ? text.slice(0, 80) + '…' : text,
            },
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message.');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleBlock = async () => {
    if (!currentUser || !activeConv?.partner_id) return;
    try {
      await supabase.from('user_blocks').insert({
        blocker_id: currentUser.id,
        blocked_id: activeConv.partner_id,
      });
      toast.success(`${activeConv.partner_name} has been blocked.`);
      setConversations(prev => prev.filter(c => c.id !== activeConv.id));
      setActiveConv(null);
    } catch (err: any) {
      toast.error('Could not block user. They may already be blocked.');
    }
    setShowMenu(false);
  };

  const handleReport = async () => {
    if (!currentUser || !activeConv?.partner_id || !reportReason.trim()) return;
    try {
      setSubmittingReport(true);
      await supabase.from('user_reports').insert({
        reporter_id: currentUser.id,
        reported_id: activeConv.partner_id,
        reason: reportReason.trim(),
      });
      toast.success('Report submitted. Our moderation team will review it.');
      setShowReportModal(false);
      setReportReason('');
    } catch (err: any) {
      toast.error('Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Determine if a message has been seen by the partner
  const isMessageSeen = (msg: any) => {
    if (!partnerLastRead || msg.sender_id !== currentUser?.id) return false;
    return new Date(msg.created_at) <= new Date(partnerLastRead);
  };

  const isSystemMessage = (msg: any) =>
    !msg.sender_id || msg.content?.startsWith('[SYSTEM]');

  return (
    <div className={`bg-white border border-stone-200 flex shadow-sm overflow-hidden ${
      activeConv ? 'h-screen md:h-[80vh] rounded-none md:rounded-3xl' : 'h-[80vh] rounded-3xl'
    }`}>

      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-stone-200 flex-col ${activeConv ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-stone-100">
          <h2 className="font-display text-lg font-bold text-heading">Messages</h2>
          <p className="text-[10px] text-stone-400 font-medium mt-0.5">Booking-linked conversations</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-stone-50">
          {loadingConvs ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-stone-400 text-xs space-y-2">
              <MessageSquare className="h-8 w-8 mx-auto text-stone-300" />
              <p className="font-semibold">No conversations yet.</p>
              <p className="text-stone-400">Browse sitters and start a conversation from their profile.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConv(conv);
                  setShowMenu(false);
                  setConversations(prev => prev.filter(c => !c.isDraft || c.id === conv.id));
                }}
                className={`w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-stone-50/70 ${
                  activeConv?.id === conv.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <img src={conv.partner_avatar} alt={conv.partner_name} className="w-10 h-10 rounded-xl object-cover" />
                  {conv.isDraft && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-heading truncate flex items-center gap-1">
                    {conv.partner_name}
                    {conv.partner_role === 'sitter' && <ShieldCheck className="h-3 w-3 text-primary shrink-0" />}
                  </h4>
                  <span className="text-[10px] text-stone-400 capitalize">{conv.isDraft ? 'New conversation' : conv.partner_role}</span>
                </div>
                {conv.booking_id && (
                  <Calendar className="h-3.5 w-3.5 text-stone-300 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${!activeConv ? 'hidden md:flex bg-stone-50 items-center justify-center' : 'flex'}`}>
        {activeConv ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-stone-200 flex items-center gap-3 bg-white">
              <button onClick={() => setActiveConv(null)} className="md:hidden p-1 rounded-xl hover:bg-stone-50 active-press">
                <ArrowLeft className="h-5 w-5 text-stone-600" />
              </button>
              <img src={activeConv.partner_avatar} alt={activeConv.partner_name} className="w-9 h-9 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-heading flex items-center gap-1">
                  {activeConv.partner_name}
                  {activeConv.partner_role === 'sitter' && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                </h3>
                <span className="text-[10px] text-stone-400 capitalize block">{activeConv.partner_role}</span>
              </div>

              {/* Overflow menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="p-2 rounded-xl hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-10 z-30 bg-white border border-stone-200 rounded-2xl shadow-lg py-1.5 w-48 animate-fade-in">
                    {activeConv.booking_id && (
                      <a
                        href={`/bookings`}
                        className="w-full px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 flex items-center gap-2"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View Booking
                      </a>
                    )}
                    <button
                      onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 flex items-center gap-2 text-left"
                    >
                      <Flag className="h-3.5 w-3.5" /> Report User
                    </button>
                    <button
                      onClick={handleBlock}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 text-left"
                    >
                      <Ban className="h-3.5 w-3.5" /> Block User
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Context Banner */}
            {activeConv.booking_id && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-800">
                  This conversation is linked to a booking.
                </span>
                <a href="/bookings" className="ml-auto text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                  View <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-stone-50/70 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                messages.map((msg, i) => {
                  if (isSystemMessage(msg)) {
                    return (
                      <div key={msg.id || i} className="flex justify-center">
                        <span className="bg-stone-200/60 text-stone-500 text-[10px] font-semibold px-3 py-1 rounded-full">
                          {msg.content?.replace('[SYSTEM]', '').trim()}
                        </span>
                      </div>
                    );
                  }

                  const isOwn = msg.sender_id === currentUser?.id;
                  const seen = isMessageSeen(msg);
                  const isLast = i === messages.length - 1;

                  return (
                    <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[72%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isOwn
                            ? 'bg-primary text-white rounded-br-none shadow-sm'
                            : 'bg-white text-stone-700 rounded-bl-none border border-stone-200/60 shadow-sm'
                        }`}>
                          {msg.image_url && (
                            <div className="mb-2 rounded-xl overflow-hidden max-w-xs">
                              <img
                                src={msg.image_url}
                                alt="Shared image"
                                className="w-full max-h-52 object-cover"
                              />
                            </div>
                          )}
                          {msg.content && <p>{msg.content}</p>}
                          <span className={`text-[8px] block mt-1.5 text-right ${isOwn ? 'text-white/70' : 'text-stone-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {/* Read receipt — only show on last own message */}
                        {isOwn && isLast && (
                          <div className="flex items-center gap-1 pr-1">
                            <CheckCheck className={`h-3 w-3 ${seen ? 'text-primary' : 'text-stone-400'}`} />
                            <span className={`text-[9px] font-semibold ${seen ? 'text-primary' : 'text-stone-400'}`}>
                              {seen ? 'Seen' : 'Sent'}
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

            {/* Image Preview Bar */}
            {imagePreview && (
              <div className="px-4 py-2 bg-white border-t border-stone-100 flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-stone-200 bg-stone-50">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
                <span className="text-xs text-stone-500 font-medium">{imageFile?.name}</span>
              </div>
            )}

            {/* Input Footer */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-200 bg-white flex gap-2 items-end">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-400 hover:text-primary active-press transition-colors shrink-0"
                title="Attach image"
              >
                {sendingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              </button>
              <input
                type="text"
                placeholder={activeConv.isDraft ? 'Send your first message…' : 'Type your message…'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 outline-none focus:border-primary text-xs bg-bg"
              />
              <button
                type="submit"
                disabled={!inputText.trim() && !imageFile}
                className="p-3 bg-primary text-white rounded-2xl hover:bg-emerald-800 active-press transition-colors disabled:opacity-50 shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="text-center text-stone-400 text-xs space-y-3">
            <MessageSquare className="h-10 w-10 mx-auto text-stone-300" />
            <p className="font-semibold">Select a conversation to start messaging.</p>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-sm text-heading">Report {activeConv?.partner_name}</h3>
              <button onClick={() => setShowReportModal(false)} className="ml-auto text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-stone-500">Describe why you are reporting this user. Our moderation team will review within 24 hours.</p>
            <textarea
              rows={4}
              placeholder="Reason for report..."
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
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
                onClick={handleReport}
                disabled={!reportReason.trim() || submittingReport}
                className="flex-1 py-3 bg-amber-500 text-white rounded-2xl text-xs font-bold disabled:opacity-50 active-press"
              >
                {submittingReport ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
