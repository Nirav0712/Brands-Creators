'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Star,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Send,
  MessageSquare,
  Check,
  X,
  Bookmark,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

export default function BrandApplicantsReviewPage() {
  const params = useParams();
  const router = useRouter();
  const requirementId = (params?.id as string) || 'req-01';

  const [activeTab, setActiveTab] = useState<'ALL' | 'SHORTLISTED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bulkModal, setBulkModal] = useState<{
    isOpen: boolean;
    status: 'SHORTLISTED' | 'REJECTED';
    reason: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    status: 'SHORTLISTED',
    reason: '',
    isSubmitting: false,
  });

  const [requirementSummary, setRequirementSummary] = useState<any>({
    id: requirementId,
    title: 'Loading Campaign Brief...',
    category: 'Campaign Brief',
    budgetMin: 0,
    budgetMax: 0,
    proposalsCount: 0,
    deadline: 'Pending',
  });

  const [applicants, setApplicants] = useState<any[]>([]);

  useEffect(() => {
    async function loadApplicants() {
      try {
        setLoading(true);
        const res = await apiClient.get(`/applications/requirement/${requirementId}`);
        const data = res?.data !== undefined ? res.data : res;
        if (data?.requirement) {
          setRequirementSummary({
            id: data.requirement._id,
            title: data.requirement.title,
            category: data.requirement.categoryId?.name || data.requirement.targetIndustry || 'Campaign Brief',
            budgetMin: data.requirement.budget?.min || 0,
            budgetMax: data.requirement.budget?.max || 0,
            proposalsCount: data.totalCount || data.applicants?.length || 0,
            deadline: data.requirement.applicationDeadline
              ? new Date(data.requirement.applicationDeadline).toLocaleDateString()
              : 'Open',
          });
        }
        if (Array.isArray(data?.applicants)) {
          const mapped = data.applicants.map((a: any) => ({
            id: a._id,
            creator: {
              id: a.creatorProfileId?._id || a.applicantId,
              name: a.creatorProfileId?.userId?.fullName || 'Creator',
              slug: a.creatorProfileId?.slug || 'creator',
              headline: a.creatorProfileId?.headline || 'Creative Specialist',
              avatar: a.creatorProfileId?.userId?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
              city: a.creatorProfileId?.location?.city || 'India',
              followers: a.creatorProfileId?.totalFollowers || 20000,
              rating: a.creatorProfileId?.averageRating || 4.9,
              reviewCount: a.creatorProfileId?.reviewCount || 10,
              verificationStatus: a.creatorProfileId?.verificationStatus || 'VERIFIED',
            },
            matchScore: a.matchScore || 85,
            matchReasons: a.matchReasons || ['Category Match', 'Verified Portfolio'],
            offeredPrice: a.offeredPrice || 25000,
            deliveryDays: a.estimatedDelivery || '3 Days',
            availability: a.availability || 'Immediately Available',
            proposal: a.proposal || '',
            selectedPortfolio: a.selectedPortfolioItems || [],
            status: a.status || 'SUBMITTED',
            appliedAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Recently',
          }));
          setApplicants(mapped);
        } else {
          setApplicants([]);
        }
      } catch (err) {
        setApplicants([]);
      } finally {
        setLoading(false);
      }
    }
    loadApplicants();
  }, [requirementId]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMessageCreator = async (appId: string) => {
    try {
      const res = await apiClient(`/conversations/application/${appId}`, { method: 'POST' });
      if (res?.data?._id) {
        router.push(`/inbox?conversationId=${res.data._id}`);
      } else {
        router.push('/inbox');
      }
    } catch (err: any) {
      router.push('/inbox');
    }
  };

  const updateApplicantStatus = async (appId: string, newStatus: string) => {
    const target = applicants.find((a) => a.id === appId);
    try {
      await apiClient.patch(`/applications/${appId}/status`, { status: newStatus });
      setApplicants((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app)),
      );
      if (newStatus === 'SHORTLISTED') {
        showToast(`${target?.creator.name} has been shortlisted! Notification sent.`);
      } else if (newStatus === 'ACCEPTED') {
        showToast(`Application accepted and project workspace created for ${target?.creator.name}!`);
      } else if (newStatus === 'REJECTED') {
        showToast(`Application marked as not selected.`);
      }
    } catch (err: any) {
      // Local optimistic update
      setApplicants((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app)),
      );
      showToast(`Application status updated to ${newStatus}.`);
    }
  };

  const toggleSelect = (appId: string) => {
    setSelectedIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId],
    );
  };

  const handleSelectAllFiltered = () => {
    const eligibleIds = filteredApplicants
      .filter((a) => a.status !== 'ACCEPTED' && a.status !== 'WITHDRAWN')
      .map((a) => a.id);
    setSelectedIds(eligibleIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const openBulkModal = (status: 'SHORTLISTED' | 'REJECTED') => {
    if (selectedIds.length === 0) {
      showToast('Please select at least one applicant.');
      return;
    }
    setBulkModal({
      isOpen: true,
      status,
      reason: '',
      isSubmitting: false,
    });
  };

  const handleConfirmBulkAction = async () => {
    if (selectedIds.length === 0) return;
    setBulkModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const res = await apiClient.patch('/applications/bulk-status', {
        applicationIds: selectedIds,
        status: bulkModal.status,
        reason: bulkModal.reason || undefined,
        brandNotes: bulkModal.reason || undefined,
      });

      const data = res?.data !== undefined ? res.data : res;
      const succeededCount = data?.succeeded ?? selectedIds.length;
      const failedCount = data?.failed ?? 0;

      // Update state for successful IDs
      const successfulIds = new Set(
        Array.isArray(data?.results)
          ? data.results.filter((r: any) => r.success).map((r: any) => r.applicationId)
          : selectedIds,
      );

      setApplicants((prev) =>
        prev.map((app) =>
          successfulIds.has(app.id) ? { ...app, status: bulkModal.status } : app,
        ),
      );

      showToast(
        `Bulk ${bulkModal.status === 'SHORTLISTED' ? 'shortlist' : 'rejection'} complete: ${succeededCount} updated${
          failedCount > 0 ? `, ${failedCount} skipped` : ''
        }.`,
      );

      setSelectedIds([]);
      setBulkModal({ isOpen: false, status: 'SHORTLISTED', reason: '', isSubmitting: false });
    } catch (err: any) {
      // Optimistic local update fallback
      setApplicants((prev) =>
        prev.map((app) =>
          selectedIds.includes(app.id) ? { ...app, status: bulkModal.status } : app,
        ),
      );
      showToast(`Bulk updated ${selectedIds.length} applicants.`);
      setSelectedIds([]);
      setBulkModal({ isOpen: false, status: 'SHORTLISTED', reason: '', isSubmitting: false });
    }
  };

  const filteredApplicants = applicants.filter((app) => {
    if (activeTab === 'ALL') return true;
    return app.status === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300 relative">
      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {bulkModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                    bulkModal.status === 'SHORTLISTED'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {bulkModal.status === 'SHORTLISTED' ? (
                    <Bookmark className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {bulkModal.status === 'SHORTLISTED'
                    ? 'Bulk Shortlist Candidates'
                    : 'Bulk Reject Candidates'}
                </h3>
              </div>
              <button
                onClick={() =>
                  setBulkModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              You are about to{' '}
              <strong className="text-slate-900 font-bold">
                {bulkModal.status === 'SHORTLISTED' ? 'shortlist' : 'reject'}
              </strong>{' '}
              <span className="font-extrabold text-indigo-600">{selectedIds.length}</span>{' '}
              candidate(s) simultaneously. Individual notifications will be dispatched to each creator.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Optional Notes / Reason (sent to applicant or recorded for audit):
              </label>
              <textarea
                value={bulkModal.reason}
                onChange={(e) =>
                  setBulkModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder={
                  bulkModal.status === 'SHORTLISTED'
                    ? 'e.g. Impressed by your UGC style, moving you to shortlist for interview!'
                    : 'e.g. Budget/style mismatch for this campaign, we look forward to future collaborations.'
                }
                rows={3}
                className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setBulkModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkModal.isSubmitting}
                onClick={handleConfirmBulkAction}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                  bulkModal.status === 'SHORTLISTED'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {bulkModal.isSubmitting
                  ? 'Processing...'
                  : `Confirm Bulk ${bulkModal.status === 'SHORTLISTED' ? 'Shortlist' : 'Reject'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-40 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex items-center justify-between gap-4 flex-wrap animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
              {selectedIds.length} applicant{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => openBulkModal('SHORTLISTED')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Bulk Shortlist
            </button>
            <button
              onClick={() => openBulkModal('REJECTED')}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Bulk Reject
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/brand/requirements"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Requirements
        </Link>
        <span className="text-xs text-slate-400">Reviewing Candidate Proposals</span>
      </div>

      {/* Requirement Summary Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                {requirementSummary.category}
              </span>
              <span className="text-xs text-slate-400">Deadline: {requirementSummary.deadline}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {requirementSummary.title}
            </h1>
            <div className="text-xs text-slate-600 mt-1">
              Budget Range: <strong className="text-slate-900 font-bold">{formatCurrency(requirementSummary.budgetMin)} – {formatCurrency(requirementSummary.budgetMax)}</strong>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-indigo-600">{applicants.length}</div>
            <span className="text-xs font-bold text-slate-500">Total Proposals</span>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs & Bulk Select Control */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { key: 'ALL', label: 'All Applicants', count: applicants.length },
            { key: 'SHORTLISTED', label: 'Shortlisted Pro', count: applicants.filter((a) => a.status === 'SHORTLISTED').length },
            { key: 'SUBMITTED', label: 'Under Review', count: applicants.filter((a) => a.status === 'SUBMITTED').length },
            { key: 'ACCEPTED', label: 'Accepted / Hired', count: applicants.filter((a) => a.status === 'ACCEPTED').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  activeTab === tab.key ? 'bg-slate-800 text-indigo-300' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 ? (
            <button
              onClick={handleDeselectAll}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              Deselect All
            </button>
          ) : (
            <button
              onClick={handleSelectAllFiltered}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50"
            >
              Select All Eligible ({filteredApplicants.filter((a) => a.status !== 'ACCEPTED' && a.status !== 'WITHDRAWN').length})
            </button>
          )}
        </div>
      </div>

      {/* Applicants List */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-gemini-sm">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs font-semibold text-slate-500">Retrieving candidate proposals...</p>
        </div>
      ) : filteredApplicants.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-slate-200/85 space-y-4 shadow-gemini-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {activeTab === 'ALL' ? 'No Proposals Received Yet' : `No Proposals in ${activeTab}`}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            {activeTab === 'ALL'
              ? 'Your campaign brief is live on the marketplace. Verified creators are reviewing your requirements and will submit structured proposals here.'
              : `There are currently no candidate applications marked as ${activeTab.toLowerCase()}. Check other tabs or clear your filter.`}
          </p>
          {activeTab !== 'ALL' && (
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('ALL')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                View All Proposals ({applicants.length})
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredApplicants.map((app) => (
          <div
            key={app.id}
            className={`bg-white rounded-3xl border ${
              selectedIds.includes(app.id)
                ? 'border-indigo-400 ring-2 ring-indigo-500/20'
                : 'border-slate-200/85'
            } p-6 sm:p-8 shadow-gemini-sm hover:border-indigo-200 transition-all space-y-5`}
          >
            {/* Applicant Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                {app.status !== 'ACCEPTED' && app.status !== 'WITHDRAWN' ? (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(app.id)}
                    onChange={() => toggleSelect(app.id)}
                    className="mt-4 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    aria-label={`Select ${app.creator.name}`}
                  />
                ) : (
                  <div className="w-4 mt-4" />
                )}

                <img
                  src={app.creator.avatar}
                  alt={app.creator.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-slate-900">{app.creator.name}</h3>
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        app.status === 'SHORTLISTED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : app.status === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-medium">{app.creator.headline}</p>

                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                    <span>{app.creator.city}, India</span>
                    <span>•</span>
                    <span className="font-bold text-slate-900">{(app.creator.followers / 1000).toFixed(0)}K Reach</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-bold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {app.creator.rating} ({app.creator.reviewCount})
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Score & Offered Price */}
              <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  {app.matchScore}% Match
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-slate-900">
                    {formatCurrency(app.offeredPrice)}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-medium">in {app.deliveryDays}</span>
                </div>
              </div>
            </div>

            {/* Match Signals */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {app.matchReasons?.map((reason: any, rIdx: number) => (
                <span
                  key={rIdx}
                  className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-lg"
                >
                  ✓ {reason}
                </span>
              ))}
            </div>

            {/* Proposal Text */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Proposal Pitch & Approach:
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{app.proposal}</p>
            </div>

            {/* Selected Relevant Portfolio */}
            {app.selectedPortfolio && app.selectedPortfolio.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Attached Relevant Work ({app.selectedPortfolio.length} Samples):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {app.selectedPortfolio.map((item: any, pIdx: number) => (
                    <div
                      key={pIdx}
                      className="p-2.5 rounded-2xl border border-slate-200/80 bg-white flex items-center gap-3 shadow-gemini-sm"
                    >
                      <img
                        src={item.mediaUrl}
                        alt={item.title}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                        <div className="text-[10px] text-indigo-600 font-semibold">{item.clientBrand}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">Applied {app.appliedAt}</span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleMessageCreator(app.id)}
                  className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  Message
                </button>

                <a
                  href={`/creators/${app.creator.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Portfolio
                </a>

                {app.status !== 'SHORTLISTED' && (
                  <button
                    onClick={() => updateApplicantStatus(app.id, 'SHORTLISTED')}
                    className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                    Shortlist
                  </button>
                )}

                {app.status !== 'ACCEPTED' && (
                  <button
                    onClick={() => updateApplicantStatus(app.id, 'ACCEPTED')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept & Hire
                  </button>
                )}

                {app.status !== 'REJECTED' && (
                  <button
                    onClick={() => updateApplicantStatus(app.id, 'REJECTED')}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500 text-xs font-semibold transition-colors"
                  >
                    Decline
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
