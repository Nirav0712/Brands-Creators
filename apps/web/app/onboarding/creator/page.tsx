'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Save,
  Layers,
  Camera,
  Film,
  User,
  Briefcase,
  Globe,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  DollarSign,
  MapPin,
  Clock,
  Eye,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import {
  PricingModel,
  ServiceMode,
  AvailabilityStatus,
  ExperienceLevel,
  ICategory,
} from '@brands-creators/types';
import { formatCurrency } from '../../../lib/utils';

export default function CreatorOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to canonical unified onboarding experience
    router.replace('/onboarding');
  }, [router]);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    professionalType: 'CREATOR',
    primaryCategoryId: '',
    additionalCategoryIds: [] as string[],
    subcategoryIds: [] as string[],
    headline: '',
    bio: '',
    about: '',
    city: 'Mumbai',
    country: 'India',
    serviceAreas: ['Mumbai', 'Remote'] as string[],
    skills: ['Video Production', 'Content Strategy', 'Reels'] as string[],
    languages: ['English', 'Hindi'] as string[],
    experienceLevel: ExperienceLevel.MID_LEVEL,
    experienceYears: 3,
    pricingModel: PricingModel.PER_PROJECT,
    startingPrice: 15000,
    isCustomQuoteOnly: false,
    currency: 'INR',
    serviceMode: ServiceMode.HYBRID,
    availability: AvailabilityStatus.AVAILABLE_NOW,
    coverImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    services: [
      {
        title: 'Sponsored Reel & Content Campaign',
        description: '1 Dedicated High-Quality 4K 60fps Reel with organic brand integration and story swipe-up.',
        startingPrice: 25000,
        currency: 'INR',
        pricingModel: PricingModel.PER_SHOOT,
        deliveryDays: 4,
        features: ['1x Reel Video', '2x Story Posts', 'Full Commercial Usage Rights (30 Days)'],
      },
    ],
    portfolio: [
      {
        title: 'Summer Fashion Lookbook',
        description: 'Commercial video reel and lookbook campaign highlighting urban streetwear.',
        mediaType: 'REEL',
        mediaUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        coverImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        clientBrand: 'Zara India',
        deliverables: ['1x Reel', '6x High-Res Photos'],
        tags: ['Fashion', 'Lookbook', 'Streetwear'],
        isFeatured: true,
      },
    ],
    socials: {
      instagram: 'https://instagram.com/creator_studio',
      youtube: '',
      linkedin: '',
      x: '',
      website: '',
    },
    collaborations: [
      {
        brandName: 'Nike',
        campaignName: 'Air Max Launch',
        role: 'Lead Visual Creator',
        services: ['Video Reel', 'Photography'],
        description: 'Product teaser video reel with 150k+ organic views.',
      },
    ],
  });

  // Load Categories & Current Profile Draft
  useEffect(() => {
    async function loadInitialData() {
      try {
        const catRes = await apiClient<any>('/categories');
        if (catRes) {
          const list = Array.isArray(catRes) ? catRes : (catRes.data || []);
          setCategories(list);
          if (list.length > 0 && !formData.primaryCategoryId) {
            setFormData((prev) => ({ ...prev, primaryCategoryId: list[0]._id }));
          }
        }

        // Check if existing profile
        const profileRes = await apiClient<any>('/creators/me');
        if (profileRes?.data || profileRes?.slug) {
          const p = profileRes.data || profileRes;
          setFormData((prev) => ({
            ...prev,
            headline: p.headline || prev.headline,
            bio: p.bio || prev.bio,
            about: p.about || prev.about,
            primaryCategoryId: p.primaryCategoryId?._id || p.primaryCategoryId || prev.primaryCategoryId,
            skills: p.skills?.length ? p.skills : prev.skills,
            serviceAreas: p.serviceAreas?.length ? p.serviceAreas : prev.serviceAreas,
            startingPrice: p.startingPrice || prev.startingPrice,
            pricingModel: p.pricingModel || prev.pricingModel,
            isCustomQuoteOnly: p.isCustomQuoteOnly || false,
            services: p.services?.length ? p.services : prev.services,
            portfolio: p.portfolio?.length ? p.portfolio : prev.portfolio,
            collaborations: p.brandCollaborations?.length ? p.brandCollaborations : prev.collaborations,
          }));
        }
      } catch (e) {
        console.warn('Initial onboarding fetch:', e);
      }
    }
    loadInitialData();
  }, []);

  // Compute profile completion score locally
  const completionScore = (() => {
    let score = 0;
    if (formData.headline && formData.bio) score += 15;
    if (formData.about) score += 10;
    if (formData.primaryCategoryId && formData.skills.length >= 3) score += 15;
    if (formData.serviceAreas.length > 0) score += 10;
    if (formData.services.length > 0 || formData.isCustomQuoteOnly) score += 15;
    if (formData.portfolio.length >= 1) score += 15;
    if (formData.portfolio.length >= 3) score += 5;
    if (formData.socials.instagram || formData.socials.youtube || formData.socials.website) score += 10;
    if (formData.collaborations.length > 0) score += 5;
    return Math.min(100, score);
  })();

  const handleSaveDraft = async () => {
    setSaveDraftLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient('/creators/me/draft', {
        method: 'POST',
        body: JSON.stringify({
          headline: formData.headline,
          bio: formData.bio,
          about: formData.about,
          primaryCategoryId: formData.primaryCategoryId,
          skills: formData.skills,
          serviceAreas: formData.serviceAreas,
          startingPrice: formData.startingPrice,
          pricingModel: formData.pricingModel,
          isCustomQuoteOnly: formData.isCustomQuoteOnly,
          services: formData.services,
          portfolio: formData.portfolio,
          brandCollaborations: formData.collaborations,
          location: { city: formData.city, country: formData.country },
          experienceYears: formData.experienceYears,
          experienceLevel: formData.experienceLevel,
          serviceMode: formData.serviceMode,
          availability: formData.availability,
        }),
      });

      // Also save socials
      if (formData.socials.instagram) {
        await apiClient('/social/accounts', {
          method: 'POST',
          body: JSON.stringify({ platform: 'INSTAGRAM', profileUrl: formData.socials.instagram }),
        }).catch(() => {});
      }
      if (formData.socials.youtube) {
        await apiClient('/social/accounts', {
          method: 'POST',
          body: JSON.stringify({ platform: 'YOUTUBE', profileUrl: formData.socials.youtube }),
        }).catch(() => {});
      }

      setSuccessMsg('Draft progress saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save draft progress.');
    } finally {
      setSaveDraftLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await handleSaveDraft();
      const pubRes = await apiClient<any>('/creators/me/publish', { method: 'POST' });
      const slug = pubRes?.data?.slug || pubRes?.slug || 'my-profile';
      router.push(`/creators/${slug}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not publish profile. Ensure all required fields are filled.');
      setLoading(false);
    }
  };

  const totalSteps = 8;
  const stepTitles = [
    'Category & Type',
    'Basic Information',
    'Skills & Experience',
    'Services & Rates',
    'Portfolio Projects',
    'Social Channels',
    'Brand Collaborations',
    'Review & Publish',
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24 pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Sparkles className="w-3.5 h-3.5" />
                Professional Creator Onboarding
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                Build Your Professional Identity
              </h1>
            </div>
            <button
              onClick={handleSaveDraft}
              disabled={saveDraftLoading}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              {saveDraftLoading ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-gemini-sm">
            <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-700">
              <span>
                Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
              </span>
              <span className="text-indigo-600 font-bold">{completionScore}% Profile Strength</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>

            {/* Stepper Circles */}
            <div className="hidden sm:flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
              {stepTitles.map((title, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx + 1)}
                  className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${
                    currentStep === idx + 1
                      ? 'text-indigo-600 font-bold'
                      : currentStep > idx + 1
                      ? 'text-emerald-600 font-medium'
                      : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      currentStep === idx + 1
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : currentStep > idx + 1
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {currentStep > idx + 1 ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className="hidden md:inline max-w-[70px] truncate text-center">{title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dynamic Multi-Step Body */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-md">
          {/* STEP 1: Categories & Professional Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Choose Your Primary Domain & Category</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select where you belong so brand scouts, directors, and agencies find you in exact searches.
                </p>
              </div>

              {/* Professional Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Professional Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'CREATOR', label: 'Creator / Influencer', icon: Sparkles },
                    { id: 'TALENT', label: 'Actor / Model / Voice', icon: User },
                    { id: 'VIDEOGRAPHER', label: 'Video / Filmmaking', icon: Film },
                    { id: 'PHOTOGRAPHER', label: 'Photography', icon: Camera },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, professionalType: t.id })}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        formData.professionalType === t.id
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <t.icon className={`w-5 h-5 mb-3 ${formData.professionalType === t.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="font-semibold text-sm">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Primary Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => setFormData({ ...formData, primaryCategoryId: cat._id })}
                      className={`p-3.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                        formData.primaryCategoryId === cat._id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-semibold ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold">{cat.name}</div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{cat.description}</p>
                      </div>
                      {formData.primaryCategoryId === cat._id && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Basic Information & About */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Basic Profile Details & Bio</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Craft an engaging pitch and detailed overview that explains who you are and what you deliver.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Professional Title / Headline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="e.g. Award-Winning Food Creator & Commercial Cinematographer"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Short Bio (Summary for cards & search) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="2-3 crisp sentences highlighting your niche and unique creative edge..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Detailed About Story (Rich text overview)
                </label>
                <textarea
                  rows={4}
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  placeholder="Share your full creative journey, past campaign philosophies, equipment, and workflow..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Base City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Mumbai, Ahmedabad, Delhi"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Service Areas (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.serviceAreas.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        serviceAreas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="e.g. Mumbai, Delhi, Ahmedabad, Remote"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Skills & Experience */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Skills, Languages & Experience</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tag specific tools, specialties, and languages to rank accurately in discovery filters.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Core Skills & Tools (Comma-separated) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.skills.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. DaVinci Resolve, 4K Reel Production, Drone Cinematography, Color Grading"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.skills.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-700 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Experience Level
                  </label>
                  <select
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value as ExperienceLevel })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                  >
                    <option value={ExperienceLevel.ENTRY}>Entry / Rising Talent (&lt; 1 yr)</option>
                    <option value={ExperienceLevel.JUNIOR}>Junior Specialist (1-2 yrs)</option>
                    <option value={ExperienceLevel.MID_LEVEL}>Mid-Level Professional (3-5 yrs)</option>
                    <option value={ExperienceLevel.SENIOR}>Senior Veteran (5-8 yrs)</option>
                    <option value={ExperienceLevel.LEAD_EXPERT}>Industry Expert / Director (8+ yrs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Years in Industry
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Languages Spoken
                </label>
                <input
                  type="text"
                  value={formData.languages.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. English, Hindi, Gujarati, Marathi"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Services & Rates */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Services & Pricing Models</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Define your rates clearly or offer custom quotes for bespoke productions.
                </p>
              </div>

              {/* Pricing Model & Starting Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Default Pricing Model
                  </label>
                  <select
                    value={formData.pricingModel}
                    onChange={(e) => setFormData({ ...formData, pricingModel: e.target.value as PricingModel })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                  >
                    <option value={PricingModel.PER_PROJECT}>Per Project</option>
                    <option value={PricingModel.PER_DAY}>Per Day</option>
                    <option value={PricingModel.PER_HOUR}>Per Hour</option>
                    <option value={PricingModel.PER_SHOOT}>Per Shoot</option>
                    <option value={PricingModel.MONTHLY}>Monthly Retainer</option>
                    <option value={PricingModel.CUSTOM_QUOTE}>Custom Quote</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Starting Rate (₹ INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={formData.isCustomQuoteOnly}
                    value={formData.startingPrice}
                    onChange={(e) => setFormData({ ...formData, startingPrice: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="quoteOnly"
                    checked={formData.isCustomQuoteOnly}
                    onChange={(e) => setFormData({ ...formData, isCustomQuoteOnly: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="quoteOnly" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Contact for pricing only (Do not enforce fixed starting price publicly)
                  </label>
                </div>
              </div>

              {/* Service Packages */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Service Packages</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        services: [
                          ...formData.services,
                          {
                            title: 'New Service Package',
                            description: 'Description of scope, deliverables, and format.',
                            startingPrice: 10000,
                            currency: 'INR',
                            pricingModel: PricingModel.PER_PROJECT,
                            deliveryDays: 3,
                            features: ['Deliverable 1', 'Deliverable 2'],
                          },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="w-4 h-4" /> Add Package
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.services.map((srv, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={srv.title}
                          onChange={(e) => {
                            const updated = [...formData.services];
                            updated[idx].title = e.target.value;
                            setFormData({ ...formData, services: updated });
                          }}
                          className="font-semibold text-slate-900 text-sm border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none flex-1 mr-2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.services.filter((_, i) => i !== idx);
                            setFormData({ ...formData, services: updated });
                          }}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={srv.description}
                        onChange={(e) => {
                          const updated = [...formData.services];
                          updated[idx].description = e.target.value;
                          setFormData({ ...formData, services: updated });
                        }}
                        placeholder="Package deliverables and terms..."
                        className="w-full text-xs text-slate-600 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block mb-1">Price (₹)</span>
                          <input
                            type="number"
                            value={srv.startingPrice}
                            onChange={(e) => {
                              const updated = [...formData.services];
                              updated[idx].startingPrice = Number(e.target.value);
                              setFormData({ ...formData, services: updated });
                            }}
                            className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Turnaround Days</span>
                          <input
                            type="number"
                            value={srv.deliveryDays || 3}
                            onChange={(e) => {
                              const updated = [...formData.services];
                              updated[idx].deliveryDays = Number(e.target.value);
                              setFormData({ ...formData, services: updated });
                            }}
                            className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Portfolio Projects */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Visual Portfolio Showcase</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Upload your flagship projects, commercial reels, and creative campaigns.
                </p>
              </div>

              <div className="space-y-4">
                {formData.portfolio.map((item, idx) => (
                  <div key={idx} className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                        Project #{idx + 1} ({item.mediaType})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.portfolio.filter((_, i) => i !== idx);
                          setFormData({ ...formData, portfolio: updated });
                        }}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Project Title</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const updated = [...formData.portfolio];
                            updated[idx].title = e.target.value;
                            setFormData({ ...formData, portfolio: updated });
                          }}
                          className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Client / Brand</label>
                        <input
                          type="text"
                          value={item.clientBrand || ''}
                          onChange={(e) => {
                            const updated = [...formData.portfolio];
                            updated[idx].clientBrand = e.target.value;
                            setFormData({ ...formData, portfolio: updated });
                          }}
                          placeholder="e.g. Nike, Puma, Swiggy"
                          className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Media / Cover Image URL</label>
                      <input
                        type="text"
                        value={item.mediaUrl}
                        onChange={(e) => {
                          const updated = [...formData.portfolio];
                          updated[idx].mediaUrl = e.target.value;
                          updated[idx].coverImage = e.target.value;
                          setFormData({ ...formData, portfolio: updated });
                        }}
                        className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Short Description</label>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => {
                          const updated = [...formData.portfolio];
                          updated[idx].description = e.target.value;
                          setFormData({ ...formData, portfolio: updated });
                        }}
                        className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      portfolio: [
                        ...formData.portfolio,
                        {
                          title: 'Creative Reel',
                          description: 'Viral video production project.',
                          mediaType: 'REEL',
                          mediaUrl:
                            'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
                          coverImage:
                            'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
                          clientBrand: 'Brand Client',
                          deliverables: ['1x Reel'],
                          tags: ['Video', 'Cinematography'],
                          isFeatured: false,
                        },
                      ],
                    })
                  }
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Another Portfolio Item
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Social Profiles */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Connect Social Accounts</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Add your profile links. We safely extract handles and display official metrics when available.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 shrink-0">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.socials.instagram}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socials: { ...formData.socials, instagram: e.target.value },
                      })
                    }
                    placeholder="https://instagram.com/your_handle"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.socials.youtube}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socials: { ...formData.socials, youtube: e.target.value },
                      })
                    }
                    placeholder="https://youtube.com/@your_channel"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Linkedin className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.socials.linkedin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socials: { ...formData.socials, linkedin: e.target.value },
                      })
                    }
                    placeholder="https://linkedin.com/in/your_profile"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.socials.website}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socials: { ...formData.socials, website: e.target.value },
                      })
                    }
                    placeholder="https://yourportfolio.com"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Brand Collaborations & Availability */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Previous Collaborations & Availability</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Highlight past brand associations and set your live booking availability.
                </p>
              </div>

              {/* Availability Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Availability Status
                  </label>
                  <select
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value as AvailabilityStatus })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                  >
                    <option value={AvailabilityStatus.AVAILABLE_NOW}>Available Now (Immediate Shoots)</option>
                    <option value={AvailabilityStatus.BUSY}>Busy / Booking 2+ Weeks Out</option>
                    <option value={AvailabilityStatus.NOT_AVAILABLE}>Currently Not Available</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Service Delivery Mode
                  </label>
                  <select
                    value={formData.serviceMode}
                    onChange={(e) => setFormData({ ...formData, serviceMode: e.target.value as ServiceMode })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                  >
                    <option value={ServiceMode.HYBRID}>Hybrid (Remote & On-Site)</option>
                    <option value={ServiceMode.ON_SITE}>On-Site Only</option>
                    <option value={ServiceMode.REMOTE}>Remote / Digital Only</option>
                  </select>
                </div>
              </div>

              {/* Collaborations list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Past Brand Collaborations</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        collaborations: [
                          ...formData.collaborations,
                          {
                            brandName: 'New Brand',
                            campaignName: 'Product Launch',
                            role: 'Creator',
                            services: ['Reel'],
                            description: 'Commercial campaign.',
                          },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="w-4 h-4" /> Add Collaboration
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.collaborations.map((col, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={col.brandName}
                          onChange={(e) => {
                            const updated = [...formData.collaborations];
                            updated[idx].brandName = e.target.value;
                            setFormData({ ...formData, collaborations: updated });
                          }}
                          placeholder="Brand Name (e.g. Nike, Adidas)"
                          className="font-semibold text-slate-900 text-sm border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none flex-1 mr-2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.collaborations.filter((_, i) => i !== idx);
                            setFormData({ ...formData, collaborations: updated });
                          }}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <input
                          type="text"
                          value={col.campaignName}
                          onChange={(e) => {
                            const updated = [...formData.collaborations];
                            updated[idx].campaignName = e.target.value;
                            setFormData({ ...formData, collaborations: updated });
                          }}
                          placeholder="Campaign Name (e.g. Festive Launch)"
                          className="p-2 rounded-lg border border-slate-200"
                        />
                        <input
                          type="text"
                          value={col.role}
                          onChange={(e) => {
                            const updated = [...formData.collaborations];
                            updated[idx].role = e.target.value;
                            setFormData({ ...formData, collaborations: updated });
                          }}
                          placeholder="Your Role (e.g. Lead Influencer)"
                          className="p-2 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Review & Publish */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Review & Publish Your Profile</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Your profile is ready to go live! Review the strength meter and publish to the public marketplace.
                </p>
              </div>

              {/* Profile Completion Widget */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Profile Strength</span>
                    <h3 className="text-2xl font-black text-slate-900">{completionScore}% Completed</h3>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                    {completionScore}%
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Headline & Short Bio configured</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Primary category & {formData.skills.length} skills selected</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{formData.portfolio.length} Visual portfolio projects attached</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Rate card & services defined ({formatCurrency(formData.startingPrice)})</span>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white">
                <h4 className="font-bold text-slate-900 text-sm mb-3">Live Summary Preview</h4>
                <div className="text-xs space-y-1.5 text-slate-600">
                  <p><strong className="text-slate-900">Headline:</strong> {formData.headline}</p>
                  <p><strong className="text-slate-900">Location:</strong> {formData.city}, India ({formData.serviceAreas.join(', ')})</p>
                  <p><strong className="text-slate-900">Starting Rate:</strong> {formData.isCustomQuoteOnly ? 'Custom Quote' : formatCurrency(formData.startingPrice)}</p>
                  <p><strong className="text-slate-900">Availability:</strong> {formData.availability}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saveDraftLoading}
                className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700"
              >
                <Save className="w-3.5 h-3.5" />
                {saveDraftLoading ? 'Saving...' : 'Draft'}
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-95"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePublish}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {loading ? 'Publishing Profile...' : 'Publish Profile to Marketplace'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
