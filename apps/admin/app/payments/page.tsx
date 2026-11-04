'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { IPayment, ITransaction, IPayout, PaymentStatus } from '@brands-creators/types';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [payouts, setPayouts] = useState<IPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'TRANSACTIONS' | 'PAYOUTS'>('PAYMENTS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, txnRes, poRes] = await Promise.all([
        apiClient.get<any>('/payments').catch(() => ({ data: { items: [] } })),
        apiClient.get<any>('/transactions').catch(() => ({ data: { items: [] } })),
        apiClient.get<any>('/payouts').catch(() => ({ data: { items: [] } })),
      ]);

      const payItems = payRes.data?.data?.items || payRes.data?.items || payRes.data || [];
      setPayments(Array.isArray(payItems) ? payItems : []);

      const txnItems = txnRes.data?.data?.items || txnRes.data?.items || txnRes.data || [];
      setTransactions(Array.isArray(txnItems) ? txnItems : []);

      const poItems = poRes.data?.data?.items || poRes.data?.items || poRes.data || [];
      setPayouts(Array.isArray(poItems) ? poItems : []);
    } catch (err) {
      console.error('Error fetching admin payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalVolume = payments
    .filter((p) => p.status === PaymentStatus.PAID)
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const totalFees = payments
    .filter((p) => p.status === PaymentStatus.PAID)
    .reduce((sum, p) => sum + (p.platformFee || 0), 0);

  const totalRefunded = payments
    .filter((p) => p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIALLY_REFUNDED)
    .reduce((sum, p) => sum + (p.refundAmount || 0), 0);

  const pendingPayoutsTotal = payouts
    .filter((po) => po.status === 'PENDING' || po.status === 'PROCESSING')
    .reduce((sum, po) => sum + (po.amount || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      p.paymentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.professional?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Oversight & Payments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform gross marketplace volume, commission ledger, payouts, and gateway webhooks.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-200/75 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Gross Platform Volume</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900">{formatCurrency(totalVolume, 'INR')}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/75 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Platform Revenue (Fees)</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{formatCurrency(totalFees, 'INR')}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/75 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Payouts</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{formatCurrency(pendingPayoutsTotal, 'INR')}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/75 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Refunded</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-600">{formatCurrency(totalRefunded, 'INR')}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'PAYMENTS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Payments ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'TRANSACTIONS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Transaction Ledger ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('PAYOUTS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'PAYOUTS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Payout Records ({payouts.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'PAYMENTS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search payment #, project, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'PAID', 'ORDER_CREATED', 'REFUNDED', 'FAILED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    statusFilter === st ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st === 'ORDER_CREATED' ? 'PENDING' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Payment Number</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Brand Client</th>
                    <th className="py-3 px-4">Professional</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Fee (5%)</th>
                    <th className="py-3 px-4">Net Payout</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">Loading...</td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">No payments found.</td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono font-medium text-gray-900">{p.paymentNumber}</td>
                        <td className="py-3 px-4 font-medium text-blue-600">{p.project?.title || 'Project'}</td>
                        <td className="py-3 px-4 text-gray-700">{p.brand?.fullName || 'Brand'}</td>
                        <td className="py-3 px-4 text-gray-700">{p.professional?.fullName || 'Creator'}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(p.totalAmount, p.currency || 'INR')}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{formatCurrency(p.platformFee, p.currency || 'INR')}</td>
                        <td className="py-3 px-4 text-emerald-600 font-semibold">{formatCurrency(p.professionalAmount, p.currency || 'INR')}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              p.status === PaymentStatus.PAID
                                ? 'bg-emerald-50 text-emerald-700'
                                : p.status === PaymentStatus.REFUNDED
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Txn #</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-medium text-gray-900">{t.transactionNumber}</td>
                    <td className="py-3 px-4 text-gray-700">{t.project?.title || 'Project'}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{t.type}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.direction === 'CREDIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'}`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(t.amount, t.currency || 'INR')}</td>
                    <td className="py-3 px-4 text-xs text-gray-600">{t.status}</td>
                    <td className="py-3 px-4 text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'PAYOUTS' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Payout #</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Professional</th>
                  <th className="py-3 px-4">Net Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map((po) => (
                  <tr key={po._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-medium text-gray-900">{po.payoutNumber}</td>
                    <td className="py-3 px-4 text-blue-600 font-medium">{po.project?.title || 'Project'}</td>
                    <td className="py-3 px-4 text-gray-700">{po.professional?.fullName || 'Creator'}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(po.amount, po.currency || 'INR')}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">{new Date(po.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
