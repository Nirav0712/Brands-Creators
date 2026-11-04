'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { IProjectReview, IReviewReport, ReviewStatus, ReviewReportStatus } from '@brands-creators/types';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<IProjectReview[]>([]);
  const [reports, setReports] = useState<IReviewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'REVIEWS' | 'REPORTS'>('REVIEWS');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, reportsRes] = await Promise.all([
        apiClient.get<any>('/admin/reviews').catch(() => ({ data: { items: [] } })),
        apiClient.get<any>('/admin/reviews/reports').catch(() => ({ data: [] })),
      ]);

      const rItems = reviewsRes.data?.data?.items || reviewsRes.data?.items || reviewsRes.data || [];
      setReviews(Array.isArray(rItems) ? rItems : []);

      const repItems = reportsRes.data?.data || reportsRes.data || [];
      setReports(Array.isArray(repItems) ? repItems : []);
    } catch (err) {
      console.error('Error fetching admin reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateReviewStatus = async (reviewId: string, status: ReviewStatus) => {
    setActionLoading(reviewId);
    try {
      await apiClient.patch(`/admin/reviews/${reviewId}/status`, { status });
      await fetchData();
    } catch (err) {
      console.error('Error updating review status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveReport = async (reportId: string, status: ReviewReportStatus) => {
    setActionLoading(reportId);
    try {
      await apiClient.patch(`/admin/reviews/reports/${reportId}/resolve`, { status });
      await fetchData();
    } catch (err) {
      console.error('Error resolving report:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reviews & Reputation Moderation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit verified marketplace ratings, feedback authenticity, and dispute reports.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('REVIEWS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'REVIEWS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          All Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'REPORTS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Moderation Reports ({reports.length})
        </button>
      </div>

      {/* Reviews Tab */}
      {activeTab === 'REVIEWS' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['ALL', 'PUBLISHED', 'HIDDEN', 'FLAGGED', 'REMOVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  statusFilter === st ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <p className="text-gray-400 py-8">Loading reviews...</p>
            ) : filteredReviews.length === 0 ? (
              <p className="text-gray-400 py-8">No reviews found.</p>
            ) : (
              filteredReviews.map((r) => (
                <div key={r._id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-sm text-gray-900">{r.rating}.0</span>
                      {r.verifiedProject && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" /> Verified Project
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        r.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : r.status === 'HIDDEN'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  {r.title && <h3 className="font-semibold text-gray-900 text-sm">{r.title}</h3>}
                  <p className="text-gray-700 text-sm leading-relaxed">&ldquo;{r.comment}&rdquo;</p>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div>
                      From <span className="font-medium text-gray-900">{r.reviewer?.fullName || 'Reviewer'}</span> to{' '}
                      <span className="font-medium text-gray-900">{r.reviewee?.fullName || 'Recipient'}</span>
                    </div>
                    <div>{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {r.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => handleUpdateReviewStatus(r._id, ReviewStatus.PUBLISHED)}
                        disabled={actionLoading === r._id}
                        className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                      >
                        Publish / Restore
                      </button>
                    )}
                    {r.status !== 'HIDDEN' && (
                      <button
                        onClick={() => handleUpdateReviewStatus(r._id, ReviewStatus.HIDDEN)}
                        disabled={actionLoading === r._id}
                        className="px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100"
                      >
                        Hide
                      </button>
                    )}
                    {r.status !== 'REMOVED' && (
                      <button
                        onClick={() => handleUpdateReviewStatus(r._id, ReviewStatus.REMOVED)}
                        disabled={actionLoading === r._id}
                        className="px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Reported By</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Explanation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No moderation reports.
                  </td>
                </tr>
              ) : (
                reports.map((rep) => (
                  <tr key={rep._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{rep.reporter?.fullName || 'User'}</td>
                    <td className="py-3 px-4 font-semibold text-rose-600">{rep.reason}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{rep.description || 'No description provided'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">
                        {rep.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">{new Date(rep.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      {rep.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResolveReport(rep._id, ReviewReportStatus.RESOLVED)}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleResolveReport(rep._id, ReviewReportStatus.DISMISSED)}
                            className="px-2.5 py-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
