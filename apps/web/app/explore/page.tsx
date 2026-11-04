'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  MapPin,
  SlidersHorizontal,
  Star,
  ShieldCheck,
  Check,
  Tag,
  Clock,
  Layers,
  IndianRupee,
  RefreshCw,
  Eye,
  Bookmark,
  ChevronDown,
} from 'lucide-react';
import { CreatorCard } from '../../components/creator-card';

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedPricingModel, setSelectedPricingModel] = useState('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial rich fallback dataset representing production-ready creative profiles
  const fallbackCreators = [
    {
      _id: 'cr-01',
      slug: 'rohan-kapoor',
      headline: 'Automotive & Commercial Cinematographer',
      bio: 'Award-winning DP specializing in high-speed car shoots, brand commercials, and documentary storytelling with 8+ years experience.',
      startingPrice: 28000,
      pricingModel: 'PER_SHOOT',
      availabilityStatus: 'AVAILABLE_NOW',
      experienceLevel: 'EXPERT',
      averageRating: 4.9,
      reviewCount: 38,
      totalFollowers: 128000,
      verificationStatus: 'VERIFIED',
      skills: ['Cinema 4K', 'Color Grading', 'FPV Drone', 'Car Rigs', 'DaVinci Resolve'],
      serviceAreas: ['Mumbai', 'Delhi NCR', 'Remote'],
      location: { city: 'Mumbai', country: 'India' },
      user: {
        fullName: 'Rohan Kapoor',
        username: 'rohankapoor',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Production', slug: 'production' },
      subcategory: { name: 'Cinematography', slug: 'cinematography' },
    },
    {
      _id: 'cr-02',
      slug: 'ananya-verma',
      headline: 'Beauty & Lifestyle UGC Creator',
      bio: 'Direct-response ad specialist crafting organic, high-converting TikToks and Reels for top D2C skincare brands.',
      startingPrice: 8500,
      pricingModel: 'PER_PROJECT',
      availabilityStatus: 'AVAILABLE_NOW',
      experienceLevel: 'INTERMEDIATE',
      averageRating: 5.0,
      reviewCount: 64,
      totalFollowers: 240000,
      verificationStatus: 'VERIFIED',
      skills: ['UGC Ads', 'Voiceover', 'Product Demos', 'Hook Scripts', 'CapCut Pro'],
      serviceAreas: ['Bangalore', 'Mumbai', 'Remote'],
      location: { city: 'Bangalore', country: 'India' },
      user: {
        fullName: 'Ananya Verma',
        username: 'ananyaverma',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Influencers', slug: 'influencers' },
      subcategory: { name: 'Beauty', slug: 'beauty' },
    },
    {
      _id: 'cr-03',
      slug: 'aarav-mehta',
      headline: 'Tech Reviewer & Macro Influencer',
      bio: 'In-depth gadget teardowns, unboxings, and high-production YouTube sponsored reviews with 1M+ monthly reach.',
      startingPrice: 45000,
      pricingModel: 'PER_PROJECT',
      availabilityStatus: 'BOOKING_NEXT_MONTH',
      experienceLevel: 'EXPERT',
      averageRating: 4.8,
      reviewCount: 42,
      totalFollowers: 650000,
      verificationStatus: 'VERIFIED',
      skills: ['YouTube 4K', 'Gadget Teardown', 'Brand Integrations', 'Benchmark Testing'],
      serviceAreas: ['Delhi NCR', 'Ahmedabad', 'Remote'],
      location: { city: 'Delhi NCR', country: 'India' },
      user: {
        fullName: 'Aarav Mehta',
        username: 'aaravmehta',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Influencers', slug: 'influencers' },
      subcategory: { name: 'Technology', slug: 'technology' },
    },
    {
      _id: 'cr-04',
      slug: 'studio-lumina',
      headline: 'Full-Service Commercial Production House',
      bio: 'Complete ad film production from scripting to final render with Red V-Raptor and in-house sound stages.',
      startingPrice: 95000,
      pricingModel: 'PER_DAY',
      availabilityStatus: 'AVAILABLE_NOW',
      experienceLevel: 'EXPERT',
      averageRating: 4.9,
      reviewCount: 29,
      totalFollowers: 85000,
      verificationStatus: 'VERIFIED',
      skills: ['Ad Films', 'VFX', 'Studio Stages', 'Commercial Cast', 'Sound Design'],
      serviceAreas: ['Mumbai', 'Ahmedabad', 'Goa'],
      location: { city: 'Mumbai', country: 'India' },
      user: {
        fullName: 'Lumina Studio & Co.',
        username: 'lumina_studios',
        avatarUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Production', slug: 'production' },
      subcategory: { name: 'Production House', slug: 'production-house' },
    },
    {
      _id: 'cr-05',
      slug: 'priya-sharma',
      headline: 'Commercial Fashion & Editorial Photographer',
      bio: 'Vogue & Grazia published fashion photographer creating evocative editorial looks and high-end brand catalogs.',
      startingPrice: 22000,
      pricingModel: 'PER_SHOOT',
      availabilityStatus: 'AVAILABLE_NOW',
      experienceLevel: 'EXPERT',
      averageRating: 4.9,
      reviewCount: 51,
      totalFollowers: 94000,
      verificationStatus: 'VERIFIED',
      skills: ['Lookbooks', 'Studio Lighting', 'High-End Retouching', 'Capture One Pro'],
      serviceAreas: ['Mumbai', 'Delhi NCR', 'Jaipur'],
      location: { city: 'Mumbai', country: 'India' },
      user: {
        fullName: 'Priya Sharma',
        username: 'priyasharmaphoto',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Photography', slug: 'photography' },
      subcategory: { name: 'Fashion', slug: 'fashion' },
    },
    {
      _id: 'cr-06',
      slug: 'vikram-reddy',
      headline: 'Viral Short-Form Reel & TikTok Editor',
      bio: 'Fast cuts, kinetic typography, dynamic sound design that boosts retention by 40%+. 50M+ views generated.',
      startingPrice: 6000,
      pricingModel: 'PER_PROJECT',
      availabilityStatus: 'AVAILABLE_NOW',
      experienceLevel: 'EXPERT',
      averageRating: 4.9,
      reviewCount: 78,
      totalFollowers: 42000,
      verificationStatus: 'VERIFIED',
      skills: ['Kinetic Typography', 'Sound Design', 'CapCut Pro', 'Premiere Pro', 'After Effects'],
      serviceAreas: ['Hyderabad', 'Bangalore', 'Remote'],
      location: { city: 'Hyderabad', country: 'India' },
      user: {
        fullName: 'Vikram Reddy',
        username: 'vikramedit',
        avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Production', slug: 'production' },
      subcategory: { name: 'Reel Editing', slug: 'reel-editing' },
    },
    {
      _id: 'cr-07',
      slug: 'tanya-deshmukh',
      headline: 'Brand Identity & Packaging Designer',
      bio: 'Crafting memorable visual identities, bespoke typography, and sustainable FMCG packaging for modern consumer brands.',
      startingPrice: 35000,
      pricingModel: 'PER_PROJECT',
      availabilityStatus: 'AVAILABLE_NOW',
      experienceLevel: 'EXPERT',
      averageRating: 5.0,
      reviewCount: 33,
      totalFollowers: 28000,
      verificationStatus: 'VERIFIED',
      skills: ['Brand Identity', 'Packaging 3D', 'Typography', 'Figma', 'Illustrator'],
      serviceAreas: ['Pune', 'Mumbai', 'Remote'],
      location: { city: 'Pune', country: 'India' },
      user: {
        fullName: 'Tanya Deshmukh',
        username: 'tanyadesign',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Design', slug: 'design' },
      subcategory: { name: 'Brand Design', slug: 'brand-design' },
    },
    {
      _id: 'cr-08',
      slug: 'kabir-dance-crew',
      headline: 'Urban Choreography & Dance Troupe',
      bio: 'Dynamic commercial dance troupe and choreographers for music videos, brand launches, and viral hook steps.',
      startingPrice: 40000,
      pricingModel: 'PER_SHOOT',
      availabilityStatus: 'AVAILABLE_NOW',
      experienceLevel: 'EXPERT',
      averageRating: 4.8,
      reviewCount: 22,
      totalFollowers: 175000,
      verificationStatus: 'VERIFIED',
      skills: ['Urban Choreography', 'Hook Step Viral', 'Stage Performance', 'Music Video Cast'],
      serviceAreas: ['Delhi NCR', 'Mumbai', 'Chandigarh'],
      location: { city: 'Delhi NCR', country: 'India' },
      user: {
        fullName: 'Kabir & The Urban Collective',
        username: 'kabirdance',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Performers', slug: 'performers' },
      subcategory: { name: 'Choreographer', slug: 'choreographer' },
    },
  ];

  // Fetch dynamic categories and creators
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
          const data = await catRes.json();
          const items = data.data || data;
          if (Array.isArray(items) && items.length > 0) {
            setCategories(items);
          }
        }
      } catch (e) {
        // Fallback gracefully
      }

      try {
        const creatorRes = await fetch(`${apiUrl}/creators?visibilityStatus=PUBLISHED&limit=50`);
        if (creatorRes.ok) {
          const data = await creatorRes.json();
          const items = data.data?.items || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
          if (items.length > 0) {
            setCreators(items);
          } else {
            setCreators(fallbackCreators);
          }
        } else {
          setCreators(fallbackCreators);
        }
      } catch (e) {
        setCreators(fallbackCreators);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const masterCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories.filter((c) => !c.parentId || c.level === 0);
    }
    return [
      { name: 'Influencers', slug: 'influencers' },
      { name: 'Production', slug: 'production' },
      { name: 'Photography', slug: 'photography' },
      { name: 'Talent', slug: 'talent' },
      { name: 'Design', slug: 'design' },
      { name: 'Beauty & Fashion', slug: 'beauty-fashion' },
      { name: 'Performers', slug: 'performers' },
      { name: 'Marketing', slug: 'marketing' },
      { name: 'Agencies', slug: 'agencies' },
      { name: 'Studios & Rentals', slug: 'studios-rentals' },
    ];
  }, [categories]);

  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const catName = ((c as any).primaryCategoryId?.name || c.primaryCategory?.name || c.primaryCategory || '').toLowerCase();
        const catSlug = ((c as any).primaryCategoryId?.slug || c.primaryCategory?.slug || '').toLowerCase();
        const target = selectedCategory.toLowerCase();
        if (!catName.includes(target) && !catSlug.includes(target)) return false;
      }

      // City filter
      if (selectedCity !== 'ALL') {
        const cityMatch = c.location?.city?.toLowerCase() === selectedCity.toLowerCase();
        const serviceAreaMatch = c.serviceAreas?.some(
          (area: string) => area.toLowerCase() === selectedCity.toLowerCase(),
        );
        if (!cityMatch && !serviceAreaMatch) return false;
      }

      // Pricing model
      if (selectedPricingModel !== 'ALL' && c.pricingModel !== selectedPricingModel) {
        return false;
      }

      // Availability
      if (selectedAvailability !== 'ALL' && c.availabilityStatus !== selectedAvailability) {
        return false;
      }

      // Verified toggle
      if (verifiedOnly && c.verificationStatus !== 'VERIFIED') {
        return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.user?.fullName?.toLowerCase().includes(q);
        const matchBio = c.bio?.toLowerCase().includes(q);
        const matchHeadline = c.headline?.toLowerCase().includes(q);
        const matchSkills = c.skills?.some((s: string) => s.toLowerCase().includes(q));
        const matchServices = c.services?.some((s: any) =>
          (typeof s === 'string' ? s : s.name || '').toLowerCase().includes(q),
        );
        if (!matchName && !matchBio && !matchHeadline && !matchSkills && !matchServices) {
          return false;
        }
      }
      return true;
    });
  }, [
    creators,
    selectedCategory,
    selectedCity,
    selectedPricingModel,
    selectedAvailability,
    verifiedOnly,
    search,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 p-8 sm:p-10 border border-indigo-100/60 shadow-gemini-sm">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 border border-indigo-200/60 text-indigo-700 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Marketplace Discovery
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Discover Verified Creators, Cinematographers & Studios
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
            Connect directly with high-caliber talent across all 10 creative disciplines. Review verified portfolios, transparent rate cards, and real brand collaborations.
          </p>
        </div>

        {/* Category Pill Bar */}
        <div className="relative z-10 pt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white/90 text-slate-700 border border-slate-200/80 hover:bg-white'
            }`}
          >
            All Disciplines
          </button>
          {masterCategories.map((cat, i) => (
            <button
              key={i}
              onClick={() => setSelectedCategory(cat.slug || cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory.toLowerCase() === (cat.slug || cat.name).toLowerCase()
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                  : 'bg-white/90 text-slate-700 border border-slate-200/80 hover:bg-white hover:border-indigo-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/85 shadow-gemini-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3.5">
          {/* Search Input */}
          <div className="flex items-center gap-3 flex-1 w-full px-4 py-2.5 bg-slate-50/80 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, skill (e.g. Cinema 4K, UGC, Colorist), or title..."
              className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-900 placeholder-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-1 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* City Dropdown */}
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                aria-label="Filter by City"
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none cursor-pointer pr-8 appearance-none"
              >
                <option value="ALL">All Locations</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Ahmedabad">Ahmedabad</option>
                <option value="Pune">Pune</option>
                <option value="Remote">Remote Available</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
            </div>

            {/* Pricing Model Dropdown */}
            <div className="relative">
              <select
                value={selectedPricingModel}
                onChange={(e) => setSelectedPricingModel(e.target.value)}
                aria-label="Filter by Pricing Model"
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none cursor-pointer pr-8 appearance-none"
              >
                <option value="ALL">All Pricing Models</option>
                <option value="PER_SHOOT">Per Shoot</option>
                <option value="PER_DAY">Per Day</option>
                <option value="PER_PROJECT">Per Project</option>
                <option value="PER_HOUR">Per Hour</option>
                <option value="MONTHLY">Monthly Retainer</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
            </div>

            {/* Availability Dropdown */}
            <div className="relative">
              <select
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
                aria-label="Filter by Availability"
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none cursor-pointer pr-8 appearance-none"
              >
                <option value="ALL">Any Availability</option>
                <option value="AVAILABLE_NOW">Available Now</option>
                <option value="BOOKING_NEXT_MONTH">Booking Next Month</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
            </div>

            {/* Verified Badge Toggle */}
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                verifiedOnly
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Pro
            </button>
          </div>
        </div>

        {/* Dynamic Category-Aware Contextual Sub-Filters */}
        {selectedCategory.toLowerCase() === 'influencers' && (
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Reach Tier:</span>
            {['All Follower Tiers', 'Nano (10K–50K)', 'Micro (50K–200K)', 'Macro (200K+)'].map((tier, idx) => (
              <button
                key={idx}
                onClick={() => setSearch(tier.includes('All') ? '' : tier.split(' ')[0])}
                className="px-2.5 py-1 rounded-lg bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] whitespace-nowrap"
              >
                {tier}
              </button>
            ))}
          </div>
        )}

        {selectedCategory.toLowerCase() === 'production' && (
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Production Role:</span>
            {['All Roles', 'Commercial DP', 'Reel Editor', 'Colorist', 'FPV Drone', 'VFX'].map((role, idx) => (
              <button
                key={idx}
                onClick={() => setSearch(role.includes('All') ? '' : role)}
                className="px-2.5 py-1 rounded-lg bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] whitespace-nowrap"
              >
                {role}
              </button>
            ))}
          </div>
        )}

        {selectedCategory.toLowerCase() === 'photography' && (
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Photography Style:</span>
            {['All Styles', 'Fashion & Lookbook', 'Product & E-Com', 'Editorial', 'Studio'].map((style, idx) => (
              <button
                key={idx}
                onClick={() => setSearch(style.includes('All') ? '' : style.split(' ')[0])}
                className="px-2.5 py-1 rounded-lg bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] whitespace-nowrap"
              >
                {style}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <span className="flex items-center gap-2">
          Showing <strong className="text-slate-900 font-bold">{filteredCreators.length}</strong> verified creative profiles
        </span>
        <span className="hidden sm:inline-block">
          Sorted by: <strong className="text-slate-800 font-semibold">Highest Rated & Top Match</strong>
        </span>
      </div>

      {/* Discovery Grid */}
      {filteredCreators.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCreators.map((creator) => (
            <CreatorCard key={creator._id || creator.slug} creator={creator} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-gemini-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg">No creative talent matched your criteria</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Try adjusting your search terms, clearing location filters, or resetting category disciplines.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setSelectedCity('ALL');
              setSelectedPricingModel('ALL');
              setSelectedAvailability('ALL');
              setVerifiedOnly(false);
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', window.location.pathname);
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}

