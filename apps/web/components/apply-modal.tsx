'use client';

import React, { useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  CheckCircle2,
  Calendar,
  IndianRupee,
  FileCheck,
  Star,
  Check,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { apiClient } from '../lib/api-client';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: {
    _id: string;
    slug?: string;
    title: string;
    brandName: string;
    budgetMin: number;
    budgetMax: number;
    currency?: string;
  };
}

export function ApplyModal({ isOpen, onClose, requirement }: ApplyModalProps) {
  const [proposal, setProposal] = useState('');
  const [offeredPrice, setOfferedPrice] = useState(requirement.budgetMin || 25000);
  const [availability, setAvailability] = useState('Immediately Available');
  const [estimatedDelivery, setEstimatedDelivery] = useState('3-5 Business Days');
  const [additionalMessage, setAdditionalMessage] = useState('');
  const [selectedPortfolioIdxs, setSelectedPortfolioIdxs] = useState<number[]>([0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDraftingAi, setIsDraftingAi] = useState(false);
  const [aiTone, setAiTone] = useState<'PERSUASIVE' | 'CINEMATIC' | 'PROFESSIONAL' | 'CONCISE'>('PERSUASIVE');

  const handleGenerateAiPitch = async () => {
    setIsDraftingAi(true);
    try {
      const res = await apiClient.post('/ai/proposal-pitch', {
        requirementTitle: requirement.title,
        creatorBio: 'Award-winning commercial creator with a verified track record in high-impact creative campaigns.',
        tone: aiTone,
        keySkills: ['Creative Direction', 'Storyboarding', 'Production Quality', 'Turnaround Velocity'],
      });
      if (res?.pitch) {
        setProposal(res.pitch);
      }
      if (res?.suggestedTimeline) {
        setEstimatedDelivery(res.suggestedTimeline);
      }
    } catch (err: any) {
      console.warn('AI Proposal generator fallback:', err?.message);
      setProposal(
        `Hi ${requirement.brandName} Team,\n\nI reviewed your brief "${requirement.title}" and would love to collaborate. With proven commercial experience and complete end-to-end production capabilities, I will deliver standout creative assets tailored for maximum performance.\n\nKey Focus:\n• High-retention hooks and native pacing\n• Studio-grade color grading and clean audio\n• Rapid turnaround with revisions included\n\nLooking forward to bringing this vision to life!`
      );
    } finally {
      setIsDraftingAi(false);
    }
  };

  // Sample portfolio items available for instant selection from logged-in creator
  const availablePortfolio = [
    {
      title: 'Commercial 4K Brand Film',
      mediaType: 'VIDEO',
      mediaUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=400&q=80',
      coverImage: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=400&q=80',
      clientBrand: 'Porsche / Nike',
    },
    {
      title: 'Viral Direct Response UGC Video Reel',
      mediaType: 'REEL',
      mediaUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80',
      coverImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80',
      clientBrand: 'Glow Botanics',
    },
    {
      title: 'Studio Fashion & Editorial Catalog',
      mediaType: 'IMAGE',
      mediaUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80',
      coverImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80',
      clientBrand: 'Zara Festive',
    },
  ];

  if (!isOpen) return null;

  const togglePortfolio = (idx: number) => {
    if (selectedPortfolioIdxs.includes(idx)) {
      setSelectedPortfolioIdxs(selectedPortfolioIdxs.filter((i) => i !== idx));
    } else {
      if (selectedPortfolioIdxs.length >= 5) return;
      setSelectedPortfolioIdxs([...selectedPortfolioIdxs, idx]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal.trim()) {
      setErrorMsg('Please enter your proposal pitch.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const selectedItems = selectedPortfolioIdxs.map((idx) => availablePortfolio[idx]);

    try {
      await apiClient('/applications', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: requirement._id,
          proposal,
          offeredPrice: Number(offeredPrice),
          currency: 'INR',
          availability,
          estimatedDelivery,
          selectedPortfolioItems: selectedItems,
          additionalMessage,
        }),
      });

      setIsSuccess(true);
    } catch (err: any) {
      const msg = err.message || 'Failed to submit application. Please try again.';
      if (msg.toLowerCase().includes('already submitted') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('conflict')) {
        setErrorMsg('You have already submitted an application for this opportunity.');
      } else if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('login')) {
        setErrorMsg('Please sign in as a registered creator to submit an application.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-y-auto space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Application Submitted!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Your proposal, rate card, and selected portfolio projects were delivered to{' '}
              <strong className="text-slate-900">{requirement.brandName}</strong>. You will receive an in-app notification when your application is reviewed or shortlisted.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                Return to Marketplace
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Submit Pro Proposal
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 line-clamp-1">
                {requirement.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span>Client: <strong className="text-slate-800">{requirement.brandName}</strong></span>
                <span>•</span>
                <span>
                  Budget: <strong className="text-slate-900 font-bold">{formatCurrency(requirement.budgetMin)} – {formatCurrency(requirement.budgetMax)}</strong>
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Proposal Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="block text-xs font-bold text-slate-700">
                  Your Proposal Pitch & Creative Approach *
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as any)}
                    className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="PERSUASIVE">Persuasive</option>
                    <option value="CINEMATIC">Cinematic</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="CONCISE">Concise</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleGenerateAiPitch}
                    disabled={isDraftingAi}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className={`w-3 h-3 ${isDraftingAi ? 'animate-spin text-indigo-600' : 'text-indigo-500'}`} />
                    {isDraftingAi ? 'Drafting...' : 'AI Pitch Assistant'}
                  </button>
                </div>
              </div>
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Explain why you are the ideal professional for this campaign, your equipment/technique, timeline, and how you will deliver outstanding results..."
                rows={4}
                required
                className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
              />
            </div>

            {/* Bid & Delivery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Offered Quote (₹ INR) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(Number(e.target.value))}
                    min={1000}
                    required
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimated Delivery Timeline
                </label>
                <input
                  type="text"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  placeholder="e.g. 3-5 Business Days"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                />
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Availability
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800"
              >
                <option value="Immediately Available">Immediately Available</option>
                <option value="Available from Next Week">Available from Next Week</option>
                <option value="Available Next Month">Available Next Month</option>
                <option value="Custom Dates on Request">Custom Dates on Request</option>
              </select>
            </div>

            {/* Portfolio Selection (Select 1-3 items) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Select Relevant Portfolio Projects (1–3 items)</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {selectedPortfolioIdxs.length} selected
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {availablePortfolio.map((item, idx) => {
                  const isSelected = selectedPortfolioIdxs.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => togglePortfolio(idx)}
                      className={`cursor-pointer rounded-2xl border p-2 relative overflow-hidden transition-all text-left ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="w-full h-14 rounded-lg object-cover mb-1.5"
                      />
                      <div className="text-[11px] font-bold text-slate-800 line-clamp-1">{item.title}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{item.clientBrand}</div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Note / Equipment Details (Optional)
              </label>
              <input
                type="text"
                value={additionalMessage}
                onChange={(e) => setAdditionalMessage(e.target.value)}
                placeholder="e.g. Shooting with Sony FX6 + G-Master lenses, studio available in Andheri"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
