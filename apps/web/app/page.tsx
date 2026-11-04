'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
  Users,
  Film,
  Camera,
  Layers,
  Palette,
  CheckCircle2,
  TrendingUp,
  Video,
  Scissors,
} from 'lucide-react';
import { CreatorCard } from '../components/creator-card';
import { RequirementCard } from '../components/requirement-card';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All India');

  // Featured sample creators for instant preview
  const featuredCreators = [
    {
      slug: 'rohan-kapoor',
      headline: 'Automotive & Commercial Cinematographer',
      bio: 'Award-winning DP specializing in high-speed car shoots, brand commercials, and documentary storytelling.',
      startingPrice: 28000,
      averageRating: 4.9,
      reviewCount: 38,
      totalFollowers: 128000,
      verificationStatus: 'VERIFIED' as const,
      skills: ['Cinema 4K', 'Color Grading', 'FPV Drone', 'Car Rigs'],
      location: { city: 'Mumbai', country: 'India' },
      user: {
        fullName: 'Rohan Kapoor',
        username: 'rohankapoor',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Videography & Cinematography' } as any,
    },
    {
      slug: 'ananya-verma',
      headline: 'Beauty & Lifestyle UGC Creator',
      bio: 'Direct-response ad specialist crafting organic, high-converting TikToks and Reels for top D2C skincare brands.',
      startingPrice: 8500,
      averageRating: 5.0,
      reviewCount: 64,
      totalFollowers: 240000,
      verificationStatus: 'VERIFIED' as const,
      skills: ['UGC Ads', 'Voiceover', 'Product Demos', 'Hook Scripts'],
      location: { city: 'Bangalore', country: 'India' },
      user: {
        fullName: 'Ananya Verma',
        username: 'ananyaverma',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'UGC Creators' } as any,
    },
    {
      slug: 'aarav-mehta',
      headline: 'Tech Reviewer & Macro Influencer',
      bio: 'In-depth gadget teardowns, unboxings, and high-production YouTube sponsored reviews with 1M+ monthly reach.',
      startingPrice: 45000,
      averageRating: 4.8,
      reviewCount: 42,
      totalFollowers: 650000,
      verificationStatus: 'VERIFIED' as const,
      skills: ['YouTube 4K', 'Gadget Teardown', 'Brand Integrations'],
      location: { city: 'Delhi NCR', country: 'India' },
      user: {
        fullName: 'Aarav Mehta',
        username: 'aaravmehta',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Influencers & Creators' } as any,
    },
    {
      slug: 'studio-lumina',
      headline: 'Full-Service Commercial Production House',
      bio: 'Complete ad film production from scripting to final render with Red V-Raptor and in-house sound stages.',
      startingPrice: 95000,
      averageRating: 4.9,
      reviewCount: 29,
      totalFollowers: 85000,
      verificationStatus: 'VERIFIED' as const,
      skills: ['Ad Films', 'VFX', 'Studio Stages', 'Commercial Cast'],
      location: { city: 'Mumbai', country: 'India' },
      user: {
        fullName: 'Lumina Studio & Co.',
        username: 'lumina_studios',
        avatarUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=400&q=80',
      },
      coverImageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80',
      primaryCategory: { name: 'Production Houses & Studios' } as any,
    },
  ];

  // Featured sample requirements
  const latestRequirements = [
    {
      _id: 'req-01',
      title: 'High-Impact Direct Response UGC Videos for Skincare Launch',
      description: 'Seeking 3 female UGC creators in Mumbai/Delhi for authentic before-after reviews and skincare unboxing reels. Products will be shipped immediately.',
      budget: { min: 25000, max: 60000, currency: 'INR' },
      applicationDeadline: new Date(Date.now() + 6 * 86400000),
      applicationCount: 14,
      requiredSkills: ['UGC Video', 'Skincare Demo', 'Reel Editing'],
      location: { city: 'Mumbai', country: 'India', isRemote: true },
      brandProfile: {
        companyName: 'Glow Botanics India',
        logoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80',
      },
      categoryId: { name: 'UGC Creators' } as any,
    },
    {
      _id: 'req-02',
      title: 'Commercial Fashion Lookbook & Campaign Videography',
      description: 'Need a senior fashion cinematographer and DP for a 2-day outdoor apparel shoot in Jaipur. Models and styling provided.',
      budget: { min: 80000, max: 150000, currency: 'INR' },
      applicationDeadline: new Date(Date.now() + 10 * 86400000),
      applicationCount: 9,
      requiredSkills: ['Fashion Cinematography', '4K Lighting', 'Color Grading'],
      location: { city: 'Jaipur', country: 'India', isRemote: false },
      brandProfile: {
        companyName: 'Verve Couture',
        logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=200&q=80',
      },
      categoryId: { name: 'Videography & Cinematography' } as any,
    },
    {
      _id: 'req-03',
      title: 'Tech Influencer Reviews for Flagship Smartphone Ecosystem',
      description: 'Seeking 2 verified Tech YouTubers / Instagram creators with 100k+ followers for in-depth benchmark comparisons and performance reviews.',
      budget: { min: 60000, max: 120000, currency: 'INR' },
      applicationDeadline: new Date(Date.now() + 4 * 86400000),
      applicationCount: 21,
      requiredSkills: ['Tech Review', 'Benchmark Testing', 'YouTube 4K'],
      location: { city: 'Bangalore', country: 'India', isRemote: true },
      brandProfile: {
        companyName: 'NexGen Devices',
        logoUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=200&q=80',
      },
      categoryId: { name: 'Influencers & Creators' } as any,
    },
  ];

  const categoryPills = [
    { name: 'Influencers & Creators', icon: Sparkles, count: '1,420+ Talent' },
    { name: 'UGC Creators', icon: Zap, count: '890+ Creators' },
    { name: 'Cinematographers', icon: Film, count: '640+ DPs' },
    { name: 'Commercial Photographers', icon: Camera, count: '1,120+ Pros' },
    { name: 'Production Houses', icon: Layers, count: '240+ Studios' },
    { name: 'Design & Branding', icon: Palette, count: '980+ Designers' },
    { name: 'Performance Marketing', icon: TrendingUp, count: '450+ Specialists' },
    { name: 'Styling & Makeup', icon: Scissors, count: '520+ Artists' },
  ];

  return (
    <div className="space-y-20 pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Soft Gemini Light Glow Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/15 via-cyan-400/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Pill Tag */}
        <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/90 border border-slate-200/80 shadow-sm text-[11px] sm:text-xs font-semibold text-slate-800 mb-6 backdrop-blur-sm">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span className="truncate">India’s Dedicated B2B Creative Marketplace</span>
          <span className="text-slate-300 hidden xs:inline">|</span>
          <span className="text-indigo-600 font-bold shrink-0">30+ Categories</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto break-words px-2">
          Hire Top-Tier <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500">Creators & Production</span> Teams
        </h1>

        <p className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed px-2">
          From viral UGC creators and verified influencers to cinema directors, drone pilots, and full production houses. Discover, collaborate, and scale your brand storytelling.
        </p>

        {/* Live Search & Filter Bar */}
        <div className="mt-8 sm:mt-10 max-w-3xl mx-auto px-2">
          <div className="bg-white p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-gemini-md flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-2.5 flex-1 w-full px-3 py-2">
              <Search className="w-5 h-5 text-indigo-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 'Food Influencer Mumbai', 'Reel Editor'..."
                className="w-full text-xs sm:text-sm md:text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
            </div>

            <div className="hidden sm:flex items-center h-8 border-l border-slate-200 px-2" />

            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto px-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-xs sm:text-sm text-slate-700 bg-transparent focus:outline-none font-medium py-1.5 cursor-pointer"
                >
                  <option value="All India">All India</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Ahmedabad">Ahmedabad</option>
                  <option value="Jaipur">Jaipur</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <Link
                href={`/explore?search=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(selectedCity === 'All India' ? '' : selectedCity)}`}
                className="w-auto inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-gemini-sm shadow-indigo-600/20 active:scale-95 transition-all shrink-0"
              >
                <span>Search</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick tags */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-slate-500 px-2">
            <span className="font-semibold text-slate-400">Popular:</span>
            <Link href="/explore?category=ugc-creators" className="hover:text-indigo-600 transition-colors">UGC Videos</Link>
            <span>•</span>
            <Link href="/explore?category=influencers-creators" className="hover:text-indigo-600 transition-colors">Instagram Influencers</Link>
            <span>•</span>
            <Link href="/explore?category=videography-cinematography" className="hover:text-indigo-600 transition-colors">Commercial DPs</Link>
            <span>•</span>
            <Link href="/explore?category=video-reel-editors" className="hover:text-indigo-600 transition-colors">Reel Editors</Link>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="mt-10 sm:mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto pt-6 sm:pt-8 border-t border-slate-200/60 px-2">
          <div className="p-2">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900">30+</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Dynamic Categories</div>
          </div>
          <div className="p-2">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900">12,500+</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Verified Creative Pros</div>
          </div>
          <div className="p-2">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900">₹4.8 Cr+</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Projects Delivered</div>
          </div>
          <div className="p-2">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900">100%</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Official Social Sync</div>
          </div>
        </div>
      </section>

      {/* 2. DYNAMIC CATEGORIES SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Dynamic Taxonomies
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Browse by Creative Discipline
            </h2>
          </div>
          <Link
            href="/categories"
            className="mt-2 md:mt-0 text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Explore all 30+ categories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categoryPills.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Link
                key={idx}
                href={`/explore?category=${encodeURIComponent(cat.name)}`}
                className="group flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-gemini-md transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">{cat.count}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. FEATURED VERIFIED CREATORS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              Verified & Vetted Talent
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Featured Creative Professionals
            </h2>
          </div>
          <Link
            href="/explore"
            className="mt-2 md:mt-0 text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View all professionals
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCreators.map((creator, idx) => (
            <CreatorCard key={idx} creator={creator} />
          ))}
        </div>
      </section>

      {/* 4. LATEST REQUIREMENTS BOARD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-b from-white to-slate-50/50 rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-gemini-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <Zap className="w-3.5 h-3.5" />
                Live Project Leads
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Latest Requirements Posted by Brands
              </h2>
            </div>
            <div className="mt-3 md:mt-0 flex items-center gap-3">
              <Link
                href="/requirements/new"
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors shadow-sm"
              >
                + Post a Requirement
              </Link>
              <Link
                href="/requirements"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Browse all leads
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestRequirements.map((req, idx) => (
              <RequirementCard key={idx} requirement={req} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            How Brands & Creators Operates
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            A frictionless, transparent workflow designed for high-value creative productions and brand collaborations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* For Brands */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-gemini-sm space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold uppercase">
              For Brands & Agencies
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Post Requirement or Search Directory</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Specify deliverables, budget tiers, and location or browse vetted talent across 30+ creative categories.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Review Verified Portfolios & Social Metrics</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Examine official API-synced follower counts, real engagement rates, past client reviews, and direct video reels.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Shortlist, Contract & Manage Delivery</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Accept proposals, communicate directly in project threads, approve milestone assets, and leave verified ratings.</p>
                </div>
              </div>
            </div>
          </div>

          {/* For Creators */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-gemini-sm space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold uppercase">
              For Creators & Production Studios
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Build a Behance-Grade Portfolio</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Upload video reels, past brand campaigns, define service offerings, starting day rates, and team equipment.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Connect Social Accounts with Official APIs</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Securely authenticate your Instagram, YouTube, and LinkedIn to display verified subscriber and engagement stats.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Apply to High-Budget Brand Projects</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Receive inbound leads from verified companies, submit custom price bids, and build long-term brand relationships.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOTTOM CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white p-8 sm:p-14 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-gradient-to-br from-indigo-500/30 to-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to elevate your brand campaigns?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Join thousands of leading brands, creators, cinematographers, and production houses building the future of commercial media.
            </p>
            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/register?role=BRAND"
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
              >
                Register as Brand
              </Link>
              <Link
                href="/register?role=CREATOR"
                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition-all backdrop-blur-md"
              >
                Join as Creator
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
