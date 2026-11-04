'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function AdminMessageModerationPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionToast, setActionToast] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : null;
      const res = await fetch(`http://localhost:4000/api/v1/admin/communication/reports${filterStatus !== 'ALL' ? `?status=${filterStatus}` : ''}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data?.data) {
        setReports(data.data);
      }
    } catch (e) {
      console.warn('Failed to load admin message reports:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : null;
      const res = await fetch(`http://localhost:4000/api/v1/admin/communication/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r._id === reportId ? { ...r, status } : r)),
        );
        setActionToast(`Report ${status.toLowerCase()} successfully.`);
        setTimeout(() => setActionToast(null), 3000);
      }
    } catch (err: any) {
      alert(`Error updating report: ${err.message}`);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.reason?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.reportedBy?.fullName?.toLowerCase().includes(q) ||
      r.messageId?.text?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {actionToast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md">
              Trust & Safety
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            Communication & Message Moderation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review reported messages, investigate harassment/spam violations, and take compliance action.
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
        >
          Refresh Queue
        </button>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reports by user or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
      </div>

      {/* Reports Roster */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading reported communications...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Queue is Clear</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No message compliance reports matching the selected filters.
            </p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report._id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    {report.reason}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      report.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : report.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>

                <span className="text-xs text-slate-400">
                  Reported {new Date(report.createdAt).toLocaleDateString()} at{' '}
                  {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Reported Message Excerpt */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Reported Message Content
                </div>
                <p className="text-xs text-slate-800 font-medium italic">
                  "{report.messageId?.text || '[Attachment / Non-text message]'}"
                </p>
              </div>

              {/* Reporter Context */}
              <div className="flex items-center justify-between gap-4 text-xs text-slate-600 flex-wrap">
                <div>
                  <strong>Reported By: </strong>
                  <span>{report.reportedBy?.fullName || 'Anonymous User'} ({report.reportedBy?.email})</span>
                  {report.description && (
                    <div className="text-slate-500 mt-1">
                      <strong>Reporter Note: </strong>{report.description}
                    </div>
                  )}
                </div>

                {report.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveReport(report._id, 'DISMISSED')}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleResolveReport(report._id, 'RESOLVED')}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm"
                    >
                      Take Action & Resolve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
