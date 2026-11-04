'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  Search,
  Settings,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Briefcase,
  FileText,
  CreditCard,
  Star,
  Info,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  };

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('bc_access_token');
  };

  const fetchNotifications = async (currentPage = page, tab = activeTab, search = searchQuery) => {
    const token = getAuthToken();
    if (!token) {
      setError('Please log in to view your notifications.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '15');

      if (tab === 'UNREAD') {
        params.set('isRead', 'false');
      } else if (tab !== 'ALL') {
        // Filter by category prefix
        params.set('type', tab);
      }

      if (search.trim()) {
        params.set('search', search.trim());
      }

      const res = await fetch(`${getApiUrl()}/notifications?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch notifications: HTTP ${res.status}`);
      }

      const json = await res.json();
      const data = json.data || json;
      const items = data.notifications || data.items || [];

      setNotifications(items);
      setTotal(data.total || items.length);
      setTotalPages(data.totalPages || 1);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (err: any) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1, activeTab, searchQuery);
    setPage(1);
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotifications(1, activeTab, searchQuery);
    setPage(1);
  };

  const handleMarkAsRead = async (id: string) => {
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
      console.warn('Failed to mark notification read:', err);
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

  const getNotificationIcon = (type: string) => {
    if (type.includes('APPLICATION') || type.includes('REQUIREMENT')) {
      return <FileText className="w-5 h-5 text-indigo-600" />;
    }
    if (type.includes('PROJECT') || type.includes('MILESTONE') || type.includes('TASK')) {
      return <Briefcase className="w-5 h-5 text-cyan-600" />;
    }
    if (type.includes('MESSAGE')) {
      return <MessageSquare className="w-5 h-5 text-emerald-600" />;
    }
    if (type.includes('PAYMENT') || type.includes('PAYOUT') || type.includes('REFUND')) {
      return <CreditCard className="w-5 h-5 text-amber-600" />;
    }
    if (type.includes('REVIEW')) {
      return <Star className="w-5 h-5 text-purple-600" />;
    }
    return <Info className="w-5 h-5 text-slate-600" />;
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
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
                <Bell className="w-3.5 h-3.5" />
                <span>Notification Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Activity & Alerts
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Stay updated with milestone approvals, proposals, messages, and secure payments.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm transition-all"
                >
                  <CheckCheck className="w-4 h-4 text-indigo-600" />
                  Mark all as read
                </button>
              )}
              <Link
                href="/settings/notifications"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Settings className="w-4 h-4" />
                Preferences
              </Link>
            </div>
          </div>

          {/* Filter Tabs & Search */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'UNREAD', label: `Unread (${unreadCount})` },
                { id: 'APPLICATION_RECEIVED', label: 'Applications' },
                { id: 'PROJECT_CREATED', label: 'Projects' },
                { id: 'NEW_MESSAGE', label: 'Messages' },
                { id: 'PAYMENT_SUCCESS', label: 'Payments' },
                { id: 'REVIEW_RECEIVED', label: 'Reviews' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </form>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center">
              <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-600">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center">
              <p className="text-sm font-semibold text-rose-600 mb-2">{error}</p>
              <button
                onClick={() => fetchNotifications(page, activeTab, searchQuery)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center shadow-gemini-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No notifications found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {activeTab === 'UNREAD'
                  ? "You're all caught up! You have no unread notifications right now."
                  : 'Notifications regarding your proposals, projects, messages, and payments will appear here.'}
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const actionUrl = notif.actionUrl || notif.link;
              return (
                <div
                  key={notif._id}
                  className={`group relative rounded-2xl p-5 border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    notif.isRead
                      ? 'bg-white border-slate-200/80 hover:border-slate-300 shadow-gemini-sm'
                      : 'bg-indigo-50/30 border-indigo-200/80 hover:border-indigo-300 shadow-gemini-sm ring-1 ring-indigo-500/10'
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Icon */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        notif.isRead ? 'bg-slate-100' : 'bg-white shadow-sm ring-1 ring-slate-100'
                      }`}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Texts */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-sm ${
                            notif.isRead ? 'font-semibold text-slate-800' : 'font-extrabold text-slate-900'
                          }`}
                        >
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        {notif.message || notif.body}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-[10px] uppercase text-slate-400">
                          {notif.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif._id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {actionUrl && (
                      <button
                        onClick={() => {
                          if (!notif.isRead) handleMarkAsRead(notif._id);
                          router.push(actionUrl);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm transition-all"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500">
              Page {page} of {totalPages} ({total} notifications)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const nextP = Math.max(1, page - 1);
                  setPage(nextP);
                  fetchNotifications(nextP, activeTab, searchQuery);
                }}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const nextP = Math.min(totalPages, page + 1);
                  setPage(nextP);
                  fetchNotifications(nextP, activeTab, searchQuery);
                }}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
