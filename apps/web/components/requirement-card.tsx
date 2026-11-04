'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Sparkles, Send, CheckCircle2, ShieldCheck, Users } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { IRequirement } from '@brands-creators/types';
import { ApplyModal } from './apply-modal';

interface RequirementCardProps {
  requirement: Omit<Partial<IRequirement>, 'brandProfile'> & {
    brandProfile?: {
      companyName?: string;
      slug?: string;
      logoUrl?: string;
      verificationStatus?: string;
    };
  };
}

export function RequirementCard({ requirement }: RequirementCardProps) {
  const [applyOpen, setApplyOpen] = useState(false);

  const brandName = (requirement.brandId as any)?.companyName || requirement.brandProfile?.companyName || 'Verified Brand';
  const logo =
    (requirement.brandId as any)?.logoUrl ||
    requirement.brandProfile?.logoUrl ||
    'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80';
  const categoryName = (requirement.categoryId as any)?.name || 'Creative Production';
  const title = requirement.title || 'UGC & Content Creation Campaign';
  const description = requirement.description || 'Looking for talented creators for our upcoming digital campaign.';
  const minBudget = requirement.budget?.min || 15000;
  const maxBudget = requirement.budget?.max || 45000;
  const applicants = requirement.applicationCount || 0;
  const deadline = requirement.applicationDeadline
    ? new Date(requirement.applicationDeadline).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'Oct 28';
  const isRemote = requirement.location?.isRemote ?? true;

  return (
    <>
      <div className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-5 shadow-gemini-sm hover:shadow-gemini-md hover:border-slate-300 transition-all duration-300">
        <div>
          {/* Top Brand info & Category */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <img
                src={logo}
                alt={brandName}
                className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-slate-800">{brandName}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <span className="text-[11px] text-slate-400">Verified Client</span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              {categoryName}
            </span>
          </div>

          {/* Title & Description */}
          <h3 className="font-bold text-slate-900 text-base mb-1.5 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {title}
          </h3>
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
            {description}
          </p>

          {/* Deliverables / Skills tags */}
          {requirement.requiredSkills && requirement.requiredSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {requirement.requiredSkills.slice(0, 3).map((skill, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Metadata & CTA */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1 font-semibold text-slate-900 text-sm">
              <span>{formatCurrency(minBudget)}</span>
              <span className="text-slate-400 text-xs font-normal">–</span>
              <span>{formatCurrency(maxBudget)}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-slate-500">
                <MapPin className="w-3 h-3 text-slate-400" />
                {isRemote ? 'Remote' : 'On-Site'}
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <Calendar className="w-3 h-3 text-slate-400" />
                {deadline}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {applicants} {applicants === 1 ? 'Proposal' : 'Proposals'}
            </span>

            <button
              onClick={() => setApplyOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Send className="w-3 h-3" />
              Apply Now
            </button>
          </div>
        </div>
      </div>

      {/* Apply Proposal Modal */}
      {applyOpen && (
        <ApplyModal
          isOpen={applyOpen}
          onClose={() => setApplyOpen(false)}
          requirement={{
            _id: requirement._id || 'mock-id',
            title,
            brandName,
            budgetMin: minBudget,
            budgetMax: maxBudget,
          }}
        />
      )}
    </>
  );
}
