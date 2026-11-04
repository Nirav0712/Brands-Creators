'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  Globe,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  MapPin,
  Users,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

export default function BrandOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to canonical unified onboarding experience
    router.replace('/onboarding');
  }, [router]);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: 'Lumina Brand Studio',
    tagline: 'Modern Sustainable Apparel & Lifestyle Essentials',
    industry: 'Fashion & Apparel',
    foundedYear: 2021,
    teamSize: 15,
    companySize: '11-50 employees',
    city: 'Mumbai',
    country: 'India',
    serviceAreas: ['Pan-India', 'Mumbai', 'Delhi NCR', 'Bangalore'] as string[],
    websiteUrl: 'https://luminastudio.example.com',
    contactEmail: 'collaborations@luminastudio.example.com',
    contactPhone: '+91 98765 43210',
    description:
      'Lumina is a premium direct-to-consumer apparel brand designed for creators, founders, and modern professionals. We partner with top visual storytellers, fashion influencers, and production houses for high-impact seasonal campaigns.',
    logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=300&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    socials: {
      instagram: 'https://instagram.com/luminastudio',
      linkedin: 'https://linkedin.com/company/luminastudio',
      website: 'https://luminastudio.example.com',
    },
    previousCampaigns: [
      {
        title: 'Spring Summer 2026 Direct-Response Video Campaign',
        description: 'Collaborated with 12 lifestyle creators for organic unboxing and high-fashion reels.',
        year: 2026,
        budgetRange: '₹5,00,000 - ₹10,00,000',
        deliverables: ['12x Reels', '24x Story Sets'],
      },
    ],
  });

  useEffect(() => {
    async function loadBrandProfile() {
      try {
        const brandRes = await apiClient<any>('/brands/me');
        if (brandRes?.companyName || brandRes?.data?.companyName) {
          const b = brandRes.data || brandRes;
          setFormData((prev) => ({
            ...prev,
            companyName: b.companyName || prev.companyName,
            tagline: b.tagline || prev.tagline,
            industry: b.industry || prev.industry,
            description: b.description || prev.description,
            foundedYear: b.foundedYear || prev.foundedYear,
            teamSize: b.teamSize || prev.teamSize,
            companySize: b.companySize || prev.companySize,
            websiteUrl: b.websiteUrl || prev.websiteUrl,
            contactEmail: b.contactEmail || prev.contactEmail,
            serviceAreas: b.serviceAreas?.length ? b.serviceAreas : prev.serviceAreas,
          }));
        }
      } catch (e) {
        console.warn('Brand initial fetch:', e);
      }
    }
    loadBrandProfile();
  }, []);

  const handleSaveDraft = async () => {
    setSaveDraftLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient('/brands/me/draft', {
        method: 'POST',
        body: JSON.stringify({
          companyName: formData.companyName,
          tagline: formData.tagline,
          industry: formData.industry,
          description: formData.description,
          foundedYear: formData.foundedYear,
          teamSize: formData.teamSize,
          companySize: formData.companySize,
          websiteUrl: formData.websiteUrl,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          logoUrl: formData.logoUrl,
          coverImageUrl: formData.coverImageUrl,
          location: { city: formData.city, country: formData.country },
          serviceAreas: formData.serviceAreas,
          previousCampaigns: formData.previousCampaigns,
        }),
      });

      if (formData.socials.instagram) {
        await apiClient('/social/accounts', {
          method: 'POST',
          body: JSON.stringify({ platform: 'INSTAGRAM', profileUrl: formData.socials.instagram }),
        }).catch(() => {});
      }

      setSuccessMsg('Brand draft saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save brand draft.');
    } finally {
      setSaveDraftLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await handleSaveDraft();
      const pubRes = await apiClient<any>('/brands/me/publish', { method: 'POST' });
      const slug = pubRes?.data?.slug || pubRes?.slug || 'my-company';
      router.push(`/brands/${slug}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to publish brand profile.');
      setLoading(false);
    }
  };

  const totalSteps = 7;
  const stepTitles = [
    'Company Info',
    'Industry & Niche',
    'Locations',
    'Website & Socials',
    'About & Vision',
    'Branding & Logo',
    'Review & Publish',
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24 pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Building2 className="w-3.5 h-3.5" />
                Brand & Business Onboarding
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                Establish Your Brand Profile
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
              <span className="text-emerald-600 font-bold">
                {Math.round((currentStep / totalSteps) * 100)}% Completed
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
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

        {/* Wizard Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-md">
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Company Information</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your official brand name, tagline, and founding details.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company / Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Nike, Swiggy, Lumina Studio"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Brand Tagline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. Delivering premium sustainable essentials for urban creators."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Founded Year
                  </label>
                  <input
                    type="number"
                    value={formData.foundedYear}
                    onChange={(e) => setFormData({ ...formData, foundedYear: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Company Size
                  </label>
                  <select
                    value={formData.companySize}
                    onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                  >
                    <option value="1-10 employees">1-10 employees (Startup / Boutique)</option>
                    <option value="11-50 employees">11-50 employees (Growth stage)</option>
                    <option value="51-200 employees">51-200 employees (Scale-up)</option>
                    <option value="200+ employees">200+ employees (Enterprise)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Industry */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Industry & Core Niche</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select your primary sector so creators relevant to your vertical can discover your campaigns.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  'Fashion & Apparel',
                  'Food & Beverage',
                  'Beauty & Personal Care',
                  'Technology & SaaS',
                  'Health & Fitness',
                  'Travel & Hospitality',
                  'Entertainment & Media',
                  'Automobile',
                  'Fintech & Banking',
                  'D2C & E-Commerce',
                  'Jewelry & Luxury',
                  'Real Estate',
                ].map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setFormData({ ...formData, industry: ind })}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      formData.industry === ind
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Headquarters & Operating Regions</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Specify where your brand operates and where you scout creators for on-site productions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Headquarters City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Mumbai, Bangalore, Gurgaon"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Campaign Service Areas (Comma-separated)
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
                    placeholder="e.g. Pan-India, Mumbai, Delhi, Remote"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Website & Social */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Website & Official Channels</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Add your brand website and active social channels.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Official Website URL <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://yourbrand.com"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Instagram Brand Page
                </label>
                <div className="flex items-center gap-2">
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
                    placeholder="https://instagram.com/yourbrand"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Collaborations Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="creators@yourbrand.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Description */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Company Story & Creator Philosophy</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tell creators what makes your brand unique and what you look for in collaborations.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Detailed Company Overview <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Share your brand mission, target demographic, and creator campaign objectives..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Step 6: Visual Branding */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Brand Logo & Hero Banner</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Provide high-resolution image URLs for your company logo and cover banner.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Logo URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cover Banner URL
                </label>
                <input
                  type="text"
                  value={formData.coverImageUrl}
                  onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              {/* Live Preview */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-500 block mb-2">Banner Preview</span>
                <div className="h-32 rounded-xl overflow-hidden relative bg-slate-200">
                  <img src={formData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl bg-white p-1 shadow-md">
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Review & Publish */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Review & Publish Brand Profile</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Your brand profile is set. Publish to the marketplace to start posting requirements and shortlisting talent.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 space-y-4">
                <div className="flex items-center gap-4">
                  <img src={formData.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-emerald-200 shadow-sm bg-white" />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{formData.companyName}</h3>
                    <p className="text-xs text-slate-500">{formData.industry} • {formData.city}, India</p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{formData.description}</p>
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
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all active:scale-95"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePublish}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-slate-900 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {loading ? 'Publishing Brand Profile...' : 'Publish Business Profile'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
