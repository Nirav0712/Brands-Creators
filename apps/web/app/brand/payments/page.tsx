'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  IndianRupee,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Building,
  User,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { IPayment, PaymentStatus } from '@brands-creators/types';

export default function BrandPaymentsPage() {
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>('/payments');
      const items = res.data?.data?.items || res.data?.items || res.data || [];
      setPayments(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalPaid = payments
    .filter((p) => p.status === PaymentStatus.PAID)
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const pendingAmount = payments
    .filter((p) => p.status === PaymentStatus.PENDING || p.status === PaymentStatus.ORDER_CREATED)
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const refundedAmount = payments
    .filter((p) => p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIALLY_REFUNDED)
    .reduce((sum, p) => sum + (p.refundAmount || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      p.paymentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.professional?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid & Confirmed
          </span>
        );
      case PaymentStatus.ORDER_CREATED:
      case PaymentStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending Checkout
          </span>
        );
      case PaymentStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" /> Payment Failed
          </span>
        );
      case PaymentStatus.REFUNDED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw className="w-3.5 h-3.5" /> Refunded
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
              Brand Payments & Billing
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track project deposits, commercial transactions, and payment receipts.
            </p>
          </div>
          <button
            onClick={fetchPayments}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Spent</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {formatCurrency(totalPaid, 'INR')}
              </span>
              <p className="text-xs text-gray-400 mt-1">Confirmed project payments</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Checkout</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {formatCurrency(pendingAmount, 'INR')}
              </span>
              <p className="text-xs text-gray-400 mt-1">Awaiting final gateway confirmation</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Refunded</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {formatCurrency(refundedAmount, 'INR')}
              </span>
              <p className="text-xs text-gray-400 mt-1">Credited back to Brand accounts</p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by payment #, project, creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {['ALL', 'PAID', 'ORDER_CREATED', 'REFUNDED', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {st === 'ORDER_CREATED' ? 'PENDING' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Payment Number</th>
                  <th className="py-4 px-6">Project</th>
                  <th className="py-4 px-6">Creator / Professional</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Loading payment transactions...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      No payment records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-4 px-6 font-mono font-medium text-gray-900">
                        {p.paymentNumber}
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/projects/${p.projectId}`}
                          className="font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          {p.project?.title || 'Project Workspace'}
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-gray-700">
                        {p.professional?.fullName || 'Assigned Professional'}
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-900">
                        {formatCurrency(p.totalAmount, p.currency || 'INR')}
                      </td>
                      <td className="py-4 px-6">{getStatusBadge(p.status)}</td>
                      <td className="py-4 px-6 text-gray-500 text-xs">
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/projects/${p.projectId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          View Project
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
