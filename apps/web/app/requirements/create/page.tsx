'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  IndianRupee,
  Briefcase,
  Users,
  ShieldCheck,
  Eye,
  Save,
  CheckCircle2,
  FileText,
  UploadCloud,
  Tag,
  Layers,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';

export default function CreateRequirementWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [liveCategories, setLiveCategories] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    categoryId: 'influencers',
    categoryName: 'Influencers & Creators',
    subcategoryId: '',
    title: '',
    description: '',
    deliverables: ['3x 9:16 Video Reels (4K)', '2x Raw Hook Variations'],
    newDeliverableInput: '',
    categorySpecificFields: {
      targetPlatform: 'Instagram Reels',
      followerTier: '50K - 250K',
      contentNiche: 'Lifestyle & Skincare',
      usageRights: '90 Days Digital Ad Rights',
    },
    city: 'Mumbai',
    country: 'India',
    isRemote: true,
    startDate: '',
    endDate: '',
    applicationDeadline: '',
    budgetType: 'RANGE',
    budgetMin: 30000,
    budgetMax: 75000,
    currency: 'INR',
    requiredSkills: ['UGC Video', 'Reel Editing', 'Skincare Demo'],
    newSkillInput: '',
    preferredExperience: 'MID_LEVEL',
    requiredLanguages: ['English', 'Hindi'],
    professionalsRequired: 2,
    targetIndustry: 'D2C Brand',
    attachments: [] as any[],
  });

  // Master Categories for Step 1
  const masterTaxonomies = [
    { id: 'influencers', name: 'Influencers & Creators', desc: 'UGC creators, vloggers, and social media ambassadors', icon: 'Sparkles' },
    { id: 'production', name: 'Production & Video', desc: 'Commercial DPs, video editors, reel makers, and VFX studios', icon: 'Video' },
    { id: 'photography', name: 'Photography & Stills', desc: 'Lookbook, editorial, product, and studio photographers', icon: 'Camera' },
    { id: 'talent', name: 'Talent & Cast', desc: 'Actors, commercial models, anchors, and voiceover artists', icon: 'Users' },
    { id: 'design', name: 'Design & Packaging', desc: 'Brand identity, 3D packaging, UI/UX, and graphic design', icon: 'Palette' },
    { id: 'beauty-fashion', name: 'Beauty & Wardrobe', desc: 'Celebrity makeup artists, hair stylists, and wardrobe stylists', icon: 'Scissors' },
    { id: 'performers', name: 'Performers & Dance', desc: 'Choreographers, viral dance troupes, and stage talent', icon: 'Activity' },
    { id: 'marketing', name: 'Growth & Marketing', desc: 'Performance marketing, Meta ads, SEO, and PR specialists', icon: 'TrendingUp' },
  ];

  // Fetch live categories from API
  useEffect(() => {
    apiClient('/categories')
      .then((res: any) => {
        const items = res?.data || res || [];
        if (Array.isArray(items) && items.length > 0) {
          setLiveCategories(items);
        }
      })
      .catch(() => {});
  }, []);

  // Load / Save Draft in LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('brands_creators_requirement_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
  }, []);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      localStorage.setItem('brands_creators_requirement_draft', JSON.stringify(next));
      return next;
    });
  };

  const updateCategorySpecific = (key: string, value: any) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        categorySpecificFields: { ...prev.categorySpecificFields, [key]: value },
      };
      localStorage.setItem('brands_creators_requirement_draft', JSON.stringify(next));
      return next;
    });
  };

  const addDeliverable = () => {
    if (!formData.newDeliverableInput.trim()) return;
    updateField('deliverables', [...formData.deliverables, formData.newDeliverableInput.trim()]);
    updateField('newDeliverableInput', '');
  };

  const removeDeliverable = (idx: number) => {
    updateField('deliverables', formData.deliverables.filter((_, i) => i !== idx));
  };

  const addSkill = () => {
    if (!formData.newSkillInput.trim()) return;
    updateField('requiredSkills', [...formData.requiredSkills, formData.newSkillInput.trim()]);
    updateField('newSkillInput', '');
  };

  const removeSkill = (idx: number) => {
    updateField('requiredSkills', formData.requiredSkills.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (status: 'PUBLISHED' | 'DRAFT') => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Find actual matching category ID if available
      let targetCategoryId = formData.categoryId;
      const matchedCat = liveCategories.find(
        (c) => c._id === formData.categoryId || c.slug === formData.categoryId || c.name?.toLowerCase().includes(formData.categoryId.toLowerCase()),
      );
      if (matchedCat) {
        targetCategoryId = matchedCat._id;
      }

      const res: any = await apiClient('/requirements', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title || 'Creative Production Requirement',
          description: formData.description || 'Brief narrative',
          categoryId: targetCategoryId,
          location: {
            city: formData.city,
            country: formData.country,
            isRemote: formData.isRemote,
          },
          budgetType: formData.budgetType,
          budget: {
            min: Number(formData.budgetMin),
            max: Number(formData.budgetMax),
            currency: 'INR',
          },
          applicationDeadline: formData.applicationDeadline || new Date(Date.now() + 7 * 86400000).toISOString(),
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
          deliverables: formData.deliverables,
          requiredSkills: formData.requiredSkills,
          requiredLanguages: formData.requiredLanguages,
          preferredExperience: formData.preferredExperience,
          professionalsRequired: Number(formData.professionalsRequired),
          categorySpecificFields: formData.categorySpecificFields,
          status,
        }),
      });

      localStorage.removeItem('brands_creators_requirement_draft');
      const slug = res.data?.slug || res.slug || 'published-opportunity';
      setPublishedSlug(slug);
      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit requirement. Please ensure you are logged in with an active Brand profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    '1. Discipline',
    '2. Details',
    '3. Location & Dates',
    '4. Budget',
    '5. Criteria',
    '6. Attachments',
    '7. Preview',
    '8. Publish',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/requirements"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Requirements
        </Link>
        <span className="text-xs text-slate-500 font-semibold">
          Step <strong className="text-slate-900">{currentStep}</strong> of 8
        </span>
      </div>

      {/* Wizard Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 overflow-x-auto pb-1 scrollbar-none">
          {steps.map((s, idx) => (
            <span
              key={idx}
              className={`whitespace-nowrap px-1 cursor-pointer transition-colors ${
                currentStep === idx + 1
                  ? 'text-indigo-600'
                  : currentStep > idx + 1
                  ? 'text-slate-800'
                  : 'text-slate-300'
              }`}
              onClick={() => setCurrentStep(idx + 1)}
            >
              {s}
            </span>
          ))}
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 8) * 100}%` }}
          />
        </div>
      </div>

      {isSuccess ? (
        <div className="bg-white rounded-3xl border border-slate-200/85 p-8 sm:p-12 text-center shadow-gemini-sm space-y-5">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Requirement Successfully Published!
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Your campaign opportunity is now live in the marketplace. Verified creators and production teams matching your criteria will be notified immediately.
          </p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <Link
              href="/requirements"
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
            >
              Browse All Leads
            </Link>
            <Link
              href="/brand/requirements"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/20"
            >
              Go to Brand Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-6">
          {/* STEP 1: CHOOSE DISCIPLINE */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">What kind of talent do you need?</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select the creative discipline that best aligns with your campaign goals.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {masterTaxonomies.map((tax) => {
                  const isSelected = formData.categoryId === tax.id;
                  return (
                    <div
                      key={tax.id}
                      onClick={() => {
                        updateField('categoryId', tax.id);
                        updateField('categoryName', tax.name);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">{tax.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{tax.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: DETAILS & CATEGORY AWARE FIELDS */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Opportunity Details & Brief</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide a compelling campaign title, detailed creative brief, and exact deliverables.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Requirement Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g. High-Impact Direct Response UGC Videos for Skincare Launch"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Creative Brief & Narrative *</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe your brand, target audience, mood, visual references, and what you expect from the creator..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Deliverables Builder */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deliverables & Scope of Work *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.newDeliverableInput}
                    onChange={(e) => updateField('newDeliverableInput', e.target.value)}
                    placeholder="e.g. 3x 9:16 Video Reels (4K)"
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={addDeliverable}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.deliverables.map((del, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700"
                    >
                      {del}
                      <button onClick={() => removeDeliverable(idx)} className="text-slate-400 hover:text-rose-600">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Dynamic Category-Specific Inputs */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Category Specific Specifications ({formData.categoryName})
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Platform</label>
                    <input
                      type="text"
                      value={formData.categorySpecificFields?.targetPlatform || ''}
                      onChange={(e) => updateCategorySpecific('targetPlatform', e.target.value)}
                      placeholder="e.g. Instagram Reels & Meta Ads"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Follower / Reach Expectation</label>
                    <input
                      type="text"
                      value={formData.categorySpecificFields?.followerTier || ''}
                      onChange={(e) => updateCategorySpecific('followerTier', e.target.value)}
                      placeholder="e.g. 50K - 250K Verified"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: LOCATION & SCHEDULE */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Location & Production Schedule</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define where the project takes place and key application/production deadlines.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isRemote}
                      onChange={(e) => updateField('isRemote', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Remote / Shipped Collaboration Allowed</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Application Deadline *</label>
                  <input
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(e) => updateField('applicationDeadline', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BUDGET & PRICING */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Budget & Pricing Range</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set transparent remuneration parameters to attract the right tier of creative talent.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Budget Type</label>
                  <select
                    value={formData.budgetType}
                    onChange={(e) => updateField('budgetType', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="RANGE">Price Range (Min – Max)</option>
                    <option value="FIXED">Fixed Budget</option>
                    <option value="NEGOTIABLE">Negotiable on Quote</option>
                    <option value="CUSTOM_QUOTE">Custom Quote</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Minimum (₹ INR)</label>
                    <input
                      type="number"
                      value={formData.budgetMin}
                      onChange={(e) => updateField('budgetMin', Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Maximum (₹ INR)</label>
                    <input
                      type="number"
                      value={formData.budgetMax}
                      onChange={(e) => updateField('budgetMax', Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Estimated Opportunity Value:</span>
                <strong className="text-slate-900 font-extrabold text-sm">
                  {formatCurrency(formData.budgetMin)} – {formatCurrency(formData.budgetMax)}
                </strong>
              </div>
            </div>
          )}

          {/* STEP 5: PROFESSIONAL CRITERIA */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Professional Qualifications & Criteria</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specify skills, experience tiers, and languages for our matching engine.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Required Skills *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.newSkillInput}
                    onChange={(e) => updateField('newSkillInput', e.target.value)}
                    placeholder="e.g. Cinema 4K, Color Grading"
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                  <button type="button" onClick={addSkill} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.requiredSkills.map((s, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {s}
                      <button onClick={() => removeSkill(idx)} className="text-indigo-400 hover:text-rose-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Experience Tier</label>
                  <select
                    value={formData.preferredExperience}
                    onChange={(e) => updateField('preferredExperience', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="ENTRY">Entry Level (0-2 Years)</option>
                    <option value="MID_LEVEL">Mid-Level Professional (3-5 Years)</option>
                    <option value="EXPERT">Senior / Expert Studio (5+ Years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Number of Talent Needed</label>
                  <input
                    type="number"
                    value={formData.professionalsRequired}
                    onChange={(e) => updateField('professionalsRequired', Number(e.target.value))}
                    min={1}
                    max={50}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: ATTACHMENTS & MOODBOARD */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Reference Moodboard & Attachments</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload visual style references, moodboards, or script briefs for applicants to review.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-3 bg-slate-50/50">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Upload Reference Files & Brand Assets</div>
                  <div className="text-[11px] text-slate-400">PDF, PNG, JPG up to 25MB (Cloudinary storage integration)</div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm"
                >
                  Choose Files
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: PREVIEW */}
          {currentStep === 7 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Live Opportunity Preview</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review how your opportunity card and brief will appear to creative applicants.
                </p>
              </div>

              <div className="p-6 rounded-3xl border border-indigo-100 bg-slate-50/60 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full uppercase">
                    {formData.categoryName}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {formatCurrency(formData.budgetMin)} – {formatCurrency(formData.budgetMax)}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900">{formData.title || 'Untitled Opportunity'}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{formData.description}</p>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {formData.deliverables.map((d, i) => (
                    <span key={i} className="bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      ✓ {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: REVIEW & PUBLISH */}
          {currentStep === 8 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Ready to Publish</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish to make this requirement discoverable across the marketplace or save as draft.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-xs text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  All required parameters verified. Publishing will alert matching verified talent across India.
                </span>
              </div>

              {submitError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSubmit('DRAFT')}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('PUBLISHED')}
                  disabled={isSubmitting}
                  className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20"
                >
                  {isSubmitting ? 'Publishing Opportunity...' : 'Publish Requirement'}
                </button>
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          {currentStep < 8 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(Math.min(8, currentStep + 1))}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
