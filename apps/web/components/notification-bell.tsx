'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  Settings,
  ExternalLink,
  MessageSquare,
  Briefcase,
  FileText,
  CreditCard,
  Star,
  Info,
  Clock,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message?: string;
  body?: string;
  link?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  };

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('bc_access_token');
  };

  // Fetch initial notifications and unread count
  const fetchNotifications = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${getApiUrl()}/notifications?limit=8`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const items = data.notifications || data.items || [];
        setNotifications(items);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Connect to Socket.IO for real-time notifications
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    fetchNotifications();

    const socketUrl = getApiUrl().replace('/api/v1', '');
    const socket = io(`${socketUrl}/messaging`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('notification:new', (newNotif: NotificationItem) => {
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n._id !== newNotif._id)]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on('notification:read', (data: { notificationId: string; unreadCount?: number }) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === data.notificationId ? { ...n, isRead: true } : n)),
      );
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      } else {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    socket.on('notification:read-all', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    socket.on('notification:unread-count', (count: number) => {
      setUnreadCount(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(`${getApiUrl()}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(`${getApiUrl()}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      handleMarkAsRead(item._id);
    }
    setIsOpen(false);
    const targetUrl = item.actionUrl || item.link;
    if (targetUrl) {
      router.push(targetUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('APPLICATION') || type.includes('REQUIREMENT')) {
      return <FileText className="w-4 h-4 text-indigo-500" />;
    }
    if (type.includes('PROJECT') || type.includes('MILESTONE') || type.includes('TASK')) {
      return <Briefcase className="w-4 h-4 text-cyan-600" />;
    }
    if (type.includes('MESSAGE')) {
      return <MessageSquare className="w-4 h-4 text-emerald-500" />;
    }
    if (type.includes('PAYMENT') || type.includes('PAYOUT') || type.includes('REFUND')) {
      return <CreditCard className="w-4 h-4 text-amber-500" />;
    }
    if (type.includes('REVIEW')) {
      return <Star className="w-4 h-4 text-purple-500" />;
    }
    return <Info className="w-4 h-4 text-slate-500" />;
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffSecs = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return past.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-indigo-600 rounded-full ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <Link
                href="/settings/notifications"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                title="Notification Preferences"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <div className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-slate-600">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  We will alert you when you receive proposals, messages, or payments.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    item.isRead ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
                  }`}
                >
                  {/* Icon badge */}
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs truncate ${
                          item.isRead ? 'font-medium text-slate-800' : 'font-bold text-slate-900'
                        }`}
                      >
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.message || item.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(item.createdAt)}</span>
                      {!item.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(item._id, e)}
                          className="ml-auto text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              View all notifications
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
