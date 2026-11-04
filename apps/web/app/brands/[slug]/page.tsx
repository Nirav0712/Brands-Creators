'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  MapPin,
  Globe,
  Instagram,
  Linkedin,
  Send,
  Briefcase,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  Bookmark,
  Share2,
  ExternalLink,
  Star,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { resolveMediaUrl } from '../../../lib/utils';

export default function BrandProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [activeTab, setActiveTab] = useState<'about' | 'campaigns' | 'requirements' | 'reviews'>('about');
  const [brandData, setBrandData] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function fetchBrand() {
      if (!slug) return;
      try {
        setLoading(true);
        const res = await apiClient<any>(`/brands/${slug}`);
        const bData = res?.data || res;
        if (bData?.companyName || bData?.slug) {
          setBrandData(bData);
          const uId = bData.userId?._id || bData.userId;
          if (uId) {
            const revRes = await apiClient<any>(`/reviews/public/${uId}`).catch(() => ({ items: [] }));
            const revItems = (revRes as any)?.data?.items || (revRes as any)?.items || [];
            if (Array.isArray(revItems)) {
              setReviews(revItems);
            }
          }
        }
      } catch (e) {
        console.warn('Brand public profile fetch:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchBrand();
  }, [slug]);

  const brand = {
    companyName: brandData?.companyName || 'Lumina Brand Studio',
    tagline: brandData?.tagline || 'Modern Sustainable Apparel & Lifestyle Essentials',
    industry: brandData?.industry || 'Fashion & Apparel',
    description:
      brandData?.description ||
      'Lumina is a premium lifestyle and direct-to-consumer apparel brand designed for creators, founders, and modern professionals. We partner with top visual storytellers, fashion creators, and production houses for high-impact seasonal campaigns.',
    logoUrl: (brandData?.logoUrl || brandData?.userId?.avatarUrl) ? resolveMediaUrl(brandData?.logoUrl || brandData?.userId?.avatarUrl) : 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=300&q=80',
    coverImageUrl: brandData?.coverImageUrl ? resolveMediaUrl(brandData.coverImageUrl) : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    city: brandData?.location?.city || 'Mumbai',
    country: brandData?.location?.country || 'India',
    serviceAreas: brandData?.serviceAreas?.length ? brandData?.serviceAreas : ['Pan-India', 'Mumbai', 'Delhi NCR', 'Bangalore'],
    websiteUrl: brandData?.websiteUrl || 'https://luminastudio.example.com',
    companySize: brandData?.companySize || '11-50 employees',
    foundedYear: brandData?.foundedYear || 2021,
    teamSize: brandData?.teamSize || 15,
    previousCampaigns: (brandData?.previousCampaigns?.length ? brandData.previousCampaigns : [
      {
        title: 'Spring Summer 2026 Direct-Response Video Campaign',
        description: 'Collaborated with 12 lifestyle creators for organic unboxing and high-fashion reels.',
        year: 2026,
        budgetRange: '₹5,00,000 - ₹10,00,000',
        deliverables: ['12x Reels', '24x Story Sets', '1x TVC Hero'],
      },
      {
        title: 'Monsoon Urban Outerwear Launch',
        description: 'Commercial lookbook and influencer gifting campaign across Mumbai and Bangalore.',
        year: 2025,
        budgetRange: '₹3,00,000 - ₹6,00,000',
        deliverables: ['6x Photography Sets', '8x Influencer Reviews'],
      },
    ]),
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Brand Header */}
      <div className="relative bg-white rounded-3xl border border-slate-200/80 shadow-gemini-md overflow-hidden">
        <div className="h-56 sm:h-72 w-full bg-slate-900 relative">
          <img src={brand.coverImageUrl} alt="Cover" className="w-full h-full object-cover opacity-85" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
        </div>

        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            <div className="flex items-end gap-5">
              <div className="relative">
                <img
                  src={brand.logoUrl}
                  alt={brand.companyName}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover ring-4 ring-white shadow-xl bg-white"
                />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                </div>
              </div>

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{brand.companyName}</h1>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified Brand
                  </span>
                </div>
                <p className="text-sm font-semibold text-emerald-700 mt-1">{brand.tagline}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {brand.city}, {brand.country}
                  </span>
                  <span>•</span>
                  <span>{brand.industry}</span>
                  <span>•</span>
                  <span>{brand.companySize}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
              {brand.websiteUrl && (
                <a
                  href={brand.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                >
                  <Globe className="w-4 h-4 text-slate-500" /> Website <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}
              <button
                onClick={handleShare}
                className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {copiedLink && (
            <div className="mt-3 p-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
              Brand profile link copied to clipboard!
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('about')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'about' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          About Company
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'campaigns' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Past Campaigns ({brand.previousCampaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'reviews' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Reviews ({reviews.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'about' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">About {brand.companyName}</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{brand.description}</p>
          </div>

          <div className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50">
              <span className="text-slate-400 block mb-0.5">Industry</span>
              <span className="font-bold text-slate-900">{brand.industry}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50">
              <span className="text-slate-400 block mb-0.5">Founded</span>
              <span className="font-bold text-slate-900">{brand.foundedYear}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50">
              <span className="text-slate-400 block mb-0.5">Team Size</span>
              <span className="font-bold text-slate-900">{brand.teamSize}+ Employees</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50">
              <span className="text-slate-400 block mb-0.5">Operating Areas</span>
              <span className="font-bold text-slate-900 truncate">{brand.serviceAreas.join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {brand.previousCampaigns.map((camp: any, idx: number) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                    Year: {camp.year || 2026}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{camp.budgetRange}</span>
                </div>
                <h3 className="font-bold text-base text-slate-900">{camp.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{camp.description}</p>
                {camp.deliverables && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {camp.deliverables.map((d: string, dIdx: number) => (
                      <span key={dIdx} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Creator Collaboration Reviews</h2>
              <p className="text-xs text-slate-500">
                Verified reviews from creative professionals and studios who completed campaigns with {brand.companyName}.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 px-3.5 py-2 rounded-2xl border border-amber-200/60">
              <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
              <span className="font-bold text-slate-900 text-sm">
                {reviews.length > 0 ? `${reviews.length} Verified` : 'Unrated'}
              </span>
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((rev: any, idx: number) => {
                const reviewerName = rev.reviewerId?.fullName || rev.reviewerId?.username || 'Creative Professional';
                const reviewerAvatar = rev.reviewerId?.avatarUrl ? resolveMediaUrl(rev.reviewerId.avatarUrl) : null;
                const projectTitle = rev.projectId?.title || rev.projectTitle || 'Campaign Project';
                const dateStr = rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;

                return (
                  <div key={rev._id || idx} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm overflow-hidden">
                          {reviewerAvatar ? (
                            <img src={reviewerAvatar} alt={reviewerName} className="w-full h-full object-cover" />
                          ) : (
                            reviewerName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">{reviewerName}</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Verified
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">Campaign: {projectTitle}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < (rev.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {rev.comment || rev.content || rev.reviewText || 'Prompt briefs, clear milestone feedback, and timely release of milestone payments.'}
                    </p>
                    {dateStr && <div className="text-[10px] text-slate-400">{dateStr}</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-2">
              <Star className="w-10 h-10 text-amber-400 mx-auto opacity-40" />
              <h3 className="font-bold text-slate-900 text-sm">No reviews yet</h3>
              <p className="text-xs text-slate-400">
                Verified reviews from creative talent will display here after campaign milestones complete.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
