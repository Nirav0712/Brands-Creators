'use client';

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface ManualPaymentRequest {
  _id: string;
  orderNumber: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    phone?: string;
  };
  targetType: 'SUBSCRIPTION' | 'TOKEN_PACKAGE';
  targetTitle: string;
  amount: number;
  currency: string;
  tokenPackageQuantity?: number;
  paymentMethod: 'UPI' | 'BANK_TRANSFER';
  transactionReference: string;
  senderIdentifier?: string;
  proofImageUrl?: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  reviewedBy?: { fullName: string; email: string };
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

export default function AdminManualPaymentRequestsPage() {
  const [requests, setRequests] = useState<ManualPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ManualPaymentRequest | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`${API_BASE}/payments/admin/manual-requests?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (data.data && data.data.items) {
        setRequests(data.data.items);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      setToast({ message: 'Failed to fetch manual payments', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this payment? This will immediately activate the subscription or credit tokens to the user wallet.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/admin/manual-requests/${id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ status: 'APPROVED', notes: 'Verified via admin review portal' }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Payment successfully approved and fulfilled!', type: 'success' });
        fetchRequests();
      } else {
        setToast({ message: data.message || 'Approval failed', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: 'Error approving payment: ' + err.message, type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/admin/manual-requests/${selectedRequest._id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Payment request rejected with documented reason', type: 'success' });
        setRejectModalOpen(false);
        setRejectionReason('');
        setSelectedRequest(null);
        fetchRequests();
      } else {
        setToast({ message: data.message || 'Rejection failed', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: 'Error rejecting payment: ' + err.message, type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending Review</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manual Payment Verification Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit offline UPI / Bank transfers, cross-reference UTR vouchers, and fulfill platform credits safely.
          </p>
        </div>
      </div>

      {toast && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center justify-between transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          {['ALL', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All Requests' : st === 'PENDING_VERIFICATION' ? 'Pending' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRequests()}
            placeholder="Search order # or UTR..."
            className="px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
          />
          <button
            onClick={fetchRequests}
            className="px-3.5 py-2 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-all"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading verification queue...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No payment requests found matching the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Order / Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Target Item</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Method & UTR</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-medium text-slate-900">{req.orderNumber}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{req.userId?.fullName || 'Anonymous'}</div>
                      <div className="text-[11px] text-slate-500">{req.userId?.email}</div>
                      <div className="text-[10px] text-indigo-600 font-medium capitalize mt-0.5">{req.userId?.role?.toLowerCase()}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{req.targetTitle}</div>
                      <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {req.targetType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">₹{req.amount.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400">{req.currency}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 font-medium text-slate-900">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-bold">
                          {req.paymentMethod}
                        </span>
                        <span className="font-mono text-slate-700">{req.transactionReference}</span>
                      </div>
                      {req.senderIdentifier && (
                        <div className="text-[11px] text-slate-400 mt-0.5">From: {req.senderIdentifier}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(req.status)}
                      {req.rejectionReason && (
                        <div className="text-[11px] text-rose-600 mt-1 max-w-xs truncate" title={req.rejectionReason}>
                          Reason: {req.rejectionReason}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {req.status === 'PENDING_VERIFICATION' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApprove(req._id)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => {
                              setSelectedRequest(req);
                              setRejectModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reject Payment Submission</h3>
            <p className="text-xs text-slate-500 mb-4">
              Order {selectedRequest.orderNumber} for ₹{selectedRequest.amount}. Document the explicit reason for the user audit record.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. UTR reference not found in bank ledger / Mismatched transfer amount"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalOpen(false);
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

