'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  PlusCircle,
  Filter,
  MapPin,
  IndianRupee,
  Calendar,
  Users,
  Briefcase,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { RequirementCard } from '../../components/requirement-card';

export default function RequirementsMarketplacePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('LATEST');
  const [requirements, setRequirements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial rich fallback requirements representing production opportunities
  const fallbackRequirements = [
    {
      _id: 'req-01',
      slug: 'direct-response-ugc-skincare-launch-mumbai',
      title: 'High-Impact Direct Response UGC Videos for Skincare Launch',
      description: 'Seeking 3 verified UGC creators for authentic before/after reviews and skincare unboxing reels. Products and hooks provided. Fast 3-day turnaround required.',
      budget: { min: 25000, max: 60000, currency: 'INR' },
      budgetType: 'RANGE',
      applicationDeadline: new Date(Date.now() + 6 * 86400000),
      startDate: new Date(Date.now() + 10 * 86400000),
      applicationCount: 14,
      professionalsRequired: 3,
      requiredSkills: ['UGC Video', 'Skincare Demo', 'Reel Editing', 'Hook Scripting'],
      requiredLanguages: ['English', 'Hindi'],
      targetPlatforms: ['Instagram', 'Meta Ads'],
      targetIndustry: 'D2C Skincare & Beauty',
      deliverables: ['3x 9:16 UGC Videos (4K)', '2x Raw B-Roll Hooks', 'Full Ad Usage Rights (90 Days)'],
      location: { city: 'Mumbai', country: 'India', isRemote: true },
      brandId: {
        companyName: 'Glow Botanics India',
        slug: 'glow-botanics',
        logoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80',
        verificationStatus: 'VERIFIED',
      },
      categoryId: { name: 'Influencers', slug: 'influencers' },
    },
    {
      _id: 'req-02',
      slug: 'commercial-fashion-lookbook-campaign-jaipur',
      title: 'Commercial Fashion Lookbook & Campaign Videography',
      description: 'Need a senior fashion cinematographer and DP for a 2-day outdoor apparel shoot in Jaipur palace heritage locations. Models, styling, and Arri lighting kit provided.',
      budget: { min: 80000, max: 150000, currency: 'INR' },
      budgetType: 'RANGE',
      applicationDeadline: new Date(Date.now() + 10 * 86400000),
      startDate: new Date(Date.now() + 15 * 86400000),
      applicationCount: 9,
      professionalsRequired: 1,
      requiredSkills: ['Fashion Cinematography', '4K Lighting', 'Color Grading', 'Arri Alexa'],
      requiredLanguages: ['English', 'Hindi'],
      targetPlatforms: ['YouTube', 'Instagram'],
      targetIndustry: 'Fashion Apparel & Luxury',
      deliverables: ['1x 60s Main Brand Film', '4x 15s Cutdowns', 'High-Res Color Graded Stills'],
      location: { city: 'Jaipur', country: 'India', isRemote: false },
      brandId: {
        companyName: 'Verve Couture',
        slug: 'verve-couture',
        logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=200&q=80',
        verificationStatus: 'VERIFIED',
      },
      categoryId: { name: 'Production', slug: 'production' },
    },
    {
      _id: 'req-03',
      slug: 'tech-influencer-reviews-flagship-smartphone-bangalore',
      title: 'Tech Influencer Reviews for Flagship Smartphone Ecosystem',
      description: 'Seeking 2 verified Tech YouTubers and Instagram creators (50K–500K reach) for in-depth benchmark comparisons and performance reviews of new AI smartphone.',
      budget: { min: 60000, max: 120000, currency: 'INR' },
      budgetType: 'RANGE',
      applicationDeadline: new Date(Date.now() + 4 * 86400000),
      startDate: new Date(Date.now() + 7 * 86400000),
      applicationCount: 21,
      professionalsRequired: 2,
      requiredSkills: ['Tech Review', 'Benchmark Testing', 'YouTube 4K', 'Gadget Teardown'],
      requiredLanguages: ['English', 'Hindi'],
      targetPlatforms: ['YouTube', 'Instagram'],
      targetIndustry: 'Consumer Electronics & Tech',
      deliverables: ['1x Dedicated YouTube Video (8-10m)', '2x Instagram Carousel Reels'],
      location: { city: 'Bangalore', country: 'India', isRemote: true },
      brandId: {
        companyName: 'NexGen Devices',
        slug: 'nexgen-devices',
        logoUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=200&q=80',
        verificationStatus: 'VERIFIED',
      },
      categoryId: { name: 'Influencers', slug: 'influencers' },
    },
    {
      _id: 'req-04',
      slug: '3d-motion-graphics-cgi-beverage-product-reveal',
      title: 'Complete 3D Motion Graphics & CGI Product Reveal Film',
      description: 'Looking for a seasoned 3D motion animator for a 30-second photorealistic product reveal of our new premium beverage can with liquid condensation dynamics.',
      budget: { min: 45000, max: 90000, currency: 'INR' },
      budgetType: 'RANGE',
      applicationDeadline: new Date(Date.now() + 8 * 86400000),
      startDate: new Date(Date.now() + 12 * 86400000),
      applicationCount: 7,
      professionalsRequired: 1,
      requiredSkills: ['Cinema 4D', 'Blender', 'Octane Render', 'Liquid Simulation'],
      requiredLanguages: ['English'],
      targetPlatforms: ['Instagram', 'Website'],
      targetIndustry: 'FMCG & Beverage',
      deliverables: ['1x 30s 4K CGI Film', '3x 3D Render Stills for Print'],
      location: { city: 'Remote', country: 'India', isRemote: true },
      brandId: {
        companyName: 'Zenith Beverages',
        slug: 'zenith-beverages',
        logoUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&q=80',
        verificationStatus: 'VERIFIED',
      },
      categoryId: { name: 'Design', slug: 'design' },
    },
    {
      _id: 'req-05',
      slug: 'editorial-fashion-photographer-mumbai-studio',
      title: 'Autumn Editorial Apparel Shoot & Lookbook Photography',
      description: 'Seeking commercial fashion photographer for high-end studio lookbook shoot in Mumbai. 25 garments, 2 international models, full lighting package provided.',
      budget: { min: 40000, max: 75000, currency: 'INR' },
      budgetType: 'RANGE',
      applicationDeadline: new Date(Date.now() + 5 * 86400000),
      startDate: new Date(Date.now() + 9 * 86400000),
      applicationCount: 16,
      professionalsRequired: 1,
      requiredSkills: ['Fashion Photography', 'Studio Lighting', 'Capture One Pro', 'High-End Retouching'],
      requiredLanguages: ['English', 'Hindi'],
      targetPlatforms: ['Website', 'Print Catalog', 'Instagram'],
      targetIndustry: 'Fashion & Apparel',
      deliverables: ['50x Fully Retouched High-Res Images', '25x E-Commerce Clean Cutouts'],
      location: { city: 'Mumbai', country: 'India', isRemote: false },
      brandId: {
        companyName: 'Zara Apparel India',
        slug: 'zara-apparel',
        logoUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=200&q=80',
        verificationStatus: 'VERIFIED',
      },
      categoryId: { name: 'Photography', slug: 'photography' },
    },
    {
      _id: 'req-06',
      slug: 'viral-short-form-reel-video-editor-retainer',
      title: 'Monthly Retainer: Viral Short-Form Reel & TikTok Editor',
      description: 'Looking for a dedicated video editor to produce 20 viral reels per month for a fast-growing D2C health brand. Fast turnaround, kinetic typography, and sound design needed.',
      budget: { min: 35000, max: 60000, currency: 'INR' },
      budgetType: 'RANGE',
      applicationDeadline: new Date(Date.now() + 12 * 86400000),
      startDate: new Date(Date.now() + 14 * 86400000),
      applicationCount: 28,
      professionalsRequired: 1,
      requiredSkills: ['Reel Editing', 'Kinetic Typography', 'Sound Design', 'CapCut Pro', 'Premiere Pro'],
      requiredLanguages: ['English', 'Hindi'],
      targetPlatforms: ['Instagram', 'YouTube Shorts'],
      targetIndustry: 'Health & Wellness',
      deliverables: ['20x High-Retention 9:16 Reels per Month', 'All Raw Project Files'],
      location: { city: 'Hyderabad', country: 'India', isRemote: true },
      brandId: {
        companyName: 'NutriCore Supplements',
        slug: 'nutricore-supplements',
        logoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
        verificationStatus: 'VERIFIED',
      },
      categoryId: { name: 'Production', slug: 'production' },
    },
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      const cat = params.get('category');
      if (q) setSearch(q);
      if (cat) setSelectedCategory(cat);
    }

    async function loadData() {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      try {
        const catRes = await fetch(`${apiUrl}/categories?status=ACTIVE`);
        if (catRes.ok) {
          const catData = await catRes.json();
          const catList = catData.data || catData;
          if (Array.isArray(catList) && catList.length > 0) {
            setCategories(catList);
          }
        }
      } catch (e) {
        // Fallback gracefully
      }

      try {
        const res = await fetch(`${apiUrl}/requirements?status=PUBLISHED&limit=50`);
        if (res.ok) {
          const data = await res.json();
          const payload = data.data !== undefined ? data.data : data;
          const items = payload?.items || (Array.isArray(payload) ? payload : (data.items || []));
          if (items && Array.isArray(items) && items.length > 0) {
            setRequirements(items);
          } else {
            setRequirements(fallbackRequirements);
          }
        } else {
          setRequirements(fallbackRequirements);
        }
      } catch (err) {
        setRequirements(fallbackRequirements);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const masterCategories = useMemo(() => {
    if (categories.length > 0) {
      const topLevel = categories.filter((c) => !c.parentId || c.level === 0);
      return [{ name: 'All Disciplines', slug: 'ALL' }, ...topLevel];
    }
    return [
      { name: 'All Disciplines', slug: 'ALL' },
      { name: 'Influencers', slug: 'influencers' },
      { name: 'Production', slug: 'production' },
      { name: 'Photography', slug: 'photography' },
      { name: 'Design', slug: 'design' },
      { name: 'Talent', slug: 'talent' },
      { name: 'Beauty & Fashion', slug: 'beauty-fashion' },
      { name: 'Marketing', slug: 'marketing' },
    ];
  }, [categories]);

  const filteredRequirements = useMemo(() => {
    return requirements.filter((r) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const catName = (r.categoryId?.name || r.category?.name || '').toLowerCase();
        const catSlug = (r.categoryId?.slug || r.category?.slug || '').toLowerCase();
        const target = selectedCategory.toLowerCase();
        if (!catName.includes(target) && !catSlug.includes(target)) return false;
      }

      // City filter
      if (selectedCity !== 'ALL') {
        if (selectedCity === 'Remote') {
          if (!r.location?.isRemote) return false;
        } else if (r.location?.city?.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
      }

      // Remote toggle
      if (remoteOnly && !r.location?.isRemote) {
        return false;
      }

      // Budget filter
      if (selectedBudget === 'UNDER_50K' && r.budget?.max > 50000) return false;
      if (selectedBudget === '50K_100K' && (r.budget?.max < 50000 || r.budget?.min > 100000)) return false;
      if (selectedBudget === 'ABOVE_100K' && r.budget?.min < 100000) return false;

      // Keyword search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = r.title?.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchBrand = (r.brandId?.companyName || '').toLowerCase().includes(q);
        const matchSkills = r.requiredSkills?.some((s: string) => s.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchBrand && !matchSkills) return false;
      }

      return true;
    });
  }, [requirements, selectedCategory, selectedCity, remoteOnly, selectedBudget, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 p-8 sm:p-10 border border-indigo-100/60 shadow-gemini-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 border border-indigo-200/60 text-indigo-700 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Live Client Opportunities & Briefs
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Browse Active Brand Requirements
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
            Discover verified commercial shoots, UGC campaigns, film contracts, and editing briefs. Apply with your customized quote and relevant portfolio projects.
          </p>
        </div>

        <Link
          href="/requirements/create"
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all self-start md:self-center whitespace-nowrap"
        >
          <PlusCircle className="w-5 h-5" />
          Post a Requirement
        </Link>
      </div>

      {/* Category Tabs Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {masterCategories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.slug
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/85 shadow-gemini-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3.5">
          {/* Search Input */}
          <div className="flex items-center gap-3 flex-1 w-full px-4 py-2.5 bg-slate-50/80 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by keyword, skill (e.g. Cinema 4K, UGC, Colorist), brand name..."
              className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-900 placeholder-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* City Dropdown */}
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                aria-label="Filter by Location"
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none cursor-pointer pr-8 appearance-none"
              >
                <option value="ALL">All Locations</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Remote">Remote Only</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
            </div>

            {/* Budget Range Dropdown */}
            <div className="relative">
              <select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value)}
                aria-label="Filter by Budget Range"
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none cursor-pointer pr-8 appearance-none"
              >
                <option value="ALL">All Budget Ranges</option>
                <option value="UNDER_50K">Under ₹50,000</option>
                <option value="50K_100K">₹50,000 – ₹1,00,000</option>
                <option value="ABOVE_100K">₹1,00,000+</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
            </div>

            {/* Remote Only Toggle */}
            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                remoteOnly
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Remote Only
            </button>
          </div>
        </div>
      </div>

      {/* Results Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <span>
          Showing <strong className="text-slate-900 font-bold">{filteredRequirements.length}</strong> active client requirements
        </span>
        <span className="hidden sm:inline-block">
          Verified Direct Client Opportunities
        </span>
      </div>

      {/* Grid of Opportunities */}
      {filteredRequirements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequirements.map((req) => (
            <RequirementCard key={req._id || req.slug} requirement={req} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-gemini-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg">No requirements matched your filters</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Try adjusting your search criteria, clearing location filters, or checking back soon as new briefs are posted daily.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setSelectedCity('ALL');
              setSelectedBudget('ALL');
              setRemoteOnly(false);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
