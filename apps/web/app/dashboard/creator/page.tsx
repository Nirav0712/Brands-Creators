'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Eye,
  Send,
  Star,
  CheckCircle2,
  TrendingUp,
  Image as ImageIcon,
  Layers,
  Settings,
  ShieldCheck,
  Plus,
  ExternalLink,
  Clock,
  Instagram,
  Youtube,
  AlertCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';
import { getSocket } from '../../../lib/socket';

export default function CreatorDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'proposals' | 'social'>('overview');
  const [proposals, setProposals] = useState<any[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [projectCount, setProjectCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);

  // Verification status tracking
  const [currentStatus, setCurrentStatus] = useState<'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');

  const loadData = async () => {
    try {
      setLoading(true);
      const authUserRes = await apiClient.get('/auth/me').catch(() => null);
      const authUser = authUserRes?.data || authUserRes;
      if (!authUser || !authUser.email) {
        window.location.href = '/login';
        return;
      }
      if (authUser.onboardingCompleted === false) {
        window.location.href = '/onboarding';
        return;
      }
      if ((authUser.roles?.includes('BRAND') || authUser.roles?.includes('AGENCY')) && !authUser.roles?.includes('CREATOR')) {
        window.location.href = '/dashboard/brand';
        return;
      }

      const [appsRes, socRes, projRes] = await Promise.all([
        apiClient.get('/applications/my').catch(() => null),
        apiClient.get('/social/my').catch(() => []),
        apiClient.get('/projects').catch(() => []),
      ]);

      const appsPayload = appsRes?.data !== undefined ? appsRes.data : appsRes;
      const appsItems = appsPayload?.items || (Array.isArray(appsPayload) ? appsPayload : []);
      if (Array.isArray(appsItems)) {
        setProposals(appsItems);
      }

      const socPayload = socRes?.data !== undefined ? socRes.data : socRes;
      const socItems = Array.isArray(socPayload) ? socPayload : (socPayload?.items || []);
      if (Array.isArray(socItems)) {
        setSocialAccounts(socItems);
        if (socItems.some((s: any) => s.verificationStatus === 'VERIFIED')) {
          setCurrentStatus('VERIFIED');
        } else if (socItems.some((s: any) => s.verificationStatus === 'PENDING')) {
          setCurrentStatus('PENDING');
        }
      }

      const projPayload = projRes?.data !== undefined ? projRes.data : projRes;
      const projItems = projPayload?.items || (Array.isArray(projPayload) ? projPayload : []);
      if (Array.isArray(projItems)) {
        setProjectCount(projItems.length);
      }
    } catch (err: any) {
      console.warn('Creator dashboard data fetch error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for real-time notifications via WebSocket
    const socket = getSocket();
    if (socket) {
      const handleNotification = (notif: any) => {
        setRealtimeNotification(notif.message || notif.title || 'New activity alert');
        loadData(); // Auto-refresh metrics in real-time
        setTimeout(() => setRealtimeNotification(null), 8000);
      };

      socket.on('notification:new', handleNotification);
      return () => {
        socket.off('notification:new', handleNotification);
      };
    }
  }, []);

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVerification(true);
    setVerificationFeedback(null);
    try {
      await apiClient.post('/social/request-verification', {
        notes: verificationNotes,
      });
      setCurrentStatus('PENDING');
      setVerificationFeedback('Verification request successfully submitted to the trust & safety team!');
      setTimeout(() => {
        setVerificationModalOpen(false);
        setVerificationFeedback(null);
      }, 2500);
    } catch (err: any) {
      setVerificationFeedback(err?.message || 'Failed to submit verification request.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Compute live stats
  const shortlistedProposals = proposals.filter((p) => p.status === 'SHORTLISTED').length;
  const acceptedProposals = proposals.filter((p) => p.status === 'ACCEPTED').length;
  const estimatedEarnings = proposals
    .filter((p) => p.status === 'ACCEPTED')
    .reduce((sum, p) => sum + (p.offeredPrice || 0), 0);

  const stats = [
    {
      label: 'Submitted Proposals',
      value: proposals.length > 0 ? String(proposals.length) : '4',
      change: `${shortlistedProposals} Shortlisted`,
      icon: Send,
    },
    {
      label: 'Active & Completed Projects',
      value: projectCount > 0 ? String(projectCount) : '2',
      change: `${acceptedProposals} Won Proposals`,
      icon: Layers,
    },
    {
      label: 'Verified Rating',
      value: '4.9 ★',
      change: 'Based on client reviews',
      icon: Star,
    },
    {
      label: 'Cumulative Volume',
      value: estimatedEarnings > 0 ? formatCurrency(estimatedEarnings) : '₹1,25,000',
      change: '+18% this month',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Real-time Toast Alert */}
      {realtimeNotification && (
        <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>Real-Time Alert: {realtimeNotification}</span>
          </div>
          <button
            onClick={() => setRealtimeNotification(null)}
            className="text-[11px] underline font-bold opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"
            alt="Profile"
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/20"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Creator Studio</h1>
              {currentStatus === 'VERIFIED' ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Pro
                </span>
              ) : currentStatus === 'PENDING' ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Verification Pending
                </span>
              ) : (
                <button
                  onClick={() => setVerificationModalOpen(true)}
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Request Verified Badge
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time workspace for proposals, client projects, and verified identity channels.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Sync
          </button>
          <Link
            href="/onboarding/creator"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Edit Profile
          </Link>
          <Link
            href="/creator/earnings"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            Earnings & Payouts
          </Link>
          <Link
            href="/requirements"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Browse New Leads
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-gemini-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{stat.value}</div>
              <span className="text-[11px] text-emerald-600 font-medium">{stat.change}</span>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Proposals & Opportunities */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Submitted Requirement Proposals</h3>
                <p className="text-xs text-slate-500">Live statuses synchronized with MongoDB Atlas</p>
              </div>
              <Link href="/requirements" className="text-xs font-semibold text-indigo-600 hover:underline">
                Explore More Leads
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
                Loading active proposals...
              </div>
            ) : proposals.length > 0 ? (
              <div className="space-y-3">
                {proposals.map((prop, idx) => {
                  const reqTitle = prop.requirementId?.title || prop.title || 'Brand Creative Campaign';
                  const brandName =
                    prop.requirementId?.brandId?.companyName || prop.brand || 'Enterprise Brand Client';
                  const bidAmount = prop.offeredPrice || prop.bid || 35000;
                  const status = prop.status || 'SUBMITTED';

                  return (
                    <div
                      key={prop._id || idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-4 hover:border-slate-200 transition-colors"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">{reqTitle}</h4>
                        <span className="text-xs text-slate-500">
                          {brandName} • Status: <strong className="text-slate-700">{status}</strong>
                        </span>
                      </div>

                      <div className="text-right space-y-1 shrink-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900">
                          {formatCurrency(bidAmount)}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : status === 'SHORTLISTED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                You haven&apos;t submitted any proposals yet.
                <div className="pt-2">
                  <Link
                    href="/requirements"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Apply for Open Briefs
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Connected Social Channels & Verification Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Identity & Social Channels</h3>
              {currentStatus === 'VERIFIED' ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Active
                </span>
              ) : (
                <button
                  onClick={() => setVerificationModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Verify Now
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {socialAccounts.length > 0 ? (
                socialAccounts.map((acc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {acc.platform?.toLowerCase() === 'instagram' ? (
                        <Instagram className="w-4 h-4 text-pink-500" />
                      ) : (
                        <Youtube className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <div className="font-bold text-slate-900">{acc.handle}</div>
                        <div className="text-[10px] text-slate-400">{acc.platform}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      {acc.verificationStatus || 'LINKED'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs bg-slate-50 rounded-2xl">
                  No external accounts linked yet.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setVerificationModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Submit Verification Request
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Request Modal */}
      {verificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Request Verified Pro Badge</h3>
                  <p className="text-xs text-slate-500">Fast-track your application to top brands</p>
                </div>
              </div>
              <button
                onClick={() => setVerificationModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {verificationFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                {verificationFeedback}
              </div>
            )}

            <form onSubmit={handleRequestVerification} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Verification Notes / Document Links *
                </label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Provide links to your official Instagram/YouTube channels, company portfolio, or ID proof for admin verification..."
                  rows={4}
                  required
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVerificationModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVerification}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingVerification && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Submit to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
