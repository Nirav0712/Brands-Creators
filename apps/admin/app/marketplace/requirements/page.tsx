'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Search,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Star,
  Eye,
  Check,
  X,
  Pause,
  Play,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';

export default function AdminRequirementsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLISHED' | 'PENDING' | 'PAUSED' | 'CLOSED'>('ALL');
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadRequirements = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/requirements?status=ALL&limit=50');
      const items = res?.data?.items || res?.items || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      if (Array.isArray(items) && items.length > 0) {
        const mapped = items.map((r: any) => ({
          id: r._id || r.id,
          slug: r.slug,
          title: r.title,
          brand: r.brandId?.companyName || 'Brand Company',
          category: r.categoryId?.name || 'Commercial Project',
          budgetMin: r.budget?.min || 20000,
          budgetMax: r.budget?.max || 50000,
          proposals: r.applicationCount || r.applicationsCount || 0,
          status: r.status,
          isFeatured: Boolean(r.isFeatured),
          deadline: r.applicationDeadline ? new Date(r.applicationDeadline).toLocaleDateString() : 'Rolling',
          createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent',
        }));
        setRequirements(mapped);
      } else {
        setRequirements([]);
      }
    } catch (err) {
      console.warn('Failed to load requirements from API:', err);
      setRequirements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, []);

  const toggleStatus = async (id: string) => {
    const current = requirements.find((r) => r.id === id);
    const next = current?.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED';
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: next } : r)),
    );
    showToast(`Opportunity status changed to ${next}.`);
    try {
      await apiClient.patch(`/requirements/${id}/status`, { status: next });
    } catch (err) {
      console.warn('API status patch failed, reverted locally if needed:', err);
    }
  };

  const toggleFeatured = (id: string) => {
    setRequirements((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const next = !r.isFeatured;
          showToast(`Featured status set to ${next ? 'Featured' : 'Standard'}.`);
          return { ...r, isFeatured: next };
        }
        return r;
      }),
    );
  };

  const approveRequirement = async (id: string) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'PUBLISHED' } : r)),
    );
    showToast('Requirement approved and published to marketplace.');
    try {
      await apiClient.patch(`/requirements/${id}/status`, { status: 'PUBLISHED' });
    } catch (err) {
      console.warn('API approval failed:', err);
    }
  };

  const filtered = requirements.filter((r) => {
    if (activeTab !== 'ALL' && r.status !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchBrand = r.brand.toLowerCase().includes(q);
      const matchCat = r.category.toLowerCase().includes(q);
      if (!matchTitle && !matchBrand && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
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
            Marketplace Moderation & Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Client Requirements & Opportunities
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Moderate brand briefs, verify budget tiers, feature high-value commercial shoots, and monitor proposals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-gemini-sm">
            Total Briefs: <strong className="text-slate-900">{requirements.length} Opportunities</strong>
          </div>
          <button
            onClick={loadRequirements}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-gemini-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'ALL', label: 'All Opportunities', count: requirements.length },
          { key: 'PUBLISHED', label: 'Published & Live', count: requirements.filter((r) => r.status === 'PUBLISHED').length },
          { key: 'PENDING', label: 'Pending Moderation', count: requirements.filter((r) => r.status === 'PENDING').length },
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

      {/* Search Filter */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/85 shadow-gemini-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter requirements by title, brand name, or category..."
          className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/85 shadow-gemini-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Requirement Opportunity</th>
                <th className="py-3.5 px-4">Client Brand</th>
                <th className="py-3.5 px-4">Discipline</th>
                <th className="py-3.5 px-4">Budget Scope</th>
                <th className="py-3.5 px-4">Applications</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading requirements catalog from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    <Briefcase className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No requirements found matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6 max-w-xs">
                    <div className="font-extrabold text-slate-900 truncate">{req.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Deadline: {req.deadline}</div>
                  </td>

                  <td className="py-4 px-4 font-bold text-slate-800">{req.brand}</td>
                  <td className="py-4 px-4 font-semibold text-indigo-600">{req.category}</td>

                  <td className="py-4 px-4 font-extrabold text-slate-900">
                    {formatCurrency(req.budgetMin)} – {formatCurrency(req.budgetMax)}
                  </td>

                  <td className="py-4 px-4">
                    <span className="font-bold text-slate-800">{req.proposals}</span>
                    <span className="text-slate-400 text-[11px] ml-1">Proposals</span>
                  </td>

                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Featured toggle */}
                      <button
                        onClick={() => toggleFeatured(req.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          req.isFeatured
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'border-slate-200 text-slate-400 hover:text-amber-500'
                        }`}
                        title="Toggle Featured Spotlight"
                      >
                        <Star className={`w-3.5 h-3.5 ${req.isFeatured ? 'fill-current' : ''}`} />
                      </button>

                      {/* Approve if Pending */}
                      {req.status === 'PENDING' && (
                        <button
                          onClick={() => approveRequirement(req.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                        >
                          Approve
                        </button>
                      )}

                      {/* Pause / Resume */}
                      {req.status !== 'PENDING' && (
                        <button
                          onClick={() => toggleStatus(req.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px]"
                        >
                          {req.status === 'PUBLISHED' ? 'Pause' : 'Resume'}
                        </button>
                      )}

                      {/* Public Link */}
                      <a
                        href={`http://localhost:3000/requirements/${req.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500"
                        title="View Public Page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
