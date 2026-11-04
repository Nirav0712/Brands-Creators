'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  RotateCcw,
  ShieldAlert,
  Server,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Megaphone,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface DeliveryMetrics {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  deadLetter: number;
  providerConfigured: boolean;
}

interface DeliveryJob {
  _id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  template: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'DEAD_LETTER';
  attempts: number;
  maxAttempts: number;
  error?: string;
  providerMessageId?: string;
  nextAttemptAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function AdminDeliveriesPage() {
  const [metrics, setMetrics] = useState<DeliveryMetrics>({
    total: 0,
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    deadLetter: 0,
    providerConfigured: false,
  });

  const [deliveries, setDeliveries] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Modals
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementRole, setAnnouncementRole] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [announcementResult, setAnnouncementResult] = useState<string | null>(null);
  const [processingQueue, setProcessingQueue] = useState(false);

  const handleProcessQueue = async () => {
    try {
      setProcessingQueue(true);
      const res = await apiClient.post('/admin/notifications/queue/process?limit=25', {});
      const pData = res.data?.data || res.data;
      alert(`Queue sweep complete: ${pData.processed} jobs claimed (${pData.success} delivered, ${pData.failed} failed)`);
      await fetchData();
    } catch (err: any) {
      alert(`Queue sweep failed: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessingQueue(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const [metricsRes, deliveriesRes] = await Promise.all([
        apiClient.get('/admin/notifications/metrics').catch(() => ({ data: null })),
        apiClient.get(`/admin/notifications/deliveries?${params.toString()}`).catch(() => ({ data: null })),
      ]);

      if (metricsRes?.data) {
        const mData = metricsRes.data.data || metricsRes.data;
        setMetrics(mData);
      }

      if (deliveriesRes?.data) {
        const dData = deliveriesRes.data.data || deliveriesRes.data;
        setDeliveries(dData.items || []);
        setTotalPages(dData.totalPages || 1);
        setTotalItems(dData.total || 0);
      }
    } catch (err) {
      console.error('Error fetching delivery queue data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      setRetryingId(jobId);
      await apiClient.post(`/admin/notifications/deliveries/${jobId}/retry`, {});
      await fetchData();
    } catch (err: any) {
      alert(`Retry failed: ${err.message || 'Unknown error'}`);
    } finally {
      setRetryingId(null);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo) return;

    try {
      setTestEmailSending(true);
      setTestEmailResult(null);
      const res = await apiClient.post('/admin/notifications/test-email', {
        to: testEmailTo,
        subject: 'Brands & Creators — Operational Verification Test',
        message: 'This confirms email delivery routing and template parsing are operational.',
      });
      const resultData = res.data?.data || res.data;
      setTestEmailResult(`Success! Message ID: ${resultData.messageId || 'Generated'}`);
      fetchData();
    } catch (err: any) {
      setTestEmailResult(`Failed: ${err.message || 'Error sending test email'}`);
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementMessage) return;

    try {
      setAnnouncementSending(true);
      setAnnouncementResult(null);
      const res = await apiClient.post('/admin/notifications/announcement', {
        title: announcementTitle,
        message: announcementMessage,
        targetRole: announcementRole || undefined,
      });
      const resultData = res.data?.data || res.data;
      setAnnouncementResult(`Announcement dispatched to ${resultData.sent || 0} users.`);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      fetchData();
    } catch (err: any) {
      setAnnouncementResult(`Failed: ${err.message || 'Error broadcasting'}`);
    } finally {
      setAnnouncementSending(false);
    }
  };

  const getStatusBadge = (status: string, job?: any) => {
    const isSimulated =
      job?.isSimulated === true ||
      job?.metadata?.simulated === true ||
      job?.providerMessageId?.startsWith('sim_');

    switch (status) {
      case 'SENT':
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3 h-3" /> SENT
            </span>
            {isSimulated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Sandbox Mode
              </span>
            )}
          </div>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> PROCESSING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3 h-3" /> FAILED
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900 text-white">
            <XCircle className="w-3 h-3" /> DEAD LETTER
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
              Phase 07
            </span>
            <span className="text-xs font-semibold text-slate-400">Governance & System Alerts</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-indigo-600" />
            Email & Notification Deliveries
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect durable background delivery jobs, failure backoffs, and real-time dispatch health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTestEmailOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5 text-indigo-600" />
            Test Delivery
          </button>
          <button
            onClick={() => setAnnouncementOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Megaphone className="w-3.5 h-3.5" />
            Announcement
          </button>
          <button
            onClick={handleProcessQueue}
            disabled={processingQueue}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50"
            title="Execute queue worker processing sweep"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${processingQueue ? 'animate-spin' : ''}`} />
            {processingQueue ? 'Processing...' : 'Process Queue'}
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Dispatched
          </span>
          <span className="text-2xl font-black text-slate-900">{metrics.total}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
            Pending Queue
          </span>
          <span className="text-2xl font-black text-amber-600">{metrics.pending}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">
            In Processing
          </span>
          <span className="text-2xl font-black text-indigo-600">{metrics.processing}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">
            Successfully Sent
          </span>
          <span className="text-2xl font-black text-emerald-600">{metrics.sent}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-1">
            Failed Retrying
          </span>
          <span className="text-2xl font-black text-rose-600">{metrics.failed}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Dead Letter
          </span>
          <span className="text-2xl font-black text-slate-800">{metrics.deadLetter}</span>
        </div>
      </div>

      {/* Provider Status Alert */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              metrics.providerConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Delivery Transport Provider:</span>
              <span className="font-mono text-slate-600">
                {metrics.providerConfigured ? 'SMTP Live Gateway' : 'Fallback Sandbox Mode'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {metrics.providerConfigured
                ? 'All transactional emails are actively dispatched via authenticated SMTP host.'
                : 'SMTP credentials not configured in environment. Operating in sandbox logging mode.'}
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-400">Durable MongoDB Queue</div>
      </div>

      {/* Filters & Search Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
            {['ALL', 'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </form>
        </div>

        {/* Deliveries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-5">Recipient</th>
                <th className="py-3 px-5">Subject / Template</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Attempts</th>
                <th className="py-3 px-5">Created</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading delivery records...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No delivery jobs matching query criteria.
                  </td>
                </tr>
              ) : (
                deliveries.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      <div>{job.recipientEmail}</div>
                      {job.recipientName && (
                        <div className="text-[10px] text-slate-400">{job.recipientName}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-slate-800 line-clamp-1">{job.subject}</div>
                      <div className="text-[10px] font-mono text-slate-400">{job.template}</div>
                    </td>
                    <td className="py-3.5 px-5">{getStatusBadge(job.status, job)}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-600">
                      {job.attempts} / {job.maxAttempts}
                      {job.error && (
                        <div className="text-[10px] text-rose-500 font-sans line-clamp-1 mt-0.5" title={job.error}>
                          {job.error}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-slate-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {(job.status === 'FAILED' || job.status === 'DEAD_LETTER') && (
                        <button
                          onClick={() => handleRetryJob(job._id)}
                          disabled={retryingId === job._id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-all disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} ({totalItems} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test Email Modal */}
      {testEmailOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Send Test Email</h3>
            <p className="text-xs text-slate-500 mb-4">
              Dispatch an operational verification email to test provider SMTP connection.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {testEmailResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    testEmailResult.startsWith('Success')
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  {testEmailResult}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTestEmailOpen(false);
                    setTestEmailResult(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testEmailSending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {testEmailSending ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {announcementOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Broadcast Announcement</h3>
            <p className="text-xs text-slate-500 mb-4">
              Send a trusted platform announcement notification to users across in-app and email.
            </p>

            <form onSubmit={handleSendAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={announcementRole}
                  onChange={(e) => setAnnouncementRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">All Users (Brands, Creators & Production Teams)</option>
                  <option value="CREATOR">Creators Only</option>
                  <option value="BRAND">Brands Only</option>
                  <option value="PRODUCTION_TEAM">Production Teams Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Platform Upgrade"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter the announcement message to display in notifications..."
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {announcementResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    announcementResult.startsWith('Announcement')
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  {announcementResult}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAnnouncementOpen(false);
                    setAnnouncementResult(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={announcementSending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {announcementSending ? 'Broadcasting...' : 'Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
