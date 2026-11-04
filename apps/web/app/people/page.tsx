'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  MapPin,
  Sparkles,
  ShieldCheck,
  Star,
  Compass,
  Filter,
  Video,
  Building2,
  ArrowRight,
  SlidersHorizontal,
  Navigation,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface Person {
  _id: string;
  type: 'CREATOR' | 'PRODUCTION_TEAM' | 'BRAND';
  name: string;
  slug: string;
  headline: string;
  categoryName: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  city: string;
  area?: string;
  rating?: number;
  reviewCount?: number;
  startingPrice?: number;
  isVerified: boolean;
  isFeatured?: boolean;
}

export default function PeopleDirectoryPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'CREATOR' | 'PRODUCTION_TEAM' | 'BRAND'>('ALL');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);
  const [usingGeo, setUsingGeo] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get('/categories');
        const list = res.data || res;
        if (Array.isArray(list)) setCategories(list);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch people directory
  const fetchPeople = async () => {
    setLoading(true);
    try {
      const results: Person[] = [];

      // If geo is active, use nearby endpoint
      if (usingGeo && coords) {
        const nearbyRes = await apiClient.get(
          `/creators/nearby?lat=${coords.lat}&lng=${coords.lng}&radiusKm=${radiusKm}${
            selectedCategory !== 'ALL' ? `&category=${selectedCategory}` : ''
          }`,
        );
        const nearbyCreators = nearbyRes.data || nearbyRes || [];
        if (Array.isArray(nearbyCreators)) {
          nearbyCreators.forEach((c: any) => {
            results.push({
              _id: c._id,
              type: 'CREATOR',
              name: c.userId?.fullName || c.headline || 'Creator',
              slug: c.slug,
              headline: c.headline,
              categoryName: c.primaryCategoryId?.name || 'Creative Professional',
              avatarUrl: c.userId?.avatarUrl || c.coverImageUrl,
              city: c.location?.city || 'India',
              area: c.location?.area,
              rating: c.averageRating || 5.0,
              reviewCount: c.reviewCount || 0,
              startingPrice: c.startingPrice,
              isVerified: c.verificationStatus === 'VERIFIED',
              isFeatured: c.featured,
            });
          });
        }
      } else {
        // Standard queries based on activeTab
        if (activeTab === 'ALL' || activeTab === 'CREATOR') {
          const creatorParams = new URLSearchParams();
          if (search) creatorParams.set('search', search);
          if (cityFilter) creatorParams.set('city', cityFilter);
          if (selectedCategory !== 'ALL') creatorParams.set('categoryId', selectedCategory);

          const cRes = await apiClient.get(`/creators?${creatorParams.toString()}`).catch(() => ({ data: [] }));
          const creatorsList = cRes.data?.items || cRes.data || [];
          if (Array.isArray(creatorsList)) {
            creatorsList.forEach((c: any) => {
              results.push({
                _id: c._id,
                type: 'CREATOR',
                name: c.userId?.fullName || c.headline || 'Creator',
                slug: c.slug,
                headline: c.headline,
                categoryName: c.primaryCategoryId?.name || 'Creative Professional',
                avatarUrl: c.userId?.avatarUrl || c.coverImageUrl,
                city: c.location?.city || 'India',
                area: c.location?.area,
                rating: c.averageRating || 5.0,
                reviewCount: c.reviewCount || 0,
                startingPrice: c.startingPrice,
                isVerified: c.verificationStatus === 'VERIFIED',
                isFeatured: c.featured,
              });
            });
          }
        }

        if (activeTab === 'ALL' || activeTab === 'PRODUCTION_TEAM') {
          const ptRes = await apiClient.get('/production-teams').catch(() => ({ data: [] }));
          const ptList = ptRes.data?.items || ptRes.data || [];
          if (Array.isArray(ptList)) {
            ptList.forEach((pt: any) => {
              results.push({
                _id: pt._id,
                type: 'PRODUCTION_TEAM',
                name: pt.studioName || 'Production Studio',
                slug: pt.slug,
                headline: pt.tagline || pt.description?.substring(0, 80) || 'Full-Service Production',
                categoryName: 'Production Team',
                avatarUrl: pt.logoUrl || pt.coverImageUrl,
                city: pt.location?.city || 'India',
                area: pt.location?.area,
                rating: 4.9,
                reviewCount: 12,
                startingPrice: pt.startingDayRate,
                isVerified: pt.verificationStatus === 'VERIFIED',
              });
            });
          }
        }

        if (activeTab === 'ALL' || activeTab === 'BRAND') {
          const bRes = await apiClient.get('/brands').catch(() => ({ data: [] }));
          const bList = bRes.data?.items || bRes.data || [];
          if (Array.isArray(bList)) {
            bList.forEach((b: any) => {
              results.push({
                _id: b._id,
                type: 'BRAND',
                name: b.companyName || 'Brand Partner',
                slug: b.slug,
                headline: b.industry || b.description?.substring(0, 80) || 'Marketplace Client',
                categoryName: b.industry || 'Brand',
                avatarUrl: b.logoUrl,
                city: b.location?.city || 'India',
                isVerified: b.verificationStatus === 'VERIFIED',
              });
            });
          }
        }
      }

      setPeople(results);
    } catch (err) {
      console.error('Failed to query directory', err);
      setPeople([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, [activeTab, selectedCategory, usingGeo, radiusKm]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUsingGeo(true);
      },
      () => {
        // Fallback demo coordinates: Bangalore City Center
        setCoords({ lat: 12.9716, lng: 77.5946 });
        setUsingGeo(true);
      },
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
            <Compass className="w-4 h-4" /> Comprehensive People & Talent Directory
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Discover Verified Creators, Studios & Brands
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Explore independent creators, full-scale production crews, and hiring brands. Filter dynamically by category, skills, and proximity.
          </p>
        </div>

        {/* Proximity Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (usingGeo) {
                setUsingGeo(false);
                setCoords(null);
              } else {
                handleUseMyLocation();
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              usingGeo
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-gemini-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${usingGeo ? 'text-white' : 'text-indigo-600'}`} />
            {usingGeo ? 'Nearby Discovery Active' : 'Find Nearby Talent'}
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit text-xs font-bold">
        {[
          { key: 'ALL', label: 'All People', icon: Users },
          { key: 'CREATOR', label: 'Creators & Talent', icon: Sparkles },
          { key: 'PRODUCTION_TEAM', label: 'Production Teams', icon: Video },
          { key: 'BRAND', label: 'Brands & Clients', icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setUsingGeo(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search and Proximity Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPeople()}
            placeholder="Search by name, role, skills, or studio..."
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPeople()}
              placeholder="City (e.g. Bangalore, Mumbai)"
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full py-2.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
          >
            <option value={10}>Within 10 km</option>
            <option value={25}>Within 25 km</option>
            <option value={50}>Within 50 km</option>
            <option value={100}>Within 100 km</option>
          </select>
          <button
            onClick={fetchPeople}
            className="px-4 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.slice(0, 12).map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat._id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* People Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading directory records...
        </div>
      ) : people.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
          <p className="max-w-md mx-auto">
            No people or studios found matching your search. Try broadening your radius or resetting your search filters.
          </p>
          <button
            onClick={() => {
              setActiveTab('ALL');
              setSearch('');
              setCityFilter('');
              setRadiusKm(25);
              setUsingGeo(false);
              setCoords(null);
              setSelectedCategory('ALL');
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', window.location.pathname);
              }
            }}
            className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map((p) => {
            const profileLink =
              p.type === 'CREATOR'
                ? `/creator/${p.slug}`
                : p.type === 'PRODUCTION_TEAM'
                ? `/production/${p.slug}`
                : `/brand/${p.slug}`;

            return (
              <div
                key={p._id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-gemini-sm hover:shadow-gemini-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div className="p-6">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                      {p.categoryName}
                    </span>
                    {p.isVerified && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-indigo-600">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        p.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.area ? `${p.area}, ` : ''}{p.city}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">{p.headline}</p>

                  {/* Metrics */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    {p.rating !== undefined ? (
                      <div className="flex items-center gap-1 font-bold text-slate-900">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{p.rating.toFixed(1)}</span>
                        <span className="text-[11px] text-slate-400 font-normal">({p.reviewCount})</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Verified Client</span>
                    )}

                    {p.startingPrice ? (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block leading-tight">Starting at</span>
                        <span className="font-black text-slate-900">₹{p.startingPrice.toLocaleString()}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Card Action */}
                <Link
                  href={profileLink}
                  className="px-6 py-3 bg-slate-50 hover:bg-indigo-50 border-t border-slate-100 text-xs font-bold text-slate-700 hover:text-indigo-700 transition-colors flex items-center justify-between"
                >
                  <span>View Full Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

