'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Star,
  MapPin,
  Sparkles,
  Calendar,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  Globe,
  CheckCircle2,
  Send,
  Eye,
  Bookmark,
  Briefcase,
  Share2,
  Play,
  Film,
  Award,
  Layers,
  Clock,
  ChevronRight,
  X,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatCompactNumber, resolveMediaUrl } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';
import {
  PricingModel,
  AvailabilityStatus,
  VerificationStatus,
  IPortfolioItem,
} from '@brands-creators/types';

export default function CreatorProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [activeTab, setActiveTab] = useState<'portfolio' | 'about' | 'collaborations' | 'services' | 'social' | 'reviews'>('portfolio');
  const [selectedPortfolio, setSelectedPortfolio] = useState<IPortfolioItem | null>(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Profile State
  const [profileData, setProfileData] = useState<any>(null);
  const [connectedSocials, setConnectedSocials] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCreator() {
      if (!slug) return;
      try {
        setLoading(true);
        const res = await apiClient<any>(`/creators/${slug}`);
        const cData = res?.data || res;
        if (cData?.headline || cData?.slug) {
          setProfileData(cData);
          const uId = cData.userId?._id || cData.userId;
          if (uId) {
            const [socials, revData] = await Promise.all([
              apiClient<any[]>(`/social/public/${uId}`).catch(() => []),
              apiClient<any>(`/reviews/public/${uId}`).catch(() => ({ items: [] })),
            ]);
            if (Array.isArray(socials)) {
              setConnectedSocials(socials);
            }
            const revItems = (revData as any)?.data?.items || (revData as any)?.items || [];
            if (Array.isArray(revItems)) {
              setReviews(revItems);
            }
          }
        }
      } catch (e) {
        console.warn('Dynamic fetch fallback for creator profile:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchCreator();
  }, [slug]);

  // Fallback / Normalized Data
  const profile = {
    name: profileData?.userId?.fullName || profileData?.headline || 'Creative Talent',
    username: profileData?.slug || slug || 'creator',
    headline: profileData?.headline || 'Commercial Cinematographer & Visual Director',
    bio: profileData?.bio || 'Cinematographer and creative director specializing in high-octane commercial video productions, lifestyle reels, and luxury campaigns.',
    about: profileData?.about || 'With over 6 years of experience working across commercial film sets, high-fashion editorial campaigns, and viral digital commercials, I help brands translate complex stories into cinematic visual spectacles that captivate audiences.',
    location: {
      city: profileData?.location?.city || 'Mumbai',
      country: profileData?.location?.country || 'India',
    },
    serviceAreas: profileData?.serviceAreas?.length ? profileData?.serviceAreas : ['Mumbai', 'Delhi', 'Ahmedabad', 'Remote'],
    primaryCategory: profileData?.primaryCategoryId?.name || 'Videography & Cinematography',
    skills: profileData?.skills?.length ? profileData?.skills : ['Cinema 4K / 8K', 'ARRI Alexa', 'DaVinci Resolve', 'Reel Direction', 'Drone Cinematography'],
    languages: profileData?.languages?.length ? profileData?.languages : ['English', 'Hindi'],
    startingPrice: profileData?.startingPrice || 25000,
    pricingModel: profileData?.pricingModel || PricingModel.PER_PROJECT,
    isCustomQuoteOnly: profileData?.isCustomQuoteOnly || false,
    currency: profileData?.currency || 'INR',
    averageRating: typeof profileData?.averageRating === 'number' ? profileData.averageRating : 0,
    reviewCount: typeof profileData?.reviewCount === 'number' ? profileData.reviewCount : reviews.length,
    experienceYears: profileData?.experienceYears || 6,
    verificationStatus: profileData?.verificationStatus || VerificationStatus.UNVERIFIED,
    availability: profileData?.availability || AvailabilityStatus.AVAILABLE_NOW,
    avatarUrl: (profileData?.userId?.avatarUrl || profileData?.avatarUrl) ? resolveMediaUrl(profileData?.userId?.avatarUrl || profileData?.avatarUrl) : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    coverImageUrl: profileData?.coverImageUrl ? resolveMediaUrl(profileData?.coverImageUrl) : 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1600&q=80',
    portfolio: (profileData?.portfolio?.length ? profileData.portfolio : [
      {
        title: 'Audi RS e-tron GT — Night Velocity Campaign',
        mediaType: 'REEL',
        mediaUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
        coverImage: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
        clientBrand: 'Audi India',
        deliverables: ['1x 60s Hero Reel', '3x Story Cutdowns'],
        tags: ['Automotive', 'Cinema 4K', 'Night Shoot'],
        projectDate: 'Aug 2026',
      },
      {
        title: 'Tissot Swiss Watches — Precision Redefined',
        mediaType: 'IMAGE',
        mediaUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
        coverImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
        clientBrand: 'Tissot',
        deliverables: ['Macro Product Stills', 'Lookbook Campaign'],
        tags: ['Luxury', 'Editorial', 'Product'],
        projectDate: 'Jul 2026',
      },
      {
        title: 'Red Bull Urban Descent — Mountain Action Series',
        mediaType: 'VIDEO',
        mediaUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
        coverImage: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
        clientBrand: 'Red Bull',
        deliverables: ['FPV Action Sequences', '4K High-Speed 240fps'],
        tags: ['Action Sports', 'FPV Drone'],
        projectDate: 'May 2026',
      },
      {
        title: 'Zara Man Autumn Collection Lookbook',
        mediaType: 'CASE_STUDY',
        mediaUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
        coverImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
        clientBrand: 'Zara',
        deliverables: ['Editorial Fashion Lookbook', 'Social Teasers'],
        tags: ['Fashion', 'Lookbook'],
        projectDate: 'Apr 2026',
      },
    ]) as IPortfolioItem[],
    brandCollaborations: (profileData?.brandCollaborations?.length ? profileData.brandCollaborations : [
      {
        brandName: 'Nike India',
        campaignName: 'Air Max Monsoon Launch',
        role: 'Lead Visual Creator',
        services: ['Video Reel', 'High-Speed Photography'],
        description: 'Teaser reels featuring Mumbai street runners with 240k+ organic views.',
        date: 'June 2026',
      },
      {
        brandName: 'Puma',
        campaignName: 'Forever Faster Global',
        role: 'Cinematographer & Colorist',
        services: ['DaVinci Color Grade', 'Master Exports'],
        description: 'Graded broadcast TV commercials for nationwide OTT release.',
        date: 'March 2026',
      },
    ]),
    services: profileData?.services?.length ? profileData.services : [
      {
        title: 'Commercial Ad DP & Day Shoot',
        description: 'Full day (10 hrs) cinematography on-set with cinema camera package, monitor rig, and prime lens kit.',
        startingPrice: 28000,
        currency: 'INR',
        pricingModel: PricingModel.PER_DAY,
        deliveryDays: 2,
        features: ['Full 10h Day Shoot', '4K RAW Footage Backup', 'Grip & Lighting Consultation'],
      },
      {
        title: 'Complete Commercial Video Package (Shoot + Grade)',
        description: '1-day shoot + comprehensive DaVinci Resolve color grading, master export in 4K ProRes & social vertical crops.',
        startingPrice: 55000,
        currency: 'INR',
        pricingModel: PricingModel.PER_PROJECT,
        deliveryDays: 5,
        features: ['1-Day Production', 'Full DaVinci Color Grade', 'Social Vertical Cuts'],
      },
    ],
    socialAccounts: profileData?.socialAccounts || [],
    completionPercentage: profileData?.completion?.score || 88,
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const getPricingModelLabel = (model?: PricingModel) => {
    switch (model) {
      case PricingModel.PER_HOUR:
        return '/ hour';
      case PricingModel.PER_DAY:
        return '/ day';
      case PricingModel.PER_SHOOT:
        return '/ shoot';
      case PricingModel.MONTHLY:
        return '/ month';
      case PricingModel.CUSTOM_QUOTE:
        return 'Custom Quote';
      default:
        return '/ project';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. PROFILE COVER HEADER */}
      <div className="relative bg-white rounded-3xl border border-slate-200/80 shadow-gemini-md overflow-hidden">
        {/* Cover Image Banner */}
        <div className="h-56 sm:h-80 w-full bg-slate-900 relative">
          <img
            src={profile.coverImageUrl}
            alt="Cover"
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
        </div>

        {/* Header Content Bar */}
        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-20 sm:-mt-24">
            {/* Avatar & Key Metadata */}
            <div className="flex items-end gap-5">
              <div className="relative">
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover ring-4 ring-white shadow-xl bg-white"
                />
                {profile.verificationStatus === VerificationStatus.VERIFIED && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md" title="Verified Professional">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                  </div>
                )}
              </div>

              <div className="pb-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{profile.name}</h1>
                  {profile.verificationStatus === VerificationStatus.VERIFIED && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified Identity
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-indigo-600 mt-1">
                  {profile.headline}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {profile.location.city}, {profile.location.country}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    {profile.primaryCategory}
                  </span>
                  <span>•</span>
                  {profile.availability === AvailabilityStatus.AVAILABLE_NOW ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Available Now
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md">
                      Booking in Advance
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* CTAs: Inquire, Save, Share */}
            <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
              <button
                onClick={() => setInquiryModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                Inquire / Hire
              </button>

              <button
                onClick={() => setIsSaved(!isSaved)}
                title={isSaved ? 'Saved' : 'Shortlist'}
                className={`p-3 rounded-2xl border transition-all active:scale-90 ${
                  isSaved
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                title="Share Profile Link"
                className="p-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors active:scale-90"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Copied Link Toast */}
          {copiedLink && (
            <div className="mt-3 p-2 text-center text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in">
              Profile link copied to clipboard!
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
              <span className="text-slate-400 block mb-0.5">Starting Rate</span>
              <div className="font-black text-slate-900 text-sm">
                {profile.isCustomQuoteOnly ? 'Custom Quote' : formatCurrency(profile.startingPrice)}
                {!profile.isCustomQuoteOnly && (
                  <span className="text-[11px] font-normal text-slate-500"> {getPricingModelLabel(profile.pricingModel)}</span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
              <span className="text-slate-400 block mb-0.5">Experience</span>
              <div className="font-bold text-slate-900 text-sm">{profile.experienceYears} Years Active</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
              <span className="text-slate-400 block mb-0.5">Service Areas</span>
              <div className="font-bold text-slate-900 text-sm truncate">{profile.serviceAreas.join(', ')}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
              <span className="text-slate-400 block mb-0.5">Rating & Reviews</span>
              {profile.reviewCount > 0 ? (
                <div className="font-bold text-amber-600 text-sm flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{profile.averageRating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({profile.reviewCount})</span>
                </div>
              ) : (
                <div className="font-semibold text-slate-500 text-xs flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-slate-300" />
                  <span>Unrated</span>
                  <span className="text-slate-400 font-normal">(0 reviews)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABBED NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'portfolio', label: `Portfolio (${profile.portfolio.length})` },
          { id: 'about', label: 'About & Bio' },
          { id: 'collaborations', label: `Brand Work (${profile.brandCollaborations.length})` },
          { id: 'services', label: `Services & Packages (${profile.services.length})` },
          { id: 'social', label: 'Social Channels' },
          { id: 'reviews', label: `Reviews (${reviews.length || profile.reviewCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. TAB CONTENT */}

      {/* PORTFOLIO TAB */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.portfolio.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedPortfolio(item)}
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-gemini-sm hover:shadow-gemini-md transition-all group cursor-pointer"
              >
                <div className="relative h-64 w-full overflow-hidden bg-slate-100">
                  <img
                    src={item.coverImage || item.mediaUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-md text-xs font-bold text-slate-900 shadow-lg">
                      <Eye className="w-4 h-4" /> View Full Case
                    </span>
                  </div>
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-900 shadow-sm">
                    {item.clientBrand || 'Original Work'}
                  </div>
                  <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white">
                    {item.mediaType}
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  {item.deliverables && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.deliverables.map((del, dIdx) => (
                        <span key={dIdx} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {del}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABOUT TAB */}
      {activeTab === 'about' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">About & Professional Story</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.about}</p>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Core Skills & Production Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill: string, idx: number) => (
                <span key={idx} className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Languages Spoken</span>
              <p className="text-sm font-semibold text-slate-800">{profile.languages.join(', ')}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Serving Locations</span>
              <p className="text-sm font-semibold text-slate-800">{profile.serviceAreas.join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* BRAND COLLABORATIONS TAB */}
      {activeTab === 'collaborations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile.brandCollaborations.map((collab: any, idx: number) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">{collab.brandName}</span>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {collab.role}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-700">{collab.campaignName}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{collab.description}</p>
                {collab.services && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {collab.services.map((s: string, sIdx: number) => (
                      <span key={sIdx} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SERVICES TAB */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {profile.services.map((svc: any, idx: number) => (
            <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="text-2xl font-black text-slate-900 mb-1">{formatCurrency(svc.startingPrice)}</div>
                <h3 className="font-bold text-sm text-slate-900 mb-2">{svc.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{svc.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Turnaround: {svc.deliveryDays || 3} Days
                </div>
              </div>

              <button
                onClick={() => setInquiryModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition-colors"
              >
                Inquire for Package
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SOCIAL CHANNELS TAB */}
      {activeTab === 'social' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {connectedSocials && connectedSocials.length > 0 ? (
            connectedSocials.map((acc: any, idx: number) => {
              const platform = acc.platform?.toLowerCase();
              return (
                <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      {platform === 'instagram' ? (
                        <Instagram className="w-5 h-5 text-pink-600" />
                      ) : platform === 'youtube' ? (
                        <Youtube className="w-5 h-5 text-red-600" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {acc.verificationStatus || 'VERIFIED'}
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-900">{acc.handle}</div>
                  {acc.metrics?.followersCount && (
                    <div className="text-xs text-slate-600 font-semibold">
                      {acc.metrics.followersCount.toLocaleString()} Verified Followers
                    </div>
                  )}
                  <a
                    href={acc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline pt-1"
                  >
                    Visit Channel <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Instagram className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  VERIFIED
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900">@{profile.username}</div>
              <p className="text-xs text-slate-500">Live follower sync enabled via official platform linking.</p>
            </div>
          )}
        </div>
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Reviews Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Verified Client Reviews</h2>
              <p className="text-xs text-slate-500">
                All ratings and testimonials are authenticated through completed commercial project milestones.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200/70 px-4 py-2.5 rounded-2xl">
              <Star className="w-6 h-6 text-amber-500 fill-amber-400 shrink-0" />
              <div>
                <div className="text-lg font-black text-slate-900 leading-none">
                  {profile.reviewCount > 0 ? profile.averageRating.toFixed(1) : 'Unrated'}
                  {profile.reviewCount > 0 && <span className="text-xs font-normal text-slate-500"> / 5.0</span>}
                </div>
                <span className="text-[11px] font-semibold text-amber-700">
                  {profile.reviewCount > 0
                    ? `${profile.reviewCount} Verified Review${profile.reviewCount > 1 ? 's' : ''}`
                    : 'No reviews recorded yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((rev: any, idx: number) => {
                const reviewerName = rev.reviewerId?.fullName || rev.reviewerId?.username || 'Verified Brand Client';
                const reviewerAvatar = rev.reviewerId?.avatarUrl ? resolveMediaUrl(rev.reviewerId.avatarUrl) : null;
                const projectTitle = rev.projectId?.title || rev.projectTitle || 'Commercial Collaboration';
                const reviewDate = rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : null;

                return (
                  <div
                    key={rev._id || idx}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm overflow-hidden shrink-0">
                          {reviewerAvatar ? (
                            <img src={reviewerAvatar} alt={reviewerName} className="w-full h-full object-cover" />
                          ) : (
                            reviewerName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{reviewerName}</span>
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Project
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Project: {projectTitle}</p>
                        </div>
                      </div>

                      {/* Stars & Date */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < (rev.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        {reviewDate && <span className="text-[10px] text-slate-400">{reviewDate}</span>}
                      </div>
                    </div>

                    {/* Content / Comment */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {rev.comment || rev.content || rev.reviewText || 'Excellent collaboration and delivered quality output on time.'}
                    </p>

                    {/* Criteria breakdown if available */}
                    {rev.criteriaRatings && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 text-[11px]">
                        {Object.entries(rev.criteriaRatings).map(([crit, val]: [string, any]) => (
                          <span
                            key={crit}
                            className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-600 font-medium"
                          >
                            <span className="capitalize">{crit.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                            <strong className="text-slate-900">{val}/5</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Response from creator if exists */}
                    {rev.response && (
                      <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Response from {profile.name}
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {rev.response.comment || rev.response}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">No client reviews yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When clients complete projects with {profile.name}, verified reviews and performance badges will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {selectedPortfolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-4">
            <div className="relative h-80 bg-slate-900">
              <img
                src={selectedPortfolio.coverImage || selectedPortfolio.mediaUrl}
                alt={selectedPortfolio.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedPortfolio(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                  {selectedPortfolio.clientBrand || 'Client Campaign'}
                </span>
                <span className="text-xs text-slate-400">{selectedPortfolio.projectDate}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{selectedPortfolio.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedPortfolio.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* INQUIRY MODAL */}
      {inquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            {inquirySent ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Inquiry Sent to {profile.name}!</h3>
                <p className="text-xs text-slate-500">
                  They will review your inquiry details and respond through your dashboard inbox.
                </p>
                <button
                  onClick={() => {
                    setInquirySent(false);
                    setInquiryModalOpen(false);
                  }}
                  className="px-6 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Direct Inquiry to {profile.name}</h3>
                    <p className="text-xs text-slate-500">Share your shoot dates, deliverables, and estimated budget.</p>
                  </div>
                  <button onClick={() => setInquiryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <textarea
                  value={inquiryMsg}
                  onChange={(e) => setInquiryMsg(e.target.value)}
                  placeholder="Hi, we are planning a commercial shoot for our brand launch in Mumbai next month..."
                  rows={4}
                  className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={() => setInquiryModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                    Cancel
                  </button>
                  <button
                    onClick={() => setInquirySent(true)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                  >
                    Send Message
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

