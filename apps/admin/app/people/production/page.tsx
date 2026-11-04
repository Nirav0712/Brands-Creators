'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Video,
  Search,
  ShieldCheck,
  Star,
  Edit,
  Ban,
  RotateCcw,
  Sparkles,
  Layers,
  MapPin,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';

export default function AdminProductionPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'SUSPENDED'>('ALL');
  const [loading, setLoading] = useState(false);

  const [studios, setStudios] = useState<any[]>([
    {
      id: 'pt-01',
      name: 'Lumina Studio & Co.',
      slug: 'lumina-studios',
      city: 'Mumbai',
      teamSize: 18,
      dayRate: 95000,
      equipmentCount: 14,
      specialties: ['Ad Films', 'VFX', 'Studio Stages', 'Commercial Cast'],
      rating: 4.9,
      reviewCount: 29,
      verificationStatus: 'VERIFIED',
      visibility: 'PUBLISHED',
      isFeatured: true,
      logo: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'pt-02',
      name: 'Apex Motion Labs',
      slug: 'apex-motion-labs',
      city: 'Bangalore',
      teamSize: 12,
      dayRate: 65000,
      equipmentCount: 8,
      specialties: ['FPV Drones', 'High-Speed Phantom', 'Color Grading'],
      rating: 4.8,
      reviewCount: 19,
      verificationStatus: 'VERIFIED',
      visibility: 'PUBLISHED',
      isFeatured: false,
      logo: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'pt-03',
      name: 'Red Dot Filmworks',
      slug: 'red-dot-films',
      city: 'Delhi NCR',
      teamSize: 8,
      dayRate: 45000,
      equipmentCount: 6,
      specialties: ['Music Videos', 'Short Documentaries', 'Reel Campaigns'],
      rating: 4.7,
      reviewCount: 12,
      verificationStatus: 'PENDING',
      visibility: 'PUBLISHED',
      isFeatured: false,
      logo: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=200&q=80',
    },
  ]);

  const loadStudios = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/production-teams?limit=50');
      const items = res?.data || (Array.isArray(res) ? res : []);
      if (items.length > 0) {
        const mapped = items.map((p: any) => ({
          id: p._id || p.id,
          name: p.studioName || p.name || 'Production Studio',
          slug: p.slug,
          city: p.location?.city || p.city || 'India',
          teamSize: p.teamSize || 10,
          dayRate: p.startingDayRate || 50000,
          equipmentCount: p.equipmentRoster?.length || 5,
          specialties: p.specialties?.length ? p.specialties : ['Ad Films', 'Commercial Shoots'],
          rating: p.stats?.rating || 4.8,
          reviewCount: p.stats?.reviewCount || 10,
          verificationStatus: p.verificationStatus || 'VERIFIED',
          visibility: p.visibilityStatus || 'PUBLISHED',
          isFeatured: Boolean(p.isFeatured),
          logo: p.logoUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=200&q=80',
        }));
        setStudios(mapped);
      }
    } catch (err) {
      console.warn('Failed to load production teams from API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudios();
  }, []);

  const toggleVerification = (id: string) => {
    setStudios((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const next = s.verificationStatus === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED';
          return { ...s, verificationStatus: next };
        }
        return s;
      }),
    );
  };

  const toggleSuspension = (id: string) => {
    setStudios((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const next = s.visibility === 'SUSPENDED' ? 'PUBLISHED' : 'SUSPENDED';
          return { ...s, visibility: next };
        }
        return s;
      }),
    );
  };

  const filteredStudios = studios.filter((s) => {
    if (activeTab === 'VERIFIED' && s.verificationStatus !== 'VERIFIED') return false;
    if (activeTab === 'PENDING' && s.verificationStatus !== 'PENDING') return false;
    if (activeTab === 'SUSPENDED' && s.visibility !== 'SUSPENDED') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchCity = s.city.toLowerCase().includes(q);
      const matchSpec = s.specialties?.some((spec: any) => String(spec).toLowerCase().includes(q));
      if (!matchName && !matchCity && !matchSpec) return false;
    }

    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Video className="w-3.5 h-3.5" />
            Production House Roster
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Production Teams & Studios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage commercial production houses, equipment inventory verification, day rates, and studio profiles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-gemini-sm">
            Total Studios: <strong className="text-slate-900">{studios.length} Teams</strong>
          </div>
          <button
            onClick={loadStudios}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-gemini-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'ALL', label: 'All Studios', count: studios.length },
          { key: 'VERIFIED', label: 'Verified Studios', count: studios.filter((s) => s.verificationStatus === 'VERIFIED').length },
          { key: 'PENDING', label: 'Pending Review', count: studios.filter((s) => s.verificationStatus === 'PENDING').length },
          { key: 'SUSPENDED', label: 'Suspended', count: studios.filter((s) => s.visibility === 'SUSPENDED').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
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
          placeholder="Filter studios by name, city, or equipment specialty..."
          className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Studios Table */}
      <div className="bg-white rounded-3xl border border-slate-200/85 shadow-gemini-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Studio & Production Team</th>
                <th className="py-3.5 px-4">HQ City</th>
                <th className="py-3.5 px-4">Team Size</th>
                <th className="py-3.5 px-4">Standard Day Rate</th>
                <th className="py-3.5 px-4">Specialties</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudios.map((studio) => (
                <tr key={studio.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img
                        src={studio.logo}
                        alt={studio.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{studio.name}</div>
                        <div className="text-slate-400 text-[11px] font-mono">/{studio.slug}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-slate-600 font-medium">{studio.city}, India</td>
                  <td className="py-4 px-4 text-slate-700 font-bold">{studio.teamSize} Crew Members</td>
                  <td className="py-4 px-4 font-extrabold text-slate-900">{formatCurrency(studio.dayRate)}/day</td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {studio.specialties?.slice(0, 2).map((s: any, idx: number) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {s}
                        </span>
                      ))}
                      {studio.specialties.length > 2 && (
                        <span className="text-[10px] text-slate-400 font-bold self-center">
                          +{studio.specialties.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        studio.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {studio.verificationStatus}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleVerification(studio.id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px]"
                      >
                        {studio.verificationStatus === 'VERIFIED' ? 'Revoke' : 'Verify'}
                      </button>
                      <button
                        onClick={() => toggleSuspension(studio.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600"
                        title="Suspend / Restore"
                      >
                        {studio.visibility === 'SUSPENDED' ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
