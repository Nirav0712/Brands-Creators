'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AdminProjectsManagementPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchAdminProjects = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/projects', {
        params: {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: search || undefined,
        },
      });
      if (data?.data?.items) {
        setProjects(data.data.items);
      } else if (Array.isArray(data?.data)) {
        setProjects(data.data);
      } else if (Array.isArray(data?.items)) {
        setProjects(data.items);
      } else {
        setProjects([]);
      }
    } catch (e) {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchAdminProjects(), 250);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Project Oversight & Moderation</h1>
          <p className="text-xs text-slate-500 mt-1">Audit active client contracts, milestones, deliverables, and dispute status across the marketplace.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Total Projects: {projects.length}
          </span>
          <button
            onClick={fetchAdminProjects}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by project number, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'CONFIRMED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'DISPUTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === st ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Project Number</th>
                <th className="py-4 px-6">Campaign Title</th>
                <th className="py-4 px-6">Brand Client</th>
                <th className="py-4 px-6">Professional</th>
                <th className="py-4 px-6">Budget</th>
                <th className="py-4 px-6">Progress</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading project records...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching project records found.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{p.projectNumber}</td>
                    <td className="py-4 px-6 font-bold text-slate-900 max-w-xs truncate">{p.title}</td>
                    <td className="py-4 px-6">{p.brandId?.fullName || p.brandId?.email || 'Brand Client'}</td>
                    <td className="py-4 px-6">{p.professionalId?.fullName || p.professionalId?.email || 'Creative Talent'}</td>
                    <td className="py-4 px-6 font-bold text-slate-900">₹{(p.approvedBudget || 0).toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600">{p.progress || 0}%</span>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full" style={{ width: `${p.progress || 0}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold border bg-slate-100 border-slate-200 text-slate-700">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <a
                        href={`http://localhost:3000/projects/${p._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
