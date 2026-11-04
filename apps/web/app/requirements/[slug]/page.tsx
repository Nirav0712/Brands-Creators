'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  MapPin,
  IndianRupee,
  Users,
  ShieldCheck,
  Send,
  Bookmark,
  Share2,
  CheckCircle2,
  Clock,
  Briefcase,
  Building2,
  Globe,
  Tag,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { ApplyModal } from '../../../components/apply-modal';

export default function RequirementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || 'direct-response-ugc-skincare-launch-mumbai';

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [requirement, setRequirement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fallbackRequirement = {
    _id: 'req-01',
    slug: 'direct-response-ugc-skincare-launch-mumbai',
    title: 'High-Impact Direct Response UGC Videos for Skincare Launch',
    description: `We are launching our new Vitamin C Brightening Serum and looking for 3 female UGC creators based in Mumbai or available for remote product delivery.

Creators will receive our full skincare product package with free shipping. We need authentic, high-converting vertical video assets emphasizing hook variations, before/after texture demos, and clear calls to action for Meta ads and Instagram Reels.`,
    budget: { min: 25000, max: 60000, currency: 'INR' },
    budgetType: 'RANGE',
    applicationDeadline: new Date(Date.now() + 6 * 86400000),
    startDate: new Date(Date.now() + 10 * 86400000),
    endDate: new Date(Date.now() + 25 * 86400000),
    applicationCount: 14,
    professionalsRequired: 3,
    requiredSkills: ['UGC Video', 'Skincare Demo', 'Reel Editing', 'Hook Scripting', 'Natural Lighting'],
    requiredLanguages: ['English', 'Hindi'],
    targetPlatforms: ['Instagram Reels', 'Meta Ads', 'TikTok'],
    targetIndustry: 'D2C Skincare & Beauty',
    categorySpecificFields: {
      contentFormat: '9:16 Vertical 4K',
      turnaroundDays: '3 Days after product delivery',
      usageRights: '90 Days Digital Ad Rights',
      audioExpectation: 'Clear Voiceover + Trending Background Music',
    },
    deliverables: [
      '3x Unique 9:16 UGC Videos (15-30s)',
      '2x Alternative Hook Intros per Video',
      'High-Resolution Raw B-Roll Footage',
      'Ad Spark / Whitelisting Codes on Request',
    ],
    location: { city: 'Mumbai', country: 'India', isRemote: true },
    brandId: {
      companyName: 'Glow Botanics India',
      slug: 'glow-botanics',
      logoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
      description: 'Award-winning organic botanicals brand bringing clean Ayurvedic skincare to modern Indian consumers.',
      verificationStatus: 'VERIFIED',
      industry: 'D2C Skincare & Beauty',
      location: { city: 'Mumbai', country: 'India' },
      websiteUrl: 'https://glowbotanics.in',
      activeRequirementsCount: 3,
    },
    categoryId: { name: 'Influencers', slug: 'influencers' },
  };

  useEffect(() => {
    async function loadRequirement() {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      try {
        const res = await fetch(`${apiUrl}/requirements/${slug}`);
        if (res.ok) {
          const data = await res.json();
          const reqDoc = data.data || data;
          if (reqDoc && reqDoc.title) {
            setRequirement(reqDoc);
          } else {
            setRequirement(fallbackRequirement);
          }
        } else {
          setRequirement(fallbackRequirement);
        }
      } catch (err) {
        setRequirement(fallbackRequirement);
      } finally {
        setLoading(false);
      }
    }
    loadRequirement();
  }, [slug]);

  const req = requirement || fallbackRequirement;
  const brand = req.brandId || fallbackRequirement.brandId;
  const daysLeft = Math.ceil((new Date(req.applicationDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/requirements"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Opportunities
        </Link>
        <span className="text-xs text-slate-400 font-mono">Opportunity #{req._id?.substring(0, 8)}</span>
      </div>

      {/* Main Grid: Details (Left 2/3) + Sticky Actions (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Title Card */}
          <div className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <img
                  src={brand.logoUrl}
                  alt={brand.companyName}
                  className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-100 shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900">{brand.companyName}</span>
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {brand.industry} • {brand.location?.city || 'Mumbai'}, India
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {req.categoryId?.name || 'Production'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {req.title}
            </h1>

            {/* Quick Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Budget</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {formatCurrency(req.budget?.min)} – {formatCurrency(req.budget?.max)}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Location</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {req.location?.isRemote ? 'Remote Friendly' : req.location?.city}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Open Positions</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {req.professionalsRequired || 1} {req.professionalsRequired === 1 ? 'Creator' : 'Creators'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Deadline</span>
                <span className="text-xs sm:text-sm font-extrabold text-indigo-600">
                  {daysLeft > 0 ? `${daysLeft} Days Left` : 'Closing Today'}
                </span>
              </div>
            </div>
          </div>

          {/* Project Brief & Narrative */}
          <div className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider">
              Project Brief & Creative Vision
            </h3>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {req.description}
            </div>
          </div>

          {/* Deliverables Scope */}
          <div className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider">
              Required Deliverables & Assets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {req.deliverables?.map((del: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    ✓
                  </div>
                  <span className="text-xs font-bold text-slate-800">{del}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category-Specific Specifications */}
          {req.categorySpecificFields && Object.keys(req.categorySpecificFields).length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider">
                Production Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {Object.entries(req.categorySpecificFields).map(([key, val], idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <strong className="text-slate-900 font-bold">{String(val)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Skills & Languages */}
          <div className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider">
              Required Skills & Formats
            </h3>
            <div className="flex flex-wrap gap-2">
              {req.requiredSkills?.map((skill: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {skill}
                </span>
              ))}
              {req.targetPlatforms?.map((platform: string, idx: number) => (
                <span
                  key={`p-${idx}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sticky Sidebar: Action Box */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-gemini-sm space-y-5">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                Client Offering Range
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(req.budget?.min)} – {formatCurrency(req.budget?.max)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Proposals with customized rate cards and portfolio links are welcomed.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => setApplyModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                Apply for Opportunity
              </button>

              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  isSaved
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-amber-600' : ''}`} />
                {isSaved ? 'Opportunity Saved' : 'Save Opportunity'}
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Applicants</span>
                <strong className="text-slate-900 font-bold">{req.applicationCount || 0} Proposals</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Application Deadline</span>
                <strong className="text-slate-900 font-bold">
                  {new Date(req.applicationDeadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Service Mode</span>
                <strong className="text-slate-900 font-bold">
                  {req.location?.isRemote ? 'Remote & Shipped' : 'On-Site Production'}
                </strong>
              </div>
            </div>
          </div>

          {/* About Client Card */}
          <div className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-gemini-sm space-y-4">
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              About the Client
            </h4>
            <div className="flex items-center gap-3">
              <img
                src={brand.logoUrl}
                alt={brand.companyName}
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <div className="font-bold text-sm text-slate-900">{brand.companyName}</div>
                <div className="text-[11px] text-slate-400 font-semibold">{brand.industry}</div>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{brand.description}</p>
            {brand.websiteUrl && (
              <a
                href={brand.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Globe className="w-3.5 h-3.5" />
                Visit Brand Website
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Apply Proposal Modal */}
      {applyModalOpen && (
        <ApplyModal
          isOpen={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          requirement={{
            _id: req._id,
            slug: req.slug,
            title: req.title,
            brandName: brand.companyName,
            budgetMin: req.budget?.min,
            budgetMax: req.budget?.max,
          }}
        />
      )}
    </div>
  );
}
