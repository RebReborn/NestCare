'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Send, ArrowLeft, Loader2, MessageSquare, ShieldCheck, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const newChatSitterId = searchParams.get('newChat');

  // Messaging states
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Toggle body class for full screen mobile chat
  useEffect(() => {
    if (activeConv) {
      document.body.classList.add('mobile-chat-active');
    } else {
      document.body.classList.remove('mobile-chat-active');
    }
    return () => {
      document.body.classList.remove('mobile-chat-active');
    };
  }, [activeConv]);

  // Load user and conversations
  useEffect(() => {
    async function initMessages() {
      try {
        setLoadingConvs(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUser(user);

        // Fetch user conversations
        const { data: convData } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversation:conversations(
              id,
              booking_id,
              conversation_participants(
                profile:profiles(
                  id,
                  display_name,
                  avatar_url,
                  role
                )
              )
            )
          `)
          .eq('profile_id', user.id);

        const mappedConvs = (convData || []).map((c: any) => {
          const conv = c.conversation;
          const otherParticipant = conv.conversation_participants.find(
            (p: any) => p.profile.id !== user.id
          )?.profile;

          return {
            id: conv.id,
            booking_id: conv.booking_id,
            partner_id: otherParticipant?.id,
            partner_name: otherParticipant?.display_name || 'Caregiver',
            partner_avatar: otherParticipant?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
            partner_role: otherParticipant?.role || 'sitter',
          };
        });

        setConversations(mappedConvs);

        // Handle newChat initialization
        if (newChatSitterId) {
          // Check if conversation already exists
          const existing = mappedConvs.find(c => c.partner_id === newChatSitterId);
          if (existing) {
            setActiveConv(existing);
          } else {
            // Fetch details of sitter for draft representation
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

  // Load messages and subscribe to Realtime channel
  useEffect(() => {
    if (!activeConv || !currentUser) return;
    if (activeConv.isDraft) {
      setMessages([]);
      return;
    }

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
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();

    // Subscribe to messages insert events for this conversation
    const channel = supabase
      .channel(`room-${activeConv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConv.id}`
        },
        async (payload) => {
          setMessages((prev) => [...prev, payload.new]);

          // Mark newly arrived message as read immediately
          await supabase
            .from('conversation_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', activeConv.id)
            .eq('profile_id', currentUser.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv, currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv || !currentUser) return;

    const text = inputText;
    setInputText('');

    try {
      let conversationId = activeConv.id;

      if (activeConv.isDraft) {
        // Create conversation in DB
        const { data: newConv, error: newConvErr } = await supabase
          .from('conversations')
          .insert({})
          .select()
          .single();

        if (newConvErr) throw newConvErr;

        // Add participants
        const { error: partErr } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: newConv.id, profile_id: currentUser.id },
            { conversation_id: newConv.id, profile_id: activeConv.partner_id }
          ]);

        if (partErr) throw partErr;

        conversationId = newConv.id;

        // Update conversation entry in state
        const updatedConv = {
          ...activeConv,
          id: newConv.id,
          isDraft: false,
        };

        setConversations(prev => 
          prev.map(c => c.id === activeConv.id ? updatedConv : c)
        );
        setActiveConv(updatedConv);
      }

      // Insert message
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: text,
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className={`bg-white border border-stone-200 flex shadow-sm overflow-hidden ${
      activeConv ? 'h-screen md:h-[80vh] rounded-none md:rounded-3xl' : 'h-[80vh] rounded-3xl'
    }`}>
      {/* Sidebar - Conversations list */}
      <div className={`w-full md:w-80 border-r border-stone-200 flex-col ${activeConv ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-stone-100">
          <h2 className="font-display text-lg font-bold text-heading">Chats</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-stone-50">
          {loadingConvs ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-stone-400 text-xs">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-stone-300" />
              No conversations active. Search sitters to start chatting.
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConv(conv);
                  setConversations(prev => prev.filter(c => !c.isDraft || c.id === conv.id));
                }}
                className={`w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-stone-50/70 ${
                  activeConv?.id === conv.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                }`}
              >
                <img src={conv.partner_avatar} alt={conv.partner_name} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-heading truncate flex items-center gap-1">
                    {conv.partner_name}
                    {conv.partner_role === 'sitter' && (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    )}
                  </h4>
                  <span className="text-[10px] text-stone-400 capitalize">{conv.partner_role}</span>
                </div>
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
              <div>
                <h3 className="font-bold text-sm text-heading">{activeConv.partner_name}</h3>
                <span className="text-[10px] text-stone-400 block capitalize">{activeConv.partner_role}</span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-stone-50 space-y-3.5">
              {loadingMessages ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isOwn
                            ? 'bg-primary text-white rounded-br-none shadow-sm'
                            : 'bg-white text-stone-700 rounded-bl-none border border-stone-200/60 shadow-sm'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span className={`text-[8px] block mt-1.5 text-right ${isOwn ? 'text-white/70' : 'text-stone-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-200 bg-white flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 outline-none focus:border-primary text-xs bg-bg"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-3 bg-primary text-white rounded-2xl hover:bg-emerald-800 active-press transition-colors disabled:opacity-50"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="text-center text-stone-400 text-xs">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-stone-300" />
            Select a conversation to start messaging.
          </div>
        )}
      </div>
    </div>
  );
}
