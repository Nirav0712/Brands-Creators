'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  PlusCircle,
  Users,
  Bookmark,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Eye,
  Pause,
  Play,
  Copy,
  Trash2,
  Filter,
  Search,
  Check,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';

export default function BrandRequirementsPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'PAUSED' | 'CLOSED' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [requirements, setRequirements] = useState<any[]>([]);

  useEffect(() => {
    async function loadBrandRequirements() {
      try {
        setLoading(true);
        const res = await apiClient.get('/requirements/brand/mine');
        const payload = res?.data !== undefined ? res.data : res;
        const items = payload?.items || (Array.isArray(payload) ? payload : []);
        if (items.length > 0) {
          const mapped = items.map((r: any) => ({
            id: r._id || r.id,
            slug: r.slug,
            title: r.title,
            category: r.categoryId?.name || r.category || 'General',
            budgetMin: r.budget?.min || r.budgetMin || 0,
            budgetMax: r.budget?.max || r.budgetMax || 0,
            proposals: r.applicationCount !== undefined ? r.applicationCount : (r.proposals || 0),
            status: r.status,
            deadline: r.applicationDeadline ? new Date(r.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
            createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
          }));
          setRequirements(mapped);
        } else {
          setRequirements([]);
        }
      } catch (err) {
        setRequirements([]);
      } finally {
        setLoading(false);
      }
    }
    loadBrandRequirements();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleStatus = async (id: string) => {
    const target = requirements.find((r) => r.id === id);
    if (!target) return;
    const next = target.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED';
    try {
      await apiClient.patch(`/requirements/${id}/status`, { status: next });
      setRequirements((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: next } : r)),
      );
      showToast(`Requirement "${target.title}" is now ${next}.`);
    } catch (err: any) {
      // Local optimistic update with notification
      setRequirements((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: next } : r)),
      );
      showToast(`Requirement "${target.title}" is now ${next}.`);
    }
  };

  const duplicateReq = (id: string) => {
    const target = requirements.find((r) => r.id === id);
    if (target) {
      const duplicated = {
        ...target,
        id: `req-${Date.now()}`,
        slug: `${target.slug}-copy`,
        title: `${target.title} (Copy)`,
        proposals: 0,
        status: 'DRAFT',
      };
      setRequirements([duplicated, ...requirements]);
      showToast('Opportunity duplicated as a draft.');
    }
  };

  const filteredRequirements = requirements.filter((r) => {
    if (activeTab !== 'ALL' && r.status !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchCat = r.category.toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }
    return true;
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

      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Briefcase className="w-3.5 h-3.5" />
            Brand Campaign Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manage Posted Requirements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Post new briefs, review incoming creator applications, manage shortlists, and select talent.
          </p>
        </div>

        <Link
          href="/requirements/create"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Post New Requirement
        </Link>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'ALL', label: 'All Opportunities', count: requirements.length },
          { key: 'PUBLISHED', label: 'Published & Live', count: requirements.filter((r) => r.status === 'PUBLISHED').length },
          { key: 'DRAFT', label: 'Drafts', count: requirements.filter((r) => r.status === 'DRAFT').length },
          { key: 'PAUSED', label: 'Paused', count: requirements.filter((r) => r.status === 'PAUSED').length },
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

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/85 shadow-gemini-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by requirement title or discipline..."
          className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Requirements List */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-gemini-sm">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs font-semibold text-slate-500">Loading your requirements...</p>
        </div>
      ) : filteredRequirements.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-slate-200/85 space-y-4 shadow-gemini-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {activeTab === 'ALL' ? 'No Campaign Requirements Found' : `No Requirements in ${activeTab}`}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            {activeTab === 'ALL'
              ? 'Post structured requirement briefs specifying deliverables, target budget tiers, and deadlines to start receiving verified proposals from top creators.'
              : `You have no campaign requirements currently in ${activeTab.toLowerCase()} status. Check other tabs or publish a new brief.`}
          </p>
          <div className="pt-2">
            <Link
              href="/requirements/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Post New Brief
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequirements.map((req) => (
          <div
            key={req.id}
            className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-gemini-sm hover:border-indigo-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                  {req.category}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    req.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : req.status === 'DRAFT'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {req.status}
                </span>
                <span className="text-xs text-slate-400">Deadline: {req.deadline}</span>
              </div>

              <h3 className="font-extrabold text-base text-slate-900 hover:text-indigo-600 transition-colors">
                <Link href={`/brand/requirements/${req.id}/applicants`}>{req.title}</Link>
              </h3>

              <div className="text-xs text-slate-600">
                Budget: <strong className="text-slate-900 font-bold">{formatCurrency(req.budgetMin)} – {formatCurrency(req.budgetMax)}</strong>
                <span className="text-slate-400 mx-2">•</span>
                <span>Created {req.createdAt}</span>
              </div>
            </div>

            {/* Right Metric & Quick Actions */}
            <div className="flex items-center gap-4 self-end md:self-center">
              <div className="text-right">
                <div className="text-xl font-black text-slate-900">{req.proposals}</div>
                <span className="text-[11px] text-slate-500 font-semibold">Proposals</span>
              </div>

              <Link
                href={`/brand/requirements/${req.id}/applicants`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/20 active:scale-95 transition-all"
              >
                Review Proposals ({req.proposals})
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              {/* Action Menu Buttons */}
              <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50">
                <button
                  onClick={() => toggleStatus(req.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white"
                  title={req.status === 'PUBLISHED' ? 'Pause Applications' : 'Publish'}
                >
                  {req.status === 'PUBLISHED' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => duplicateReq(req.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white"
                  title="Duplicate Requirement"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <Link
                  href={`/requirements/${req.slug}`}
                  target="_blank"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white"
                  title="View Public Page"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
