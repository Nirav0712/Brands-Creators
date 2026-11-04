'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  CheckCircle2,
  Clock,
  IndianRupee,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Download,
  AlertCircle,
  RefreshCw,
  Building,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { IPayout, ITransaction, PayoutStatus } from '@brands-creators/types';

export default function CreatorEarningsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [payouts, setPayouts] = useState<IPayout[]>([]);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PAYOUTS' | 'TRANSACTIONS'>('PAYOUTS');

  const fetchEarningsData = async () => {
    setLoading(true);
    try {
      const [summaryRes, payoutsRes, txnsRes] = await Promise.all([
        apiClient.get<any>('/payments/earnings/summary').catch(() => ({ data: null })),
        apiClient.get<any>('/payouts').catch(() => ({ data: { items: [] } })),
        apiClient.get<any>('/transactions').catch(() => ({ data: { items: [] } })),
      ]);

      setSummary(summaryRes.data?.data || summaryRes.data || {});
      const pItems = payoutsRes.data?.data?.items || payoutsRes.data?.items || payoutsRes.data || [];
      setPayouts(Array.isArray(pItems) ? pItems : []);
      const tItems = txnsRes.data?.data?.items || txnsRes.data?.items || txnsRes.data || [];
      setTransactions(Array.isArray(tItems) ? tItems : []);
    } catch (err) {
      console.error('Error fetching creator earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const getPayoutStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case PayoutStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Transferred to Bank
          </span>
        );
      case PayoutStatus.PENDING:
      case PayoutStatus.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Processing Release
          </span>
        );
      case PayoutStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" /> Payout Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Creator Earnings & Payouts
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review project revenues, platform fees, pending payouts, and bank settlement history.
            </p>
          </div>
          <button
            onClick={fetchEarningsData}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Gross Project Value</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-gray-900">
                {formatCurrency(summary?.totalProjectValue || 0, 'INR')}
              </span>
              <p className="text-xs text-gray-400 mt-1">Total contracted revenue</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Platform Fees (5%)</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Percent className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-gray-900">
                {formatCurrency(summary?.totalPlatformFees || 0, 'INR')}
              </span>
              <p className="text-xs text-gray-400 mt-1">Marketplace service fees</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Net Earnings</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-emerald-600">
                {formatCurrency(summary?.totalNetEarnings || 0, 'INR')}
              </span>
              <p className="text-xs text-gray-400 mt-1">Total revenue after fees</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payout Pending</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-amber-600">
                {formatCurrency(summary?.pendingPayouts || 0, 'INR')}
              </span>
              <p className="text-xs text-gray-400 mt-1">Held until milestone completion</p>
            </div>
          </div>
        </div>

        {/* Ledger Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-px">
          <button
            onClick={() => setActiveTab('PAYOUTS')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
              activeTab === 'PAYOUTS'
                ? 'bg-white text-blue-600 border border-gray-200 border-b-white -mb-px shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Payouts ({payouts.length})
          </button>
          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-white text-blue-600 border border-gray-200 border-b-white -mb-px shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Transaction Ledger ({transactions.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'PAYOUTS' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Payout #</th>
                    <th className="py-4 px-6">Project</th>
                    <th className="py-4 px-6">Net Amount</th>
                    <th className="py-4 px-6">Fee Deducted</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        Loading payouts...
                      </td>
                    </tr>
                  ) : payouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No payout records available yet. Project payments deposited by brands will appear here.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((po) => (
                      <tr key={po._id} className="hover:bg-gray-50/75 transition-colors">
                        <td className="py-4 px-6 font-mono font-medium text-gray-900">
                          {po.payoutNumber}
                        </td>
                        <td className="py-4 px-6 font-medium text-blue-600">
                          <Link href={`/projects/${po.projectId}`} className="hover:underline inline-flex items-center gap-1">
                            {po.project?.title || 'Project Workspace'}
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                        <td className="py-4 px-6 font-bold text-gray-900">
                          {formatCurrency(po.amount, po.currency || 'INR')}
                        </td>
                        <td className="py-4 px-6 text-gray-500 text-xs">
                          {formatCurrency(po.platformFee, po.currency || 'INR')}
                        </td>
                        <td className="py-4 px-6">{getPayoutStatusBadge(po.status)}</td>
                        <td className="py-4 px-6 text-gray-500 text-xs">
                          {new Date(po.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/projects/${po.projectId}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Workspace
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Txn #</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Direction</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        Loading transaction history...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        No financial ledger entries yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t._id} className="hover:bg-gray-50/75 transition-colors">
                        <td className="py-4 px-6 font-mono font-medium text-gray-900">
                          {t.transactionNumber}
                        </td>
                        <td className="py-4 px-6 font-semibold text-gray-700">{t.type}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              t.direction === 'CREDIT'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-gray-900">
                          {formatCurrency(t.amount, t.currency || 'INR')}
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs font-medium text-gray-600">{t.status}</span>
                        </td>
                        <td className="py-4 px-6 text-gray-500 text-xs">
                          {new Date(t.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
