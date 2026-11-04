'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Layers,
  Settings,
  X,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '../../lib/utils';
import { ITokenLedgerEntry } from '@brands-creators/types';

export default function AdminTokenManagementPage() {
  const [activeTab, setActiveTab] = useState<'wallets' | 'ledger' | 'rules'>('wallets');
  const [wallets, setWallets] = useState<any[]>([]);
  const [ledger, setLedger] = useState<ITokenLedgerEntry[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceRate, setReferenceRate] = useState(10);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Grant / Deduct modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'grant' | 'deduct'>('grant');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reconciliation state
  const [reconcileResult, setReconcileResult] = useState<any>(null);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/tokens/admin/wallets?limit=50');
      const data = res?.data?.items || res?.items || [];
      if (Array.isArray(data)) setWallets(data);
    } catch (err: any) {
      console.error('Failed to load wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/tokens/admin/ledger?limit=50');
      const data = res?.data?.items || res?.items || [];
      if (Array.isArray(data)) setLedger(data);
    } catch (err: any) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/tokens/action-costs');
      const data = res?.data || res;
      if (Array.isArray(data)) setRules(data);
    } catch (err: any) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wallets') loadWallets();
    else if (activeTab === 'ledger') loadLedger();
    else if (activeTab === 'rules') loadRules();
  }, [activeTab]);

  const openAdjustModal = (user: any, mode: 'grant' | 'deduct') => {
    setSelectedUser(user);
    setModalMode(mode);
    setAmount(10);
    setReason('');
    setModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const uId = selectedUser.userId?._id || selectedUser.userId || selectedUser._id;
      if (modalMode === 'grant') {
        await apiClient.post('/tokens/admin/grant', {
          userId: uId,
          amount: Number(amount),
          reason: reason.trim(),
        });
        setFeedback({ type: 'success', message: `Successfully granted ${amount} tokens to user.` });
      } else {
        await apiClient.post('/tokens/admin/deduct', {
          userId: uId,
          amount: Number(amount),
          reason: reason.trim(),
        });
        setFeedback({ type: 'success', message: `Successfully deducted ${amount} tokens from user.` });
      }
      setModalOpen(false);
      await loadWallets();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Token adjustment failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReconcile = async (userId: string) => {
    try {
      setFeedback(null);
      const res = await apiClient.post(`/tokens/admin/reconcile/${userId}`);
      const data = res?.data || res;
      setReconcileResult(data);
      if (data.isReconciled) {
        setFeedback({
          type: 'success',
          message: `Wallet reconciled perfectly! Balance (${data.walletBalance}) matches ledger sum across ${data.totalEntries} entries.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Discrepancy detected! Wallet balance: ${data.walletBalance}, Calculated from ledger: ${data.calculatedBalance}`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Reconciliation check failed.' });
    }
  };

  const handleUpdateRate = async (newRate: number) => {
    try {
      await apiClient.patch('/tokens/admin/reference-rate', { rateInInr: newRate });
      setReferenceRate(newRate);
      setFeedback({ type: 'success', message: `Token reference rate updated to 1 Token = ₹${newRate} INR.` });
      await loadWallets();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update rate.' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-amber-500" />
            Token Wallet Administration & Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit user token balances, inspect immutable ledger records, execute manual grants, and reconcile balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold">
            <span className="text-slate-400">Rate:</span>
            <span className="font-bold text-slate-800">1 Token = ₹{referenceRate}</span>
            <button
              onClick={() => {
                const r = prompt('Enter new token reference rate in INR:', String(referenceRate));
                if (r && !isNaN(Number(r))) handleUpdateRate(Number(r));
              }}
              className="text-indigo-600 hover:text-indigo-700 ml-1"
              title="Edit Reference Rate"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === 'wallets') loadWallets();
              else if (activeTab === 'ledger') loadLedger();
              else loadRules();
            }}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Refresh current view"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('wallets')}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === 'wallets'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          User Wallets ({wallets.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Transaction Ledger ({ledger.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === 'rules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Action Cost Rules ({rules.length})
        </button>
      </div>

      {/* TAB 1: USER WALLETS */}
      {activeTab === 'wallets' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-gemini-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading user token wallets...</div>
          ) : wallets.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">No token wallets found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">User Account</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-right">Received</th>
                    <th className="py-3 px-4 text-right">Spent</th>
                    <th className="py-3 px-6 text-right">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {wallets.map((w) => {
                    const u = w.userId;
                    const uId = u?._id || w.userId;
                    return (
                      <tr key={w._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-slate-900">{u?.fullName || 'User'}</div>
                          <div className="text-[11px] text-slate-400">{u?.email || String(uId)}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700">
                            {u?.roles ? u.roles.join(', ') : 'MEMBER'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-amber-600 text-sm">
                          {w.balance}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 font-bold">
                          +{w.totalReceived || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 font-semibold">
                          -{w.totalSpent || 0}
                        </td>
                        <td className="py-3.5 px-6 text-right space-x-1.5">
                          <button
                            onClick={() => openAdjustModal(w, 'grant')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold"
                          >
                            + Grant
                          </button>
                          <button
                            onClick={() => openAdjustModal(w, 'deduct')}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[11px] font-bold"
                          >
                            - Deduct
                          </button>
                          <button
                            onClick={() => handleReconcile(String(uId))}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-[11px] font-bold"
                            title="Audit balance vs full ledger sum"
                          >
                            Reconcile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-gemini-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading audit ledger entries...</div>
          ) : ledger.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">No ledger transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Entry ID & Date</th>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-6 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {ledger.map((e) => {
                    const isCredit = e.direction === 'CREDIT';
                    return (
                      <tr key={e._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-6">
                          <div className="font-mono text-[11px] text-slate-800">{e._id}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(e.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{String(e.userId)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isCredit
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {e.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600">{e.reason}</td>
                        <td
                          className={`py-3 px-4 text-right font-black ${
                            isCredit ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {isCredit ? `+${e.amount}` : `-${e.amount}`}
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-slate-800">{e.balanceAfter}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTION COST PRICING RULES */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-gemini-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <h3 className="text-xs font-bold text-slate-900">Configurable Marketplace Action Token Costs</h3>
            <p className="text-[11px] text-slate-500">
              When users initiate these actions, the backend automatically reserves and deducts the configured amount.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Action Key</th>
                  <th className="py-3 px-4">Action Name & Description</th>
                  <th className="py-3 px-4">Cost (Tokens)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rules.map((r) => (
                  <tr key={r._id || r.actionKey} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-[11px] text-indigo-600 font-bold">
                      {r.actionKey}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-400">{r.description}</div>
                    </td>
                    <td className="py-3.5 px-4 font-black text-amber-600 text-sm">
                      {r.costTokens} Tokens
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {r.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={async () => {
                          const newCost = prompt(`Enter new token cost for ${r.name}:`, String(r.costTokens));
                          if (newCost !== null && !isNaN(Number(newCost))) {
                            await apiClient.put('/tokens/admin/action-costs', {
                              actionKey: r.actionKey,
                              costTokens: Number(newCost),
                            });
                            loadRules();
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-[11px]"
                      >
                        Change Cost
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grant / Deduct Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-gemini-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {modalMode === 'grant' ? 'Admin Token Grant' : 'Admin Token Deduction'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Recipient</span>
                <span className="font-bold text-slate-800 text-sm">
                  {selectedUser?.userId?.fullName || selectedUser?.fullName || 'User'}
                </span>
                <span className="text-slate-400 text-[11px] block">
                  {selectedUser?.userId?.email || selectedUser?.email}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount (Tokens)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Administrative Reason (Audit Logged)
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Promotional campaign compensation, dispute resolution, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-sm transition-all disabled:opacity-50 ${
                    modalMode === 'grant'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting
                    ? 'Processing...'
                    : modalMode === 'grant'
                    ? 'Confirm Grant'
                    : 'Confirm Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

