'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Tag,
  Briefcase,
  Layers,
  Building2,
  Video,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';

export default function OnboardingWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Form states
  const [role, setRole] = useState<'CREATOR' | 'BRAND' | 'PRODUCTION_TEAM'>('CREATOR');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [location, setLocation] = useState({
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    area: '',
    postalCode: '',
    addressLine1: '',
  });
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, any>>({});

  useEffect(() => {
    // Fetch categories
    apiClient
      .get('/categories')
      .then((res) => {
        const list = res.data || res;
        if (Array.isArray(list)) setCategories(list);
      })
      .catch(() => {});

    // Prefill from current user if available
    apiClient
      .get('/auth/me')
      .then((res) => {
        const u = res.data || res;
        if (u) {
          if (u.roles && u.roles.length > 0) {
            setRole(u.roles[0]);
          }
          if (u.onboardingCompleted) {
            // Already completed onboarding, proceed to dashboard
          }
        }
      })
      .catch(() => {});
  }, []);

  const toggleCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await apiClient.post('/auth/onboarding/complete', {
        selectedCategoryIds,
        location,
        headline,
        bio,
        customFieldValues: customFieldsValues,
      });

      // Update local storage
      const userStr = localStorage.getItem('bc_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        u.onboardingCompleted = true;
        localStorage.setItem('bc_user', JSON.stringify(u));
      }

      router.push('/dashboard?onboarding=complete');
    } catch (err: any) {
      alert(err.message || 'Failed to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  // Find active custom fields for chosen categories
  const activeCustomFields = categories
    .filter((c) => selectedCategoryIds.includes(c._id))
    .flatMap((c) => c.customFields || []);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 py-12">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200/80">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>STEP {step} OF 4</span>
            <span>{Math.round((step / 4) * 100)}% COMPLETED</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Persona & Headline */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Choose Your Profile Persona</h2>
              <p className="text-xs text-slate-500 mt-1">
                How do you plan to use Brands & Creators? This customizes your dashboard and opportunity matching.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'CREATOR', title: 'Creator & Talent', icon: Sparkles, desc: 'Influencers, artists, models, UGC creators' },
                { key: 'PRODUCTION_TEAM', title: 'Production Team', icon: Video, desc: 'Studios, directors, editors, drone pilots' },
                { key: 'BRAND', title: 'Brand / Client', icon: Building2, desc: 'Agencies, direct brands, marketing managers' },
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key as any)}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-3 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-xs text-slate-900">{r.title}</div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-snug">{r.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Professional Headline / Studio Name *
                </label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Travel & Lifestyle Video Creator | Commercial Drone Unit"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brief Bio / Summary
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short introduction about your specialties, target audience, or requirements..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>Continue</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Categories Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Select Your Niches & Categories</h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose the vertical domains that best align with your creative capabilities.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat._id);
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => toggleCategory(cat._id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10 font-bold text-indigo-900'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs truncate">{cat.name}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>Continue</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Location Details */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Location & Neighborhood</h2>
              <p className="text-xs text-slate-500 mt-1">
                Provide your city and neighborhood so local clients and projects can discover you via proximity discovery.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={location.city}
                  onChange={(e) => setLocation({ ...location, city: e.target.value })}
                  placeholder="e.g. Bangalore, Mumbai, Delhi"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={location.state}
                  onChange={(e) => setLocation({ ...location, state: e.target.value })}
                  placeholder="e.g. Karnataka, Maharashtra"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Neighborhood / Locality</label>
                <input
                  type="text"
                  value={location.area}
                  onChange={(e) => setLocation({ ...location, area: e.target.value })}
                  placeholder="e.g. Indiranagar, Bandra, HSR Layout"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code (PIN)</label>
                <input
                  type="text"
                  value={location.postalCode}
                  onChange={(e) => setLocation({ ...location, postalCode: e.target.value })}
                  placeholder="e.g. 560038"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>Continue</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Custom Fields & Completion */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Category Specifications & Finish</h2>
              <p className="text-xs text-slate-500 mt-1">
                {activeCustomFields.length > 0
                  ? 'Complete the specific requirements for your selected categories.'
                  : 'You are all set! Review and launch your profile.'}
              </p>
            </div>

            {activeCustomFields.length > 0 ? (
              <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                {activeCustomFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {field.label} {field.required && '*'}
                    </label>
                    {field.type === 'BOOLEAN' ? (
                      <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(customFieldsValues[field.key])}
                          onChange={(e) =>
                            setCustomFieldsValues({ ...customFieldsValues, [field.key]: e.target.checked })
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-slate-600">Yes, certified / compliant</span>
                      </label>
                    ) : (
                      <input
                        type={field.type === 'NUMBER' ? 'number' : 'text'}
                        value={customFieldsValues[field.key] || ''}
                        onChange={(e) =>
                          setCustomFieldsValues({ ...customFieldsValues, [field.key]: e.target.value })
                        }
                        placeholder={field.placeholder || `Enter ${field.label}`}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-emerald-900">Everything looks great!</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Your profile details will be immediately indexed into the marketplace and category-aware dashboard.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> <span>Back</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'Finalizing Profile...' : 'Complete Onboarding & Launch'}</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

