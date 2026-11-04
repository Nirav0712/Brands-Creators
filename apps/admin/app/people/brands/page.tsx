'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Search, ShieldCheck, Briefcase, ExternalLink, RefreshCw } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

export default function AdminBrandsPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/brands?limit=50');
      const items = res?.data?.items || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      if (Array.isArray(items) && items.length > 0) {
        const mapped = items.map((b: any) => ({
          id: b._id || b.id,
          slug: b.slug,
          name: b.companyName || b.name || 'Brand Company',
          industry: b.industry || 'Commercial Client',
          city: b.location?.city || b.city || 'Pan-India',
          activeRequirements: b.activeRequirementsCount || 0,
          teamSize: b.teamMembers?.length ? b.teamMembers.length + 1 : 1,
          verificationStatus: b.verificationStatus || 'VERIFIED',
          logo: b.logoUrl || b.logo || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80',
        }));
        setBrands(mapped);
      } else {
        setBrands([]);
      }
    } catch (err) {
      console.warn('Failed to load brands from API:', err);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const filteredBrands = brands.filter((brand) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      brand.name?.toLowerCase().includes(q) ||
      brand.industry?.toLowerCase().includes(q) ||
      brand.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            Brand Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Brands & Commercial Clients
          </h1>
        </div>
        <button
          onClick={loadBrands}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/85 shadow-gemini-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter brands by company name or industry..."
          className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/85 shadow-gemini-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Company / Brand</th>
                <th className="py-3.5 px-4">Industry Domain</th>
                <th className="py-3.5 px-4">HQ Location</th>
                <th className="py-3.5 px-4">Active Requirements</th>
                <th className="py-3.5 px-4">Team Size</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading brand directory from database...
                  </td>
                </tr>
              ) : filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    <Building2 className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No brands found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                      />
                      <div className="font-bold text-slate-900 text-sm">{brand.name}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-700">{brand.industry}</td>
                  <td className="py-4 px-4 text-slate-500">{brand.city}, India</td>
                  <td className="py-4 px-4 font-bold text-indigo-600">
                    {brand.activeRequirements} Active Leads
                  </td>
                  <td className="py-4 px-4 text-slate-600">{brand.teamSize} Employees</td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      {brand.verificationStatus}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      View Profile
                    </button>
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
