'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Building2,
  Video,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  X,
  Edit3,
  Globe,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Star,
  Sparkles,
  Layers,
  Clock,
  DollarSign,
  Lock,
  ArrowRight,
  UploadCloud,
  Check,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { formatCurrency, resolveMediaUrl } from '../../lib/utils';

function MyProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get('edit');

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(editParam === '1' || editParam === 'true');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Core User state
  const [user, setUser] = useState<any>(null);
  // Role profile state
  const [roleProfile, setRoleProfile] = useState<any>(null);

  // Photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formData, setFormData] = useState<any>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // 1. Fetch authenticated user
      const userRes = await apiClient.get('/auth/me');
      const userData = userRes?.data || userRes;

      if (!userData || !userData.email) {
        throw new Error('Please sign in to access your profile.');
      }
      setUser(userData);

      // 2. Fetch role-specific details
      const roles: string[] = userData.roles || [];
      let profileData: any = null;

      if (roles.includes('CREATOR')) {
        const creatorRes = await apiClient.get('/creators/me').catch(() => null);
        profileData = creatorRes?.data || creatorRes;
      } else if (roles.includes('BRAND')) {
        const brandRes = await apiClient.get('/brands/me').catch(() => null);
        profileData = brandRes?.data || brandRes;
      } else if (roles.includes('PRODUCTION_TEAM')) {
        const prodRes = await apiClient.get('/production-teams/me').catch(() => null);
        profileData = prodRes?.data || prodRes;
      }

      setRoleProfile(profileData);

      // Initialize form data
      setFormData({
        // User basic fields
        fullName: userData.fullName || '',
        phone: userData.phone || '',

        // Creator fields
        headline: profileData?.headline || '',
        bio: profileData?.bio || '',
        about: profileData?.about || '',
        skills: Array.isArray(profileData?.skills) ? profileData.skills.join(', ') : '',
        startingPrice: profileData?.startingPrice ?? 5000,
        currency: profileData?.currency || 'INR',
        pricingModel: profileData?.pricingModel || 'FIXED',
        serviceMode: profileData?.serviceMode || 'HYBRID',
        availability: profileData?.availability || 'AVAILABLE_NOW',
        experienceYears: profileData?.experienceYears ?? 1,
        experienceLevel: profileData?.experienceLevel || 'MID_LEVEL',
        city: profileData?.location?.city || '',
        country: profileData?.location?.country || 'India',

        // Brand fields
        companyName: profileData?.companyName || userData.fullName || '',
        tagline: profileData?.tagline || '',
        description: profileData?.description || '',
        industry: profileData?.industry || 'Consumer Goods & E-commerce',
        companySize: profileData?.companySize || '11-50',
        foundedYear: profileData?.foundedYear ?? 2022,
        websiteUrl: profileData?.websiteUrl || '',
        contactEmail: profileData?.contactEmail || userData.email || '',
        contactPhone: profileData?.contactPhone || userData.phone || '',

        // Production Team fields
        studioName: profileData?.studioName || userData.fullName || '',
        teamSize: profileData?.teamSize ?? 5,
        equipmentRoster: Array.isArray(profileData?.equipmentRoster)
          ? profileData.equipmentRoster.join(', ')
          : '',
        specialties: Array.isArray(profileData?.specialties)
          ? profileData.specialties.join(', ')
          : '',
        startingDayRate: profileData?.startingDayRate ?? 25000,
      });
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setErrorMessage(err?.message || 'Failed to load profile. Please sign in again.');
      if (err?.message?.includes('Unauthorized') || err?.message?.includes('sign in')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Handle Photo Picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Invalid image format. Only JPEG, PNG, and WebP are allowed.');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size exceeds the 5 MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;
    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      const form = new FormData();
      form.append('file', selectedFile);

      const token = typeof window !== 'undefined' ? localStorage.getItem('bc_access_token') : null;
      const res = await fetch('http://localhost:4000/api/v1/media/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to upload image');
      }

      const updatedAvatar = data?.data?.avatarUrl || data?.avatarUrl;

      // Update local state and stored user
      if (updatedAvatar) {
        setUser((prev: any) => ({ ...prev, avatarUrl: updatedAvatar }));
        try {
          const stored = localStorage.getItem('bc_user');
          if (stored) {
            const u = JSON.parse(stored);
            u.avatarUrl = updatedAvatar;
            localStorage.setItem('bc_user', JSON.stringify(u));
          }
        } catch (e) {}
      }

      setPhotoModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccessMessage('Profile photo updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setPhotoError(err?.message || 'Photo upload failed. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;
    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      await apiClient.delete('/media/avatar');
      setUser((prev: any) => ({ ...prev, avatarUrl: null }));
      try {
        const stored = localStorage.getItem('bc_user');
        if (stored) {
          const u = JSON.parse(stored);
          u.avatarUrl = null;
          localStorage.setItem('bc_user', JSON.stringify(u));
        }
      } catch (e) {}

      setPhotoModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccessMessage('Profile photo removed.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setPhotoError(err?.message || 'Failed to remove photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Update Core User Details
      await apiClient.patch('/auth/me', {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
      });

      // Handle password update if specified
      if (passwordData.newPassword) {
        if (!passwordData.currentPassword) {
          throw new Error('Current password is required to set a new password.');
        }
        if (passwordData.newPassword.length < 8) {
          throw new Error('New password must be at least 8 characters long.');
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          throw new Error('New passwords do not match.');
        }
        await apiClient.patch('/auth/me', {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }

      // 2. Update Role-Specific Details
      const isCreator = user.roles?.includes('CREATOR');
      const isBrand = user.roles?.includes('BRAND');
      const isProduction = user.roles?.includes('PRODUCTION_TEAM');

      if (isCreator) {
        const skillsArray = formData.skills
          ? formData.skills
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

        await apiClient.patch('/creators/me', {
          headline: formData.headline.trim(),
          bio: formData.bio.trim(),
          about: formData.about.trim(),
          skills: skillsArray,
          startingPrice: Number(formData.startingPrice) || 0,
          currency: formData.currency,
          pricingModel: formData.pricingModel,
          serviceMode: formData.serviceMode,
          availability: formData.availability,
          experienceYears: Number(formData.experienceYears) || 0,
          experienceLevel: formData.experienceLevel,
          location: {
            city: formData.city.trim() || 'Mumbai',
            country: formData.country.trim() || 'India',
          },
        });
      } else if (isBrand) {
        await apiClient.patch('/brands/me', {
          companyName: formData.companyName.trim(),
          tagline: formData.tagline.trim(),
          description: formData.description.trim(),
          industry: formData.industry.trim(),
          companySize: formData.companySize,
          foundedYear: Number(formData.foundedYear) || 2022,
          websiteUrl: formData.websiteUrl.trim(),
          contactEmail: formData.contactEmail.trim(),
          contactPhone: formData.contactPhone.trim(),
          location: {
            city: formData.city.trim() || 'Mumbai',
            country: formData.country.trim() || 'India',
          },
        });
      } else if (isProduction) {
        const specsArray = formData.specialties
          ? formData.specialties
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];
        const equipArray = formData.equipmentRoster
          ? formData.equipmentRoster
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

        await apiClient.patch('/production-teams/me', {
          studioName: formData.studioName.trim(),
          tagline: formData.tagline.trim(),
          description: formData.description.trim(),
          teamSize: Number(formData.teamSize) || 3,
          specialties: specsArray,
          equipmentRoster: equipArray,
          startingDayRate: Number(formData.startingDayRate) || 0,
          location: {
            city: formData.city.trim() || 'Mumbai',
            country: formData.country.trim() || 'India',
          },
        });
      }

      // Re-fetch profile from backend to ensure data is strictly persisted
      await loadProfile();

      setIsEditing(false);
      setSuccessMessage('Your profile changes have been saved successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMessage(err?.message || 'Failed to save profile. Please review the form fields.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Loading your profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Session Required</h2>
        <p className="text-xs text-slate-500 max-w-sm">Please sign in to view and manage your profile details.</p>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const isCreator = user.roles?.includes('CREATOR');
  const isBrand = user.roles?.includes('BRAND');
  const isProduction = user.roles?.includes('PRODUCTION_TEAM');
  const isAdmin = user.roles?.includes('ADMIN') || user.roles?.includes('SUPER_ADMIN');

  const roleTitle = isAdmin
    ? 'Super Admin'
    : isBrand
    ? 'Brand / Enterprise'
    : isProduction
    ? 'Production Studio'
    : isCreator
    ? 'Creative Professional'
    : 'Platform User';

  const isVerified =
    roleProfile?.verificationStatus === 'VERIFIED' || user?.verificationStatus === 'VERIFIED';

  const avatarUrl = user.avatarUrl ? resolveMediaUrl(user.avatarUrl) : null;

  const completionScore = roleProfile?.completion?.score ?? roleProfile?.completionPercentage ?? null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-gemini-sm overflow-hidden">
        {/* Cover Gradient */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 relative" />

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-12 gap-4 pb-6 border-b border-slate-100">
            {/* Avatar & Photo Picker */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-slate-900 border-4 border-white shadow-gemini-md flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(user.fullName || user.username || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                {/* Photo Change Overlay Button */}
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-2 border-white transition-all transform hover:scale-105"
                  title="Change profile photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {user.fullName || user.username}
                  </h1>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Unverified
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span>@{user.username}</span>
                  <span>•</span>
                  <span>{user.email}</span>
                  <span>•</span>
                  <span className="font-bold text-indigo-600 uppercase tracking-wider">{roleTitle}</span>
                </div>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPhotoModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                Change Photo
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 ${
                  isEditing
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditing ? 'Cancel Editing' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Profile Completion Guidance (if applicable) */}
          {completionScore !== null && (
            <div className="mt-5 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Profile Completion Score</span>
                </div>
                <span className="text-xs font-extrabold text-indigo-600">{completionScore}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionScore}%` }}
                />
              </div>
              {roleProfile?.completion?.items && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {roleProfile.completion.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                      {item.completed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={item.completed ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: View Mode vs Edit Mode */}
      {isEditing ? (
        /* EDIT PROFILE FORM */
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-gemini-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Edit Account & Personal Details</h2>
              <p className="text-xs text-slate-500">Update your public display information and contact channels</p>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Display Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Read-Only Identity Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Registered Email (Read-Only)
                </label>
                <div className="text-xs font-semibold text-slate-700">{user.email}</div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  System Role (Protected)
                </label>
                <div className="text-xs font-bold text-indigo-600">{roleTitle}</div>
              </div>
            </div>

            {/* ROLE-SPECIFIC FIELDS: CREATOR */}
            {isCreator && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Creator Professional Services & Rates
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Professional Headline</label>
                  <input
                    type="text"
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. Travel & Lifestyle Cinematographer | Sony Alpha Ambassador"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Short Bio (Tagline)</label>
                  <input
                    type="text"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Brief description for marketplace search results"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">About & Creative Background</label>
                  <textarea
                    rows={4}
                    value={formData.about}
                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Detailed introduction, past brand collaborations, equipment, and storytelling style..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Starting Rate (INR)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.startingPrice}
                      onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Experience Level</label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="JUNIOR">Junior (1-2 yrs)</option>
                      <option value="MID_LEVEL">Mid Level (2-5 yrs)</option>
                      <option value="SENIOR">Senior (5-8 yrs)</option>
                      <option value="EXPERT">Expert (8+ yrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Years of Experience</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Mode</label>
                    <select
                      value={formData.serviceMode}
                      onChange={(e) => setFormData({ ...formData, serviceMode: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                    >
                      <option value="HYBRID">Hybrid (Remote + On-site)</option>
                      <option value="REMOTE">Remote Only</option>
                      <option value="ON_SITE">On-site Production Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Availability Status</label>
                    <select
                      value={formData.availability}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                    >
                      <option value="AVAILABLE_NOW">Available Now</option>
                      <option value="BOOKED_THIS_MONTH">Booked This Month</option>
                      <option value="UNAVAILABLE">Unavailable</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Skills & Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Cinematography, Color Grading, UGC Videos, Drone Piloting"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="India"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ROLE-SPECIFIC FIELDS: BRAND */}
            {isBrand && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Brand & Company Information
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Company / Brand Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Brand Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. Next-Gen Sustainable Activewear"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Company Description</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Overview of your brand mission, target audience, and marketing campaigns..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Industry</label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Company Size</label>
                    <select
                      value={formData.companySize}
                      onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                    >
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Founded Year</label>
                    <input
                      type="number"
                      value={formData.foundedYear}
                      onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Website URL</label>
                    <input
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                      placeholder="https://brand.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ROLE-SPECIFIC FIELDS: PRODUCTION TEAM */}
            {isProduction && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Video className="w-4 h-4 text-indigo-600" />
                  Production Studio & Crew Details
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Studio Name</label>
                  <input
                    type="text"
                    value={formData.studioName}
                    onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Studio Description</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Starting Day Rate (INR)</label>
                    <input
                      type="number"
                      value={formData.startingDayRate}
                      onChange={(e) => setFormData({ ...formData, startingDayRate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Crew Team Size</label>
                    <input
                      type="number"
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Specialties (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    placeholder="Ad Films, Commercials, 3D CGI, Color Grading"
                  />
                </div>
              </div>
            )}

            {/* SECURITY & PASSWORD UPDATE SECTION (Optional) */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-600" />
                Change Password (Optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password (8+ chars)</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Form Action Controls */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-gemini-sm shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* VIEW PROFILE DETAILS */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Core Contact & Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-gemini-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Account Information
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>

                {user.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    {roleProfile?.location?.city || 'Mumbai'}, {roleProfile?.location?.country || 'India'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{roleTitle}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200/70 p-6 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Actions</h4>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                Edit Profile Fields
              </button>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4 text-slate-500" />
                Manage Profile Photo
              </button>
            </div>
          </div>

          {/* Right Column: Role Specific Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-gemini-sm space-y-6">
              {/* Creator View */}
              {isCreator && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 mb-1">
                      {roleProfile?.headline || 'Creative Talent'}
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {roleProfile?.bio || 'No short bio provided.'}
                    </p>
                  </div>

                  {roleProfile?.about && (
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">About</h3>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {roleProfile.about}
                      </p>
                    </div>
                  )}

                  {/* Creator Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Starting Rate</div>
                      <div className="text-sm font-extrabold text-indigo-600 mt-0.5">
                        {formatCurrency(roleProfile?.startingPrice || 5000, roleProfile?.currency || 'INR')}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Experience</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {roleProfile?.experienceYears || 1} Years ({roleProfile?.experienceLevel || 'MID'})
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Work Mode</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {roleProfile?.serviceMode || 'Hybrid'}
                      </div>
                    </div>
                  </div>

                  {/* Skills Chips */}
                  {roleProfile?.skills && roleProfile.skills.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                        Skills & Specialties
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {roleProfile.skills.map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Brand View */}
              {isBrand && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 mb-1">
                      {roleProfile?.companyName || user.fullName}
                    </h2>
                    <p className="text-xs text-indigo-600 font-semibold mb-2">
                      {roleProfile?.tagline || 'Leading Brand & Advertiser'}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {roleProfile?.description || 'No company overview provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Industry</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {roleProfile?.industry || 'Consumer Goods'}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Company Size</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {roleProfile?.companySize || '11-50 employees'}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Founded</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {roleProfile?.foundedYear || 2022}
                      </div>
                    </div>
                  </div>

                  {roleProfile?.websiteUrl && (
                    <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                      <a
                        href={roleProfile.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        {roleProfile.websiteUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Production Studio View */}
              {isProduction && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 mb-1">
                      {roleProfile?.studioName || user.fullName}
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {roleProfile?.description || 'Full-service production house.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Starting Day Rate</div>
                      <div className="text-sm font-extrabold text-indigo-600 mt-0.5">
                        {formatCurrency(roleProfile?.startingDayRate || 25000, 'INR')}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Crew Team Size</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {roleProfile?.teamSize || 5} Members
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin View */}
              {isAdmin && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="text-xs font-bold text-slate-900">Administrator Authority Details</div>
                    <p className="text-xs text-slate-500">
                      You are signed in as an administrative operator with access to platform audit logs, moderation
                      queues, and backoffice configuration controls.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Photo Upload Modal */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-gemini-lg p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                Manage Profile Photo
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPhotoModalOpen(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setPhotoError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {photoError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">
                {photoError}
              </div>
            )}

            {/* Photo Preview or Current Avatar */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-900 border-4 border-slate-100 shadow-gemini-sm flex items-center justify-center text-white text-3xl font-bold">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span>{(user.fullName || user.username || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                {previewUrl ? 'Photo preview selected' : 'Current profile photo'}
              </span>
            </div>

            {/* File Input */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-indigo-600" />
                {selectedFile ? selectedFile.name : 'Choose Image (JPEG, PNG, WebP — Max 5MB)'}
              </button>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoModalOpen(false);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleUploadPhoto}
                  disabled={!selectedFile || uploadingPhoto}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadingPhoto ? 'Uploading...' : 'Save Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-16 text-center text-xs text-slate-400 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        </div>
      }
    >
      <MyProfileContent />
    </Suspense>
  );
}

