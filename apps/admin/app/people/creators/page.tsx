'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  ShieldCheck,
  Star,
  MoreVertical,
  Eye,
  CheckCircle2,
  XCircle,
  Filter,
  SlidersHorizontal,
  ExternalLink,
  Edit,
  Ban,
  RotateCcw,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';

export default function AdminCreatorsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'SUSPENDED' | 'FEATURED'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<any[]>([]);

  const loadCreators = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/creators?limit=50');
      const items = res?.data?.items || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      if (Array.isArray(items) && items.length > 0) {
        const mapped = items.map((c: any) => ({
          id: c._id || c.id,
          name: c.userId?.fullName || c.name || 'Creator',
          username: c.userId?.username || c.slug || 'creator',
          email: c.userId?.email || 'creator@example.com',
          category: c.primaryCategoryId?.name || c.category || 'Creator',
          subcategory: c.skills?.[0] || 'Content',
          city: c.location?.city || c.city || 'India',
          startingPrice: c.startingPrice || 10000,
          pricingModel: c.pricingModel || 'PER_PROJECT',
          rating: c.stats?.rating || c.rating || 4.8,
          reviewCount: c.stats?.reviewCount || c.reviewCount || 10,
          verificationStatus: c.verificationStatus || 'VERIFIED',
          visibility: c.visibilityStatus || 'PUBLISHED',
          isFeatured: Boolean(c.isFeatured),
          profileCompletion: c.profileCompletionScore || 85,
          avatar: c.userId?.avatarUrl || c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        }));
        setCreators(mapped);
      } else {
        setCreators([]);
      }
    } catch (err) {
      console.warn('Failed to load creators from API:', err);
      setCreators([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreators();
  }, []);

  const toggleVerification = (id: string) => {
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const next = c.verificationStatus === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED';
          return { ...c, verificationStatus: next };
        }
        return c;
      }),
    );
  };

  const toggleSuspension = (id: string) => {
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const next = c.visibility === 'SUSPENDED' ? 'PUBLISHED' : 'SUSPENDED';
          return { ...c, visibility: next };
        }
        return c;
      }),
    );
  };

  const toggleFeatured = (id: string) => {
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return { ...c, isFeatured: !c.isFeatured };
        }
        return c;
      }),
    );
  };

  const filteredCreators = creators.filter((c) => {
    if (activeTab === 'VERIFIED' && c.verificationStatus !== 'VERIFIED') return false;
    if (activeTab === 'PENDING' && c.verificationStatus !== 'PENDING') return false;
    if (activeTab === 'SUSPENDED' && c.visibility !== 'SUSPENDED') return false;
    if (activeTab === 'FEATURED' && !c.isFeatured) return false;

    if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchUser = c.username.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchCat = c.category.toLowerCase().includes(q);
      const matchCity = c.city.toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchEmail && !matchCat && !matchCity) return false;
    }

    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" />
            Talent Moderation & Roster
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Creators & Creative Professionals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage creative profiles, verify pro credentials, audit completion, and moderate platform visibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-gemini-sm">
            Total Roster: <strong className="text-slate-900">{creators.length} Profiles</strong>
          </div>
          <button
            onClick={loadCreators}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-gemini-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'ALL', label: 'All Profiles', count: creators.length },
          { key: 'VERIFIED', label: 'Verified Pro', count: creators.filter((c) => c.verificationStatus === 'VERIFIED').length },
          { key: 'PENDING', label: 'Pending Review', count: creators.filter((c) => c.verificationStatus === 'PENDING').length },
          { key: 'FEATURED', label: 'Featured Spotlight', count: creators.filter((c) => c.isFeatured).length },
          { key: 'SUSPENDED', label: 'Suspended', count: creators.filter((c) => c.visibility === 'SUSPENDED').length },
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

      {/* Search and Category Filter */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/85 shadow-gemini-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by creator name, @username, email, or city..."
            className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filter by Discipline"
          className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Disciplines</option>
          <option value="Influencers">Influencers</option>
          <option value="Production">Production</option>
          <option value="Photography">Photography</option>
          <option value="Talent">Talent</option>
          <option value="Design">Design</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/85 shadow-gemini-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Creator / Talent</th>
                <th className="py-3.5 px-4">Discipline</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Starting Rate</th>
                <th className="py-3.5 px-4">Profile Score</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4">Visibility</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading creator directory from database...
                  </td>
                </tr>
              ) : filteredCreators.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    <Users className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No creators found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredCreators.map((creator) => (
                  <tr key={creator.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Creator info */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img
                        src={creator.avatar}
                        alt={creator.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 text-sm">{creator.name}</span>
                          {creator.isFeatured && (
                            <span title="Featured">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px]">@{creator.username} • {creator.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Discipline */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-800">{creator.category}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{creator.subcategory}</div>
                  </td>

                  {/* Location */}
                  <td className="py-4 px-4 text-slate-600 font-medium">{creator.city}, India</td>

                  {/* Starting Rate */}
                  <td className="py-4 px-4">
                    <div className="font-extrabold text-slate-900">{formatCurrency(creator.startingPrice)}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">/{creator.pricingModel?.replace('PER_', '')}</div>
                  </td>

                  {/* Profile Score */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            creator.profileCompletion >= 80
                              ? 'bg-emerald-500'
                              : creator.profileCompletion >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${creator.profileCompletion}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">{creator.profileCompletion}%</span>
                    </div>
                  </td>

                  {/* Verification Status */}
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        creator.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : creator.verificationStatus === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {creator.verificationStatus}
                    </span>
                  </td>

                  {/* Visibility */}
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        creator.visibility === 'PUBLISHED'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {creator.visibility}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Editor Link */}
                      <Link
                        href={`/people/creators/${creator.id}`}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                        title="Edit in Contextual Profile Editor"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>

                      {/* Feature toggle */}
                      <button
                        onClick={() => toggleFeatured(creator.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          creator.isFeatured
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'border-slate-200 text-slate-400 hover:text-amber-500'
                        }`}
                        title="Toggle Featured"
                      >
                        <Star className={`w-3.5 h-3.5 ${creator.isFeatured ? 'fill-current' : ''}`} />
                      </button>

                      {/* Verify toggle */}
                      <button
                        onClick={() => toggleVerification(creator.id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px]"
                      >
                        {creator.verificationStatus === 'VERIFIED' ? 'Revoke' : 'Verify'}
                      </button>

                      {/* Suspend toggle */}
                      <button
                        onClick={() => toggleSuspension(creator.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          creator.visibility === 'SUSPENDED'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'border-slate-200 text-slate-400 hover:text-rose-600'
                        }`}
                        title={creator.visibility === 'SUSPENDED' ? 'Restore Profile' : 'Suspend Profile'}
                      >
                        {creator.visibility === 'SUSPENDED' ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
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
