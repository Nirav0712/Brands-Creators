'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Star,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Eye,
  Bookmark,
  Check,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';

export default function AdminApplicationsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'SHORTLISTED' | 'ACCEPTED' | 'SUBMITTED' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/applications?limit=50');
      const items = res?.data?.items || res?.items || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      if (Array.isArray(items) && items.length > 0) {
        const mapped = items.map((app: any) => ({
          id: app._id || app.id,
          applicant: {
            name: app.creatorId?.userId?.fullName || 'Creator Applicant',
            avatar: app.creatorId?.userId?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            headline: app.creatorId?.headline || 'Creative Talent',
            city: app.creatorId?.location?.city || 'India',
          },
          requirement: {
            title: app.requirementId?.title || 'Brand Requirement',
            slug: app.requirementId?.slug || '',
          },
          brand: app.requirementId?.brandId?.companyName || 'Brand Partner',
          matchScore: app.matchScore || 85,
          offeredPrice: app.pitchRate || app.offeredPrice || app.rate || 25000,
          deliveryDays: app.deliveryDays ? `${app.deliveryDays} Days` : (app.estimatedDelivery || '3 Days'),
          status: app.status,
          appliedAt: app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Recent',
        }));
        setApplications(mapped);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.warn('Failed to load applications from API:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const filtered = applications.filter((app) => {
    if (activeTab !== 'ALL' && app.status !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchApplicant = app.applicant.name.toLowerCase().includes(q);
      const matchReq = app.requirement.title.toLowerCase().includes(q);
      const matchBrand = app.brand.toLowerCase().includes(q);
      if (!matchApplicant && !matchReq && !matchBrand) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <FileText className="w-3.5 h-3.5" />
            Marketplace Activity & Proposals
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Proposals & Applications Oversight
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor all talent applications, match scores, rate comparisons, and brand shortlisting activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-gemini-sm">
            Total Proposals: <strong className="text-slate-900">{applications.length} Submissions</strong>
          </div>
          <button
            onClick={loadApplications}
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
          { key: 'ALL', label: 'All Proposals', count: applications.length },
          { key: 'SHORTLISTED', label: 'Shortlisted 🎉', count: applications.filter((a) => a.status === 'SHORTLISTED').length },
          { key: 'ACCEPTED', label: 'Accepted / Hired 🤝', count: applications.filter((a) => a.status === 'ACCEPTED').length },
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

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/85 shadow-gemini-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter proposals by applicant, requirement, or brand..."
          className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/85 shadow-gemini-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Applicant Creator</th>
                <th className="py-3.5 px-4">Opportunity & Client</th>
                <th className="py-3.5 px-4">Match Score</th>
                <th className="py-3.5 px-4">Offered Quote</th>
                <th className="py-3.5 px-4">Delivery</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading applications oversight from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No proposals found matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img
                        src={app.applicant.avatar}
                        alt={app.applicant.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{app.applicant.name}</div>
                        <div className="text-slate-400 text-[11px]">{app.applicant.city}, India</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 max-w-xs">
                    <div className="font-bold text-slate-900 truncate">{app.requirement.title}</div>
                    <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">Client: {app.brand}</div>
                  </td>

                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      {app.matchScore}%
                    </span>
                  </td>

                  <td className="py-4 px-4 font-black text-slate-900">
                    {formatCurrency(app.offeredPrice)}
                  </td>

                  <td className="py-4 px-4 text-slate-600 font-medium">{app.deliveryDays}</td>

                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        app.status === 'SHORTLISTED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : app.status === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-right">
                    <a
                      href={`http://localhost:3000/requirements/${app.requirement.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 inline-flex items-center"
                      title="View Public Brief"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
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
