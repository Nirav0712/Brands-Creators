'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Instagram,
  Youtube,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileCheck,
  MessageSquare,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface VerificationCreator {
  _id: string;
  userId?: {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    avatarUrl?: string;
    phone?: string;
  };
  slug: string;
  primaryCategoryId?: {
    _id: string;
    name: string;
    slug: string;
  };
  verificationStatus: string;
  verificationRequestedAt?: string;
  verificationNotes?: string;
  portfolioCount?: number;
  socialAccounts?: Array<{
    _id: string;
    platform: string;
    handle: string;
    url: string;
    metrics?: {
      followersCount?: number;
      subscribersCount?: number;
      engagementRate?: number;
    };
  }>;
}

export default function AdminVerificationQueuePage() {
  const [queue, setQueue] = useState<VerificationCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<{ id: string; name: string; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/admin/verification-queue');
      const items = res?.data !== undefined ? res.data : res;
      setQueue(Array.isArray(items) ? items : []);
    } catch (err: any) {
      console.warn('Failed to fetch verification queue:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT', notes?: string) => {
    setActionLoading(id);
    setStatusMessage(null);
    try {
      const status = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';
      await apiClient.post(`/admin/creators/${id}/verify`, {
        status,
        notes: notes || undefined,
      });

      setQueue((prev) => prev.filter((item) => item._id !== id));
      setStatusMessage({
        type: 'success',
        text: `Creator has been successfully ${action === 'APPROVE' ? 'verified with Pro Badge' : 'rejected'}.`,
      });
      setNotesModal(null);
      setAdminNotes('');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to update creator verification status.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Trust & Safety Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Creator Verification Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time queue connected to MongoDB Atlas. Review authenticated identity credentials and linked channels before issuing Verified Pro badges.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          Refresh Live Queue
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] underline font-bold hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-gemini-sm">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <h3 className="font-bold text-sm text-slate-900">Loading Real-Time Verification Records...</h3>
            <p className="text-xs text-slate-500 mt-1">Connecting to live MongoDB Atlas replica set.</p>
          </div>
        ) : queue.length > 0 ? (
          queue.map((item) => {
            const userName = item.userId?.fullName || 'Creator Talent';
            const userHandle = item.userId?.username ? `@${item.userId.username}` : `@${item.slug}`;
            const category = item.primaryCategoryId?.name || 'Content Creation';
            const avatar =
              item.userId?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
            const isProcessing = actionLoading === item._id;

            return (
              <div
                key={item._id}
                className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-gemini-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={avatar}
                    alt={userName}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-slate-900">{userName}</h3>
                      <span className="text-xs text-indigo-600 font-semibold">{userHandle}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        {item.verificationStatus}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-slate-600">{category}</div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span>{item.portfolioCount ?? 0} Portfolio Items</span>
                      <span>•</span>
                      <span>Email: <strong className="text-slate-700">{item.userId?.email || 'N/A'}</strong></span>
                      {item.userId?.phone && (
                        <>
                          <span>•</span>
                          <span>Phone: {item.userId.phone}</span>
                        </>
                      )}
                    </div>

                    {/* Connected Social Accounts */}
                    {item.socialAccounts && item.socialAccounts.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {item.socialAccounts.map((acc) => (
                          <a
                            key={acc._id}
                            href={acc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                          >
                            {acc.platform.toLowerCase() === 'instagram' ? (
                              <Instagram className="w-3.5 h-3.5 text-pink-500" />
                            ) : acc.platform.toLowerCase() === 'youtube' ? (
                              <Youtube className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            )}
                            <span>{acc.handle}</span>
                            {acc.metrics?.followersCount && (
                              <span className="text-slate-400">
                                ({acc.metrics.followersCount.toLocaleString()} followers)
                              </span>
                            )}
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    )}

                    {item.verificationNotes && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl mt-1 border border-slate-100">
                        <strong>Creator Note:</strong> {item.verificationNotes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                  <button
                    disabled={isProcessing}
                    onClick={() =>
                      setNotesModal({
                        id: item._id,
                        name: userName,
                        action: 'REJECT',
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>

                  <button
                    disabled={isProcessing}
                    onClick={() =>
                      setNotesModal({
                        id: item._id,
                        name: userName,
                        action: 'APPROVE',
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Grant Verified Pro
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/85 p-8 shadow-gemini-sm">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-extrabold text-base text-slate-900">Verification Queue is Clear</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All submitted creator credentials have been reviewed. New verification requests will appear here in real-time.
            </p>
          </div>
        )}
      </div>

      {/* Decision Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              {notesModal.action === 'APPROVE' ? (
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {notesModal.action === 'APPROVE' ? 'Grant Verified Pro Badge' : 'Reject Verification Request'}
                </h3>
                <p className="text-xs text-slate-500">Applicant: {notesModal.name}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Administrative Feedback & Reason (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  notesModal.action === 'APPROVE'
                    ? 'e.g. Identity verified via official social handle sync and authentic government ID.'
                    : 'e.g. Portfolio requires 2 more commercial projects before badge approval.'
                }
                rows={3}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setNotesModal(null);
                  setAdminNotes('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(notesModal.id, notesModal.action, adminNotes)}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                  notesModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {notesModal.action === 'APPROVE' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
