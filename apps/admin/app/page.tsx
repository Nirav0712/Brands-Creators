'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Users,
  Building2,
  Briefcase,
  FileCheck,
  ShieldCheck,
  TrendingUp,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { apiClient } from '../lib/api-client';

export default function AdminDashboardPage() {
  const [metricsData, setMetricsData] = useState<any>(null);
  const [verificationQueue, setVerificationQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsRes, queueRes] = await Promise.all([
        apiClient.get('/admin/dashboard-metrics').catch(() => null),
        apiClient.get('/admin/verification-queue').catch(() => []),
      ]);

      if (metricsRes) {
        setMetricsData(metricsRes?.data !== undefined ? metricsRes.data : metricsRes);
      }
      const queuePayload = queueRes?.data !== undefined ? queueRes.data : queueRes;
      if (Array.isArray(queuePayload)) {
        setVerificationQueue(queuePayload);
      }
    } catch (err: any) {
      console.warn('Dashboard data fetch error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (creatorId: string) => {
    try {
      setActionLoading(creatorId);
      await apiClient.post(`/admin/creators/${creatorId}/verify`, {
        status: 'VERIFIED',
        notes: 'Verified Pro badge approved via Admin Mission Control.',
      });
      setVerificationQueue((prev) => prev.filter((item) => item._id !== creatorId));
      if (metricsData) {
        setMetricsData({
          ...metricsData,
          pendingVerifications: Math.max(0, (metricsData.pendingVerifications || 1) - 1),
        });
      }
    } catch (err: any) {
      alert(`Approval error: ${err?.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (creatorId: string) => {
    try {
      setActionLoading(creatorId);
      await apiClient.post(`/admin/creators/${creatorId}/verify`, {
        status: 'REJECTED',
        notes: 'Verification request rejected. Further documentation or portfolio evidence required.',
      });
      setVerificationQueue((prev) => prev.filter((item) => item._id !== creatorId));
      if (metricsData) {
        setMetricsData({
          ...metricsData,
          pendingVerifications: Math.max(0, (metricsData.pendingVerifications || 1) - 1),
        });
      }
    } catch (err: any) {
      alert(`Rejection error: ${err?.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const metrics = [
    {
      label: 'Total Creators & Talent',
      value: metricsData?.totalCreators !== undefined ? metricsData.totalCreators.toLocaleString() : '12',
      change: 'Active in Marketplace',
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Registered Brands',
      value: metricsData?.totalBrands !== undefined ? metricsData.totalBrands.toLocaleString() : '6',
      change: 'Hiring on Platform',
      icon: Building2,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Active Requirements',
      value: metricsData?.activeRequirements !== undefined ? metricsData.activeRequirements.toLocaleString() : '8',
      change: 'Open for Proposals',
      icon: Briefcase,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Pending Verifications',
      value: metricsData?.pendingVerifications !== undefined ? metricsData.pendingVerifications.toLocaleString() : String(verificationQueue.length),
      change: verificationQueue.length > 0 ? `${verificationQueue.length} In Real-Time Queue` : 'All clear',
      icon: ShieldCheck,
      color: 'text-rose-600 bg-rose-50',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Live Platform Overview
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Mission Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time platform operations and trust governance backed by live MongoDB persistence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Sync
          </button>
          <Link
            href="/marketplace/categories"
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Manage Categories
          </Link>
          <Link
            href="/moderation/verification"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            Verification Queue ({verificationQueue.length})
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-slate-200/85 shadow-gemini-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{m.label}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${m.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{m.value}</div>
              <div className="text-[11px] text-slate-500 font-medium">{m.change}</div>
            </div>
          );
        })}
      </div>

      {/* Main Split: Verification Action Queue & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Verification Queue */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Creator Verification Approvals</h2>
              <p className="text-xs text-slate-500">Review identity proof, connected social metrics, and portfolios</p>
            </div>
            <Link
              href="/moderation/verification"
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
            >
              View Full Queue ({verificationQueue.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
              Loading verification records...
            </div>
          ) : verificationQueue.length > 0 ? (
            <div className="space-y-3">
              {verificationQueue.slice(0, 5).map((item) => {
                const name = item.userId?.fullName || 'Creator Talent';
                const handle = item.userId?.username ? `@${item.userId.username}` : `@${item.slug}`;
                const category = item.primaryCategoryId?.name || 'Creator';
                const avatar =
                  item.userId?.avatarUrl ||
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
                const isProcessing = actionLoading === item._id;

                return (
                  <div
                    key={item._id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={avatar}
                        alt={name}
                        className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{name}</span>
                          <span className="text-[11px] text-slate-400 font-normal">{handle}</span>
                        </div>
                        <div className="text-xs text-indigo-600 font-medium">{category}</div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> Status: {item.verificationStatus} • {item.portfolioCount ?? 0} Portfolio Items
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        disabled={isProcessing}
                        onClick={() => handleReject(item._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => handleApprove(item._id)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve Pro
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All pending verification requests have been resolved!
            </div>
          )}
        </div>

        {/* Right 1 Col: System & Quick Taxonomies Overview */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/85 shadow-gemini-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Platform Governance</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Platform Commission</span>
                <span className="font-bold text-slate-900">10% Default</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Taxonomies</span>
                <span className="font-bold text-emerald-600">
                  {metricsData?.totalCategories || 30} Active Domains
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Social Gateways</span>
                <span className="font-bold text-indigo-600">Instagram, YT, LinkedIn</span>
              </div>
            </div>

            <Link
              href="/system/settings"
              className="block text-center w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors mt-2"
            >
              Configure Platform Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
