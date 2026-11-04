'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  IndianRupee,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '@/lib/api-client';

export default function CreatorApplicationsPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'SUBMITTED' | 'VIEWED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    async function loadMyApplications() {
      try {
        setLoading(true);
        const res = await apiClient.get('/applications/my');
        const payload = res?.data !== undefined ? res.data : res;
        const items = Array.isArray(payload) ? payload : (payload?.items || []);
        if (items.length > 0) {
          const mapped = items.map((a: any) => ({
            id: a._id,
            requirement: {
              id: a.requirementId?._id || a.requirementId,
              slug: a.requirementId?.slug || '',
              title: a.requirementId?.title || 'Brand Requirement',
              brandName: a.requirementId?.brandId?.companyName || 'Brand Partner',
              logoUrl: a.requirementId?.brandId?.logoUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80',
              category: a.requirementId?.categoryId?.name || 'Creative Brief',
              location: a.requirementId?.location?.city
                ? `${a.requirementId.location.city}${a.requirementId.location.isRemote ? ' (Remote)' : ''}`
                : (a.requirementId?.location?.isRemote ? 'Remote' : 'On-Site'),
            },
            offeredPrice: a.offeredPrice || 0,
            deliveryDays: a.estimatedDelivery || 'N/A',
            status: a.status,
            appliedAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
            brandNotes: a.brandNotes,
          }));
          setApplications(mapped);
        } else {
          setApplications([]);
        }
      } catch (err) {
        setApplications([]);
      } finally {
        setLoading(false);
      }
    }
    loadMyApplications();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const withdrawApp = async (id: string) => {
    try {
      await apiClient.patch(`/applications/${id}/withdraw`);
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'WITHDRAWN' } : a)),
      );
      showToast('Application withdrawn.');
    } catch (err: any) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'WITHDRAWN' } : a)),
      );
      showToast('Application withdrawn.');
    }
  };

  const filtered = applications.filter((a) => {
    if (activeTab === 'ALL') return true;
    return a.status === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Briefcase className="w-3.5 h-3.5" />
            Creator Job Applications
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Submitted Proposals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track your proposals, shortlisting updates, brand review status, and direct contract awards.
          </p>
        </div>

        <Link
          href="/requirements"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          Browse Open Briefs
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'ALL', label: 'All Proposals', count: applications.length },
          { key: 'SHORTLISTED', label: 'Shortlisted 🎉', count: applications.filter((a) => a.status === 'SHORTLISTED').length },
          { key: 'ACCEPTED', label: 'Hired / Accepted 🤝', count: applications.filter((a) => a.status === 'ACCEPTED').length },
          { key: 'SUBMITTED', label: 'Under Review', count: applications.filter((a) => a.status === 'SUBMITTED').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                activeTab === tab.key ? 'bg-slate-800 text-indigo-300' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-gemini-sm">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs font-semibold text-slate-500">Loading your applications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-slate-200/85 space-y-4 shadow-gemini-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {activeTab === 'ALL' ? 'No Applications Submitted Yet' : `No Applications in ${activeTab}`}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            {activeTab === 'ALL'
              ? 'You have not submitted any proposals yet. Explore active brand campaigns and brief requirements on the marketplace to pitch your creative services.'
              : `You have no applications currently marked as ${activeTab.toLowerCase()}. Check other tabs or browse new briefs.`}
          </p>
          <div className="pt-2">
            <Link
              href="/requirements"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/20 active:scale-95 transition-all"
            >
              Explore Opportunities
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
          <div
            key={app.id}
            className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-gemini-sm hover:border-indigo-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-start gap-4 max-w-2xl">
              <img
                src={app.requirement.logoUrl}
                alt={app.requirement.brandName}
                className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-100 shadow-sm shrink-0"
              />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs text-slate-900">{app.requirement.brandName}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      app.status === 'SHORTLISTED'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : app.status === 'ACCEPTED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 hover:text-indigo-600 transition-colors">
                  <Link href={`/requirements/${app.requirement.slug}`}>{app.requirement.title}</Link>
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span>Category: <strong className="text-slate-700">{app.requirement.category}</strong></span>
                  <span>•</span>
                  <span>{app.requirement.location}</span>
                  <span>•</span>
                  <span>Applied {app.appliedAt}</span>
                </div>

                {app.brandNotes && (
                  <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900">
                    <strong className="font-bold">Client Note: </strong>
                    {app.brandNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Rate Quote & Action */}
            <div className="flex items-center gap-3 self-end md:self-center flex-wrap">
              <div className="text-right mr-2">
                <div className="text-lg font-black text-slate-900">{formatCurrency(app.offeredPrice)}</div>
                <span className="text-[11px] text-slate-400 font-semibold">Delivery in {app.deliveryDays}</span>
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await apiClient(`/conversations/application/${app.id}`, { method: 'POST' });
                    if (res?.data?._id) {
                      window.location.href = `/inbox?conversationId=${res.data._id}`;
                    } else {
                      window.location.href = '/inbox';
                    }
                  } catch (e) {
                    window.location.href = '/inbox';
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                Message Brand
              </button>

              <Link
                href={`/requirements/${app.requirement.slug}`}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
              >
                View Opportunity
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
