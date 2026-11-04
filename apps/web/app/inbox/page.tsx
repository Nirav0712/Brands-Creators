'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  ArrowLeft,
  Briefcase,
  ExternalLink,
  ShieldAlert,
  Archive,
  BellOff,
  Bell,
  Trash2,
  Edit2,
  Reply,
  X,
  FileText,
  Image as ImageIcon,
  User,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { io, Socket } from 'socket.io-client';

interface Participant {
  userId: {
    _id: string;
    fullName: string;
    email: string;
    username: string;
    avatarUrl?: string;
    roles?: string[];
  };
  role: string;
  joinedAt: string;
  lastReadAt?: string;
  muted?: boolean;
  archived?: boolean;
}

interface ConversationItem {
  _id: string;
  type: 'DIRECT' | 'APPLICATION' | 'PROJECT' | 'GROUP';
  title?: string;
  avatar?: string;
  participants: Participant[];
  createdBy: string;
  requirementId?: {
    _id: string;
    title: string;
    budget?: { min: number; max: number; currency: string };
    slug: string;
    status: string;
  };
  applicationId?: {
    _id: string;
    status: string;
    offeredPrice?: number;
    currency?: string;
  };
  lastMessageId?: {
    _id: string;
    text: string;
    senderId: string;
    createdAt: string;
    status: string;
  };
  lastMessageAt?: string;
  lastMessagePreview?: string;
  messageCount: number;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  otherParticipant?: {
    _id: string;
    fullName: string;
    email: string;
    username: string;
    avatarUrl?: string;
    roles?: string[];
  };
  updatedAt: string;
}

interface MessageItem {
  _id: string;
  conversationId: string;
  senderId: {
    _id: string;
    fullName: string;
    email?: string;
    avatarUrl?: string;
  };
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'LINK' | 'SYSTEM';
  text: string;
  attachments?: Array<{
    url: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    type?: string;
  }>;
  replyToMessageId?: {
    _id: string;
    text: string;
    senderId: string;
  };
  status: 'SENT' | 'DELIVERED' | 'READ' | 'DELETED' | 'EDITED';
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
}

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialConversationId = searchParams.get('conversationId');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'APPLICATION' | 'PROJECT' | 'DIRECT' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageItem | null>(null);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('SPAM');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [mobileViewActive, setMobileViewActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load current user profile from localStorage or API
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const stored = localStorage.getItem('bc_user');
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        }
        const res = await apiClient('/auth/me');
        if (res?.data) {
          setCurrentUser(res.data);
          localStorage.setItem('bc_user', JSON.stringify(res.data));
        }
      } catch (e) {
        console.warn('Auth check in inbox:', e);
      }
    };
    loadCurrentUser();
  }, []);

  // Initialize Socket.io connection for realtime messaging
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bc_access_token') : null;
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
    const socket = io(`${socketUrl}/messaging`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected to messaging namespace');
    });

    socket.on('message:new', (newMsg: MessageItem) => {
      if (newMsg.conversationId === activeConversation?._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
      }
      // Refresh conversation list to update last message & unread count
      fetchConversations();
    });

    socket.on('message:updated', (updatedMsg: MessageItem) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? { ...m, ...updatedMsg } : m)),
      );
    });

    socket.on('message:deleted', (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId
            ? { ...m, status: 'DELETED', text: 'This message was deleted', attachments: [] }
            : m,
        ),
      );
    });

    socket.on('typing:status', (data: { conversationId: string; isTyping: boolean }) => {
      if (data.conversationId === activeConversation?._id) {
        setOtherUserTyping(data.isTyping);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [activeConversation?._id]);

  // Fetch conversations list
  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await apiClient('/conversations', {
        params: {
          status: filterTab === 'ALL' ? undefined : filterTab,
          search: searchQuery || undefined,
        },
      });

      if (res?.data?.items) {
        setConversations(res.data.items);

        // Auto-select initial conversation if query parameter is present
        if (initialConversationId && !activeConversation) {
          const found = res.data.items.find((c: ConversationItem) => c._id === initialConversationId);
          if (found) {
            selectConversation(found);
          } else {
            // Load by ID directly
            fetchSingleConversation(initialConversationId);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [filterTab, searchQuery]);

  const fetchSingleConversation = async (id: string) => {
    try {
      const res = await apiClient(`/conversations/${id}`);
      if (res?.data) {
        setActiveConversation(res.data);
        setMobileViewActive(true);
        loadMessages(id);
      }
    } catch (e) {
      console.warn('Could not load specific conversation:', e);
    }
  };

  const selectConversation = (conv: ConversationItem) => {
    setActiveConversation(conv);
    setMobileViewActive(true);
    setReplyingTo(null);
    setEditingMessage(null);
    loadMessages(conv._id);

    // Join socket room
    if (socketRef.current) {
      socketRef.current.emit('conversation:join', { conversationId: conv._id });
    }

    // Mark conversation as read
    apiClient(`/conversations/${conv._id}/read`, { method: 'POST' }).catch(console.warn);

    // Update unread badge locally
    setConversations((prev) =>
      prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c)),
    );
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const res = await apiClient(`/conversations/${conversationId}/messages`, {
        params: { limit: 50 },
      });
      if (res?.data?.items) {
        setMessages(res.data.items);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // Handle typing debounce
  const handleTyping = (text: string) => {
    setMessageText(text);
    if (!socketRef.current || !activeConversation) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing:start', { conversationId: activeConversation._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('typing:stop', { conversationId: activeConversation._id });
    }, 2000);
  };

  // Send or Edit message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation || sending) return;

    try {
      setSending(true);

      if (editingMessage) {
        // Edit existing message
        const res = await apiClient(`/messages/${editingMessage._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ text: messageText.trim() }),
        });

        if (res?.data) {
          setMessages((prev) =>
            prev.map((m) => (m._id === editingMessage._id ? res.data : m)),
          );
        }
        setEditingMessage(null);
      } else {
        // Send new message
        const payload: any = {
          text: messageText.trim(),
          messageType: 'TEXT',
        };

        if (replyingTo) {
          payload.replyToMessageId = replyingTo._id;
        }

        const res = await apiClient(`/conversations/${activeConversation._id}/messages`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res?.data) {
          setMessages((prev) => [...prev, res.data]);
        }
        setReplyingTo(null);
      }

      setMessageText('');
      fetchConversations();
    } catch (err: any) {
      alert(`Error sending message: ${err?.message || 'Failed'}`);
    } finally {
      setSending(false);
    }
  };

  // Soft delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await apiClient(`/messages/${messageId}`, { method: 'DELETE' });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, status: 'DELETED', text: 'This message was deleted', attachments: [] }
            : m,
        ),
      );
    } catch (err: any) {
      alert(`Could not delete message: ${err?.message}`);
    }
  };

  // Submit report to admin moderation
  const handleSubmitReport = async () => {
    if (!reportingMessageId) return;
    try {
      await apiClient(`/messages/${reportingMessageId}/report`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reportReason,
          description: reportDescription,
        }),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSuccess(false);
        setReportingMessageId(null);
        setReportDescription('');
      }, 1500);
    } catch (err: any) {
      alert(`Failed to submit report: ${err?.message}`);
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 h-[calc(100vh-5rem)] flex flex-col">
      {/* Main Inbox Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* ========================================================================= */}
        {/* LEFT PANE: CONVERSATION LIST & FILTERS                                     */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 ${
            mobileViewActive ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Search */}
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Messages
              </h1>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                {conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)} unread
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 border-b border-slate-200 bg-white flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'UNREAD', label: 'Unread' },
              { id: 'APPLICATION', label: 'Applications' },
              { id: 'DIRECT', label: 'Direct' },
              { id: 'ARCHIVED', label: 'Archived' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConversations ? (
              <div className="p-6 text-center space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-white rounded-xl">
                    <div className="w-10 h-10 bg-slate-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-slate-200 rounded w-1/2" />
                      <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No conversations found</p>
                <p className="text-xs text-slate-500">
                  {searchQuery ? 'Try another search query.' : 'Apply to opportunities or review applicants to start messaging.'}
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConversation?._id === conv._id;
                const other = conv.otherParticipant;
                const partnerName = other?.fullName || conv.title || 'Platform Member';
                const roleBadge = other?.roles?.[0] || 'Member';

                return (
                  <button
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors border-l-4 ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-600'
                        : conv.unreadCount > 0
                        ? 'bg-white font-semibold border-indigo-400 hover:bg-slate-100/70'
                        : 'bg-white hover:bg-slate-50 border-transparent text-slate-600'
                    }`}
                  >
                    {/* Counterparty Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden">
                        {other?.avatarUrl ? (
                          <img src={other.avatarUrl} alt={partnerName} className="w-full h-full object-cover" />
                        ) : (
                          partnerName.charAt(0).toUpperCase()
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center border-2 border-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Content snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {partnerName}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatTimestamp(conv.lastMessageAt || conv.updatedAt)}
                        </span>
                      </div>

                      {/* Role & Context tags */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {roleBadge}
                        </span>
                        {conv.requirementId && (
                          <span className="text-[10px] text-indigo-600 font-medium truncate flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {conv.requirementId.title}
                          </span>
                        )}
                      </div>

                      {/* Last Message Preview */}
                      <p className="text-xs text-slate-500 truncate">
                        {conv.lastMessagePreview || 'Conversation started.'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANE: ACTIVE CONVERSATION THREAD                                    */}
        {/* ========================================================================= */}
        <div
          className={`flex-1 flex flex-col bg-white ${
            !mobileViewActive ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Active Conversation Top Bar */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-white/90 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileViewActive(false)}
                    className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {activeConversation.otherParticipant?.avatarUrl ? (
                      <img
                        src={activeConversation.otherParticipant.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      (activeConversation.otherParticipant?.fullName || 'U').charAt(0)
                    )}
                  </div>

                  {/* Title & Status */}
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 truncate">
                      {activeConversation.otherParticipant?.fullName || activeConversation.title}
                    </h2>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Active Member • {activeConversation.otherParticipant?.roles?.[0] || 'Collaborator'}
                    </p>
                  </div>
                </div>

                {/* Requirement / Application Context Badge */}
                <div className="flex items-center gap-2">
                  {activeConversation.requirementId && (
                    <a
                      href={`/requirements/${activeConversation.requirementId.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span className="max-w-[140px] truncate">{activeConversation.requirementId.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                    Loading conversation history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Start the conversation</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Discuss campaign deliverables, timelines, rates, and collaboration requirements securely.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe =
                      (msg.senderId?._id || msg.senderId)?.toString() ===
                      (currentUser?._id || currentUser?.id)?.toString();
                    const isDeleted = msg.status === 'DELETED';

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {/* Message Bubble Container */}
                        <div className="group relative max-w-[85%] sm:max-w-md">
                          {/* Referencing reply bubble */}
                          {msg.replyToMessageId && (
                            <div
                              className={`text-[11px] px-3 py-1.5 rounded-t-xl mb-0.5 border-l-2 ${
                                isMe
                                  ? 'bg-indigo-700/70 text-indigo-100 border-white'
                                  : 'bg-slate-200/80 text-slate-600 border-indigo-500'
                              }`}
                            >
                              <span className="font-semibold block">Replying:</span>
                              <span className="truncate block opacity-90">
                                {msg.replyToMessageId.text}
                              </span>
                            </div>
                          )}

                          {/* Bubble Body */}
                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-br-xs'
                                : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                            } ${isDeleted ? 'italic opacity-60 bg-slate-100 text-slate-500 border-dashed' : ''}`}
                          >
                            {msg.text}

                            {/* Attachments preview */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold ${
                                      isMe
                                        ? 'bg-indigo-700/60 text-white hover:bg-indigo-700'
                                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                    }`}
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span className="truncate flex-1">{att.fileName}</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Timestamp & Status Indicator */}
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                isMe ? 'text-indigo-200' : 'text-slate-400'
                              }`}
                            >
                              {msg.status === 'EDITED' && <span className="italic mr-1">(edited)</span>}
                              <span>{formatTimestamp(msg.createdAt)}</span>
                              {isMe && !isDeleted && (
                                <>
                                  {msg.status === 'READ' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-indigo-300" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Hover action bar (Reply, Edit, Delete, Report) */}
                          {!isDeleted && (
                            <div
                              className={`absolute top-0 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-md z-10 ${
                                isMe ? 'right-full mr-2' : 'left-full ml-2'
                              }`}
                            >
                              <button
                                onClick={() => setReplyingTo(msg)}
                                title="Reply"
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              {isMe ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setMessageText(msg.text);
                                    }}
                                    title="Edit"
                                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(msg._id)}
                                    title="Delete"
                                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setReportingMessageId(msg._id);
                                    setReportModalOpen(true);
                                  }}
                                  title="Report"
                                  className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Other user typing indicator */}
                {otherUserTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 italic py-1">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200" />
                    </span>
                    {activeConversation.otherParticipant?.fullName || 'Collaborator'} is typing...
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Reply / Edit Banner */}
              {(replyingTo || editingMessage) && (
                <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
                  <div className="flex items-center gap-2 truncate">
                    {editingMessage ? (
                      <>
                        <Edit2 className="w-4 h-4 text-indigo-600" />
                        <span>Editing message: </span>
                        <span className="font-semibold truncate">{editingMessage.text}</span>
                      </>
                    ) : (
                      <>
                        <Reply className="w-4 h-4 text-indigo-600" />
                        <span>Replying to {replyingTo?.senderId?.fullName}: </span>
                        <span className="font-semibold truncate">{replyingTo?.text}</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setEditingMessage(null);
                      setMessageText('');
                    }}
                    className="p-1 text-indigo-600 hover:bg-indigo-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Message Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-end gap-2"
              >
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex items-end">
                  <textarea
                    rows={1}
                    value={messageText}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Write a message... (Press Enter to send)"
                    className="w-full p-3 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-sm transition-all flex-shrink-0 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Select a conversation</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-6">
                Choose a conversation from the list to collaborate, review terms, and finalize campaign deliverables.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REPORT INAPPROPRIATE MESSAGE                                       */}
      {/* ========================================================================= */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Report Message
              </h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-900">Report Submitted</p>
                <p className="text-xs text-slate-500">Our trust & safety team will review this message promptly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="SPAM">Spam or Unsolicited Promotion</option>
                    <option value="HARASSMENT">Harassment or Abusive Behavior</option>
                    <option value="FRAUD">Fraud or Deceptive Proposal</option>
                    <option value="SCAM">Scam or Financial Extortion</option>
                    <option value="INAPPROPRIATE">Inappropriate Content</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional details (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Provide any helpful context..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  >
                    Submit Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-xs text-slate-400">Loading inbox...</div>}>
      <InboxContent />
    </Suspense>
  );
}
