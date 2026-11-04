'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Plus,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { ProjectStatus } from '@brands-creators/types';

export default function ProjectsDashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'IN_REVIEW' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'>('ALL');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeFilter !== 'ALL') {
        if (activeFilter === 'ACTIVE') {
          params.append('status', ProjectStatus.IN_PROGRESS);
        } else {
          params.append('status', activeFilter);
        }
      }

      const res = await apiClient(`/projects?${params.toString()}`);
      if (res?.data?.items) {
        setProjects(res.data.items);
      } else if (Array.isArray(res?.data)) {
        setProjects(res.data);
      } else {
        setProjects([]);
      }
    } catch (err) {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, activeFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_REVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ON_HOLD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Collaboration Projects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage active contracts, milestones, deliverable submissions, and client approvals.
          </p>
        </div>

        <Link
          href="/inbox"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
        >
          Open Unified Inbox
        </Link>
      </div>

      {/* Search & Filter Pills */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-gemini-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by title or BC number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Projects' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'IN_REVIEW', label: 'In Review' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'ON_HOLD', label: 'On Hold' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs font-semibold text-slate-400">Loading your projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 space-y-4 shadow-gemini-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Projects are created automatically when an application proposal is accepted by the Brand.
          </p>
          <div className="pt-2">
            <Link
              href="/requirements"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              Explore Opportunities
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj._id}
              className="bg-white rounded-3xl p-6 border border-slate-200/85 hover:border-indigo-300 transition-all shadow-gemini-sm flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {proj.projectNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${getStatusBadge(
                      proj.status,
                    )}`}
                  >
                    {proj.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{proj.title}</h3>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {proj.description}
                </p>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Progress</span>
                    <span className="text-indigo-600">{proj.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${proj.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Budget</span>
                  <div className="font-bold text-slate-900">
                    {formatCurrency(proj.approvedBudget)}
                  </div>
                </div>

                <Link
                  href={`/projects/${proj._id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition-colors"
                >
                  Workspace
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
