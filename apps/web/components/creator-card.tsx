'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Star, MapPin, Sparkles, Eye, Bookmark, Zap } from 'lucide-react';
import { formatCurrency, formatCompactNumber, resolveMediaUrl } from '../lib/utils';
import { ICreatorProfile, VerificationStatus, PricingModel, AvailabilityStatus } from '@brands-creators/types';

interface CreatorCardProps {
  creator: Omit<Partial<ICreatorProfile>, 'user' | 'verificationStatus'> & {
    verificationStatus?: VerificationStatus | string;
    pricingModel?: PricingModel;
    isCustomQuoteOnly?: boolean;
    availability?: AvailabilityStatus;
    user?: {
      fullName?: string;
      username?: string;
      avatarUrl?: string;
    };
  };
}

export function CreatorCard({ creator }: CreatorCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  const name =
    creator.user?.fullName ||
    (creator as any).userId?.fullName ||
    creator.headline ||
    'Creative Talent';
  const username =
    creator.slug ||
    creator.user?.username ||
    (creator as any).userId?.username ||
    'creator';
  const rawAvatar =
    creator.user?.avatarUrl ||
    (creator as any).userId?.avatarUrl ||
    (creator as any).avatarUrl;
  const avatar =
    (rawAvatar && resolveMediaUrl(rawAvatar)) ||
    `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`;
  const coverImage =
    (creator.coverImageUrl && resolveMediaUrl(creator.coverImageUrl)) ||
    (creator.portfolio && creator.portfolio.length > 0
      ? resolveMediaUrl(creator.portfolio[0].coverImage || creator.portfolio[0].mediaUrl)
      : null) ||
    `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80`;

  const categoryName = (creator as any).primaryCategoryId?.name || (creator.primaryCategory as any)?.name || 'Creative Specialist';
  const city = creator.location?.city || 'Mumbai';
  const price = creator.startingPrice || 5000;
  const rating = creator.averageRating || 4.9;
  const reviews = creator.reviewCount || 12;
  const followers = creator.totalFollowers || 45000;

  const getPricingModelLabel = (model?: PricingModel) => {
    switch (model) {
      case PricingModel.PER_HOUR:
        return '/hr';
      case PricingModel.PER_DAY:
        return '/day';
      case PricingModel.PER_SHOOT:
        return '/shoot';
      case PricingModel.MONTHLY:
        return '/mo';
      case PricingModel.CUSTOM_QUOTE:
        return 'Quote';
      default:
        return '/project';
    }
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-gemini-sm hover:shadow-gemini-md hover:border-indigo-200 transition-all duration-300 overflow-hidden">
      {/* Visual Cover Preview */}
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
        <img
          src={coverImage}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 backdrop-blur-md text-slate-800 shadow-sm border border-white/40">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            {categoryName}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsSaved(!isSaved);
            }}
            title={isSaved ? 'Saved to shortlist' : 'Shortlist Talent'}
            className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center shadow-sm transition-all active:scale-90 ${
              isSaved
                ? 'bg-indigo-600 text-white shadow-indigo-200'
                : 'bg-white/90 text-slate-600 hover:text-indigo-600 hover:bg-white'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Availability & Follower Pills */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          {creator.availability === AvailabilityStatus.AVAILABLE_NOW ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Available Now
            </span>
          ) : (
            <span className="text-[10px] text-slate-300 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-md">
              Book in advance
            </span>
          )}

          <div className="text-[11px] font-medium text-white/90 bg-slate-900/70 backdrop-blur-md px-2 py-0.5 rounded-md">
            {formatCompactNumber(followers)} Reach
          </div>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Avatar and Name row */}
          <div className="flex items-start gap-3 -mt-9 relative z-10 mb-2.5">
            <div className="relative">
              <img
                src={avatar}
                alt={name}
                className="w-14 h-14 rounded-xl object-cover ring-4 ring-white shadow-md bg-white"
              />
              {creator.verificationStatus === 'VERIFIED' && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm" title="Verified Professional">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-6">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-900 text-base truncate group-hover:text-indigo-600 transition-colors">
                  {name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-slate-400" />
                {city}, India
              </p>
            </div>
          </div>

          {/* Headline & Bio */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
            {creator.headline || creator.bio || 'Creative storytelling and high-impact visual productions.'}
          </p>

          {/* Skills Chips */}
          {creator.skills && creator.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {creator.skills.slice(0, 3).map((skill, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium bg-slate-100/90 text-slate-600 px-2 py-0.5 rounded-md"
                >
                  {skill}
                </span>
              ))}
              {creator.skills.length > 3 && (
                <span className="text-[10px] font-medium text-slate-400 self-center">
                  +{creator.skills.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer: Rating, Starting Price & CTA */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({reviews})</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {creator.isCustomQuoteOnly ? (
                <span className="font-semibold text-slate-800">Custom Quote</span>
              ) : (
                <>
                  Starts at <span className="font-bold text-slate-900">{formatCurrency(price)}</span>
                  <span className="text-[10px] text-slate-400 font-medium"> {getPricingModelLabel(creator.pricingModel)}</span>
                </>
              )}
            </div>
          </div>

          <Link
            href={`/creators/${username}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-indigo-600 shadow-sm transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

