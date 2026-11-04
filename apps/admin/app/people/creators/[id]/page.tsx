'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  Star,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  Save,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  Globe,
  Plus,
  Layers,
  MapPin,
  Clock,
  IndianRupee,
  Activity,
  History,
  AlertCircle,
  Briefcase,
  FileCheck,
  Ban,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../../../../lib/utils';
import { apiClient } from '../../../../lib/api-client';

export default function AdminCreatorDetailEditor() {
  const params = useParams();
  const router = useRouter();
  const creatorId = (params?.id as string) || 'cr-01';

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PROFILE' | 'PORTFOLIO' | 'SOCIAL' | 'VERIFICATION' | 'AUDIT'>('OVERVIEW');
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Profile state for editing
  const [profile, setProfile] = useState({
    id: creatorId,
    fullName: 'Rohan Kapoor',
    username: 'rohankapoor',
    email: 'rohan@dpcinema.com',
    headline: 'Automotive & Commercial Cinematographer',
    bio: 'Award-winning Director of Photography specializing in high-speed automotive commercials, narrative short films, and stylized brand documentaries.',
    city: 'Mumbai',
    country: 'India',
    serviceAreas: ['Mumbai', 'Delhi NCR', 'Remote', 'Goa'],
    languages: ['English', 'Hindi', 'Gujarati'],
    primaryCategory: 'Production',
    subcategory: 'Cinematography',
    experienceLevel: 'EXPERT',
    yearsOfExperience: 8,
    availabilityStatus: 'AVAILABLE_NOW',
    startingPrice: 28000,
    pricingModel: 'PER_SHOOT',
    verificationStatus: 'VERIFIED',
    visibility: 'PUBLISHED',
    isFeatured: true,
    profileCompletion: 95,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
    skills: ['Cinema 4K', 'Color Grading', 'FPV Drone', 'Car Rigs', 'DaVinci Resolve', 'Arri Alexa'],
    services: [
      { name: 'Commercial Shoot (Full Day)', price: 45000, pricingModel: 'PER_DAY' },
      { name: 'Social Reel 4K Package', price: 28000, pricingModel: 'PER_SHOOT' },
      { name: 'Color Grading Master', price: 15000, pricingModel: 'PER_PROJECT' },
    ],
    portfolio: [
      {
        id: 'p-1',
        title: 'Porsche Taycan — Speed & Electric Soul',
        category: 'Automotive Commercial',
        type: 'VIDEO',
        clientName: 'Porsche India',
        coverImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
        videoUrl: 'https://youtube.com/watch?v=sample-taycan',
        isFeatured: true,
        tags: ['Automotive', 'Cinema 4K', 'Car Rig'],
      },
      {
        id: 'p-2',
        title: 'Nike — Run Beyond Boundaries',
        category: 'Brand Commercial',
        type: 'REEL',
        clientName: 'Nike Running',
        coverImage: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=800&q=80',
        isFeatured: true,
        tags: ['Athletic', 'High Speed', 'Color Grade'],
      },
      {
        id: 'p-3',
        title: 'Zara Festive Autumn Lookbook',
        category: 'Fashion Campaign',
        type: 'IMAGE',
        clientName: 'Zara Apparel',
        coverImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
        isFeatured: false,
        tags: ['Fashion', 'Studio Light', 'Lookbook'],
      },
    ],
    socialAccounts: [
      { platform: 'INSTAGRAM', username: 'rohankapoor_dp', followers: 128000, engagementRate: 4.8, isConnected: true },
      { platform: 'YOUTUBE', username: 'RohanKapoorCinematography', followers: 45000, isConnected: true },
      { platform: 'LINKEDIN', username: 'rohan-kapoor-dp', followers: 12500, isConnected: true },
    ],
  });

  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'log-1',
      action: 'PROFILE_VERIFIED',
      adminUser: 'Admin Team (admin@brandsandcreators.com)',
      timestamp: '2026-10-04 14:22:10',
      notes: 'Reviewed government ID and verified commercial client reels.',
    },
    {
      id: 'log-2',
      action: 'PRICING_UPDATED',
      adminUser: 'System Auto-Sync',
      timestamp: '2026-10-02 09:15:00',
      notes: 'Starting price updated to ₹28,000 / Shoot.',
    },
    {
      id: 'log-3',
      action: 'PROFILE_CREATED',
      adminUser: 'Rohan Kapoor (Self)',
      timestamp: '2026-09-28 18:40:12',
      notes: 'Completed 8-step creator onboarding wizard.',
    },
  ]);

  const loadCreator = async () => {
    if (!creatorId || creatorId === 'cr-01') return;
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/creators/${creatorId}`);
      const data = res?.data !== undefined ? res.data : res;
      if (data && (data._id || data.slug)) {
        setProfile((prev) => ({
          ...prev,
          id: data._id || creatorId,
          fullName: data.userId?.fullName || prev.fullName,
          username: data.userId?.username || data.slug || prev.username,
          email: data.userId?.email || prev.email,
          headline: data.headline || prev.headline,
          bio: data.bio || prev.bio,
          city: data.location?.city || prev.city,
          country: data.location?.country || prev.country,
          primaryCategory: data.primaryCategoryId?.name || prev.primaryCategory,
          startingPrice: data.startingPrice || prev.startingPrice,
          pricingModel: data.pricingModel || prev.pricingModel,
          verificationStatus: data.verificationStatus || prev.verificationStatus,
          visibility: data.visibilityStatus || prev.visibility,
          skills: data.skills?.length ? data.skills : prev.skills,
          avatarUrl: data.userId?.avatarUrl || prev.avatarUrl,
        }));
      }
    } catch (err) {
      console.warn('Could not load creator details from API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreator();
  }, [creatorId]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = {
      id: `log-${Date.now()}`,
      action: 'PROFILE_MANUAL_EDIT',
      adminUser: 'Admin Team',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: 'Admin updated core profile information.',
    };
    setAuditLogs([newLog, ...auditLogs]);
    showToast('Creator profile updated successfully!');
  };

  const toggleVerification = async () => {
    const next = profile.verificationStatus === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED';
    setProfile({ ...profile, verificationStatus: next });
    const newLog = {
      id: `log-${Date.now()}`,
      action: next === 'VERIFIED' ? 'PROFILE_VERIFIED' : 'VERIFICATION_REVOKED',
      adminUser: 'Admin Team',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: `Verification status changed to ${next}.`,
    };
    setAuditLogs([newLog, ...auditLogs]);
    showToast(`Verification status updated to ${next}.`);

    try {
      await apiClient.post(`/admin/creators/${creatorId}/verify`, { status: next });
    } catch (err) {
      console.warn('API verification call failed:', err);
    }
  };

  const toggleSuspension = () => {
    const next = profile.visibility === 'SUSPENDED' ? 'PUBLISHED' : 'SUSPENDED';
    setProfile({ ...profile, visibility: next });
    const newLog = {
      id: `log-${Date.now()}`,
      action: next === 'SUSPENDED' ? 'PROFILE_SUSPENDED' : 'PROFILE_RESTORED',
      adminUser: 'Admin Team',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: `Visibility updated to ${next}.`,
    };
    setAuditLogs([newLog, ...auditLogs]);
    showToast(`Profile visibility changed to ${next}.`);
  };

  const toggleFeatured = () => {
    setProfile({ ...profile, isFeatured: !profile.isFeatured });
    showToast(`Featured status toggled to ${!profile.isFeatured ? 'Featured' : 'Standard'}.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/people/creators"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Creators Roster
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={`http://localhost:3000/creators/${profile.username}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            View Public Marketplace Profile
          </a>
        </div>
      </div>

      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-gemini-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={profile.avatarUrl}
            alt={profile.fullName}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {profile.fullName}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  profile.verificationStatus === 'VERIFIED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                {profile.verificationStatus}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  profile.visibility === 'PUBLISHED'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {profile.visibility}
              </span>
              {profile.isFeatured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Featured
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              @{profile.username} • {profile.headline} • {profile.city}, {profile.country}
            </div>
          </div>
        </div>

        {/* Quick Moderation Actions */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
          <button
            onClick={toggleVerification}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-sm"
          >
            {profile.verificationStatus === 'VERIFIED' ? 'Revoke Verified Badge' : 'Grant Verified Pro'}
          </button>
          <button
            onClick={toggleFeatured}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              profile.isFeatured
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Star className={`w-3.5 h-3.5 inline mr-1 ${profile.isFeatured ? 'fill-current' : ''}`} />
            {profile.isFeatured ? 'Unfeature' : 'Feature Pro'}
          </button>
          <button
            onClick={toggleSuspension}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              profile.visibility === 'SUSPENDED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {profile.visibility === 'SUSPENDED' ? 'Restore Profile' : 'Suspend Profile'}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'OVERVIEW', label: '1. Overview' },
          { key: 'PROFILE', label: '2. Profile & Rates' },
          { key: 'PORTFOLIO', label: `3. Portfolio (${profile.portfolio.length})` },
          { key: 'SOCIAL', label: `4. Social Accounts (${profile.socialAccounts.length})` },
          { key: 'VERIFICATION', label: '5. Verification & Badges' },
          { key: 'AUDIT', label: `6. Activity & Audit Trail (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-gemini-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Identity & Bio Summary
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Primary Discipline</span>
                  <strong className="text-slate-900 font-bold">{profile.primaryCategory}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Subcategory</span>
                  <strong className="text-slate-900 font-bold">{profile.subcategory}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Experience</span>
                  <strong className="text-slate-900 font-bold">{profile.yearsOfExperience} Years ({profile.experienceLevel})</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Starting Rate</span>
                  <strong className="text-slate-900 font-bold">{formatCurrency(profile.startingPrice)} /{profile.pricingModel?.replace('PER_', '')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Availability</span>
                  <strong className="text-slate-900 font-bold">{profile.availabilityStatus}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Languages</span>
                  <strong className="text-slate-900 font-bold">{profile.languages.join(', ')}</strong>
                </div>
              </div>
            </div>

            {/* Skills & Service Areas */}
            <div className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-gemini-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Skills & Service Areas
              </h3>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Verified Skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill, idx) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg text-xs font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Service Areas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.serviceAreas.map((area, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-gemini-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Profile Health Score
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-indigo-600">{profile.profileCompletion}%</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Ready for Hiring
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${profile.profileCompletion}%` }} />
              </div>
              <ul className="text-xs text-slate-600 space-y-2 pt-2">
                <li className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Profile Photo & Cover Uploaded
                </li>
                <li className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Detailed Bio & Service Areas
                </li>
                <li className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> 3+ Verified Portfolio Projects
                </li>
                <li className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Official Social Accounts Connected
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFILE & RATES FORM */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-base text-slate-900">Edit Professional Information</h3>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Professional Headline</label>
              <input
                type="text"
                value={profile.headline}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Story & Bio</label>
            <textarea
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Starting Price (₹)</label>
              <input
                type="number"
                value={profile.startingPrice}
                onChange={(e) => setProfile({ ...profile, startingPrice: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pricing Model</label>
              <select
                value={profile.pricingModel}
                onChange={(e) => setProfile({ ...profile, pricingModel: e.target.value as any })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
              >
                <option value="PER_SHOOT">Per Shoot</option>
                <option value="PER_DAY">Per Day</option>
                <option value="PER_PROJECT">Per Project</option>
                <option value="PER_HOUR">Per Hour</option>
                <option value="MONTHLY">Monthly Retainer</option>
                <option value="CUSTOM_QUOTE">Custom Quote</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Availability</label>
              <select
                value={profile.availabilityStatus}
                onChange={(e) => setProfile({ ...profile, availabilityStatus: e.target.value as any })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
              >
                <option value="AVAILABLE_NOW">Available Now</option>
                <option value="BOOKING_NEXT_MONTH">Booking Next Month</option>
              </select>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: PORTFOLIO */}
      {activeTab === 'PORTFOLIO' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">
              Behance-Grade Creative Portfolio ({profile.portfolio.length} Projects)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.portfolio.map((item) => (
              <div key={item.id} className="bg-white rounded-3xl border border-slate-200/85 overflow-hidden shadow-gemini-sm group">
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                    {item.type}
                  </span>
                  {item.isFeatured && (
                    <span className="absolute top-3 right-3 bg-amber-500 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Featured
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="text-[11px] font-bold text-indigo-600">{item.clientName}</div>
                  <h4 className="font-bold text-sm text-slate-900 truncate">{item.title}</h4>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SOCIAL ACCOUNTS */}
      {activeTab === 'SOCIAL' && (
        <div className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-6 animate-in fade-in">
          <h3 className="font-extrabold text-base text-slate-900">
            Connected Official Social Profiles & Metrics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {profile.socialAccounts.map((acc, idx) => (
              <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {acc.platform === 'INSTAGRAM' && <Instagram className="w-5 h-5 text-pink-600" />}
                    {acc.platform === 'YOUTUBE' && <Youtube className="w-5 h-5 text-rose-600" />}
                    {acc.platform === 'LINKEDIN' && <Linkedin className="w-5 h-5 text-blue-600" />}
                    <span className="font-bold text-xs text-slate-900">{acc.platform}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Connected
                  </span>
                </div>
                <div>
                  <div className="font-mono text-xs text-slate-700">@{acc.username}</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">
                    {(acc.followers / 1000).toFixed(0)}K Followers
                  </div>
                  {acc.engagementRate && (
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      {acc.engagementRate}% Engagement Rate
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: VERIFICATION */}
      {activeTab === 'VERIFICATION' && (
        <div className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-6 animate-in fade-in">
          <h3 className="font-extrabold text-base text-slate-900">
            Platform Verification & Professional Badging
          </h3>
          <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-slate-900">Verified Pro Status: {profile.verificationStatus}</h4>
              <p className="text-xs text-slate-600 mt-1">
                Verified Pro creators receive priority placement in search discovery, verified badge on public cards, and access to direct brand leads.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={toggleVerification}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  {profile.verificationStatus === 'VERIFIED' ? 'Revoke Verified Status' : 'Approve & Grant Verified Badge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-3xl border border-slate-200/85 p-6 sm:p-8 shadow-gemini-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              Immutable Action & Moderation Audit Trail
            </h3>
          </div>

          <div className="space-y-4">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 font-mono">{log.action}</span>
                    <span className="text-[11px] text-slate-400">• {log.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{log.notes}</p>
                  <div className="text-[10px] text-slate-400 mt-1 font-medium">By: {log.adminUser}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
