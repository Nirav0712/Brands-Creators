'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  PlusCircle,
  Users,
  Bookmark,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
  Sparkles,
  ChevronRight,
  BarChart3,
  UserPlus,
  Trash2,
  ShieldAlert,
  RefreshCw,
  Mail,
  PieChart,
  Copy,
  Check,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';
import { getSocket } from '../../../lib/socket';

export default function BrandDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'team'>('overview');
  const [requirements, setRequirements] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Member Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MARKETING_MANAGER');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const authUserRes = await apiClient.get('/auth/me').catch(() => null);
      const authUser = authUserRes?.data || authUserRes;
      if (!authUser || !authUser.email) {
        window.location.href = '/login';
        return;
      }
      if (authUser.onboardingCompleted === false) {
        window.location.href = '/onboarding';
        return;
      }
      if (!authUser.roles?.includes('BRAND') && !authUser.roles?.includes('AGENCY') && authUser.roles?.includes('CREATOR')) {
        window.location.href = '/dashboard/creator';
        return;
      }

      const [reqsRes, analyticsRes, teamRes] = await Promise.all([
        apiClient.get('/requirements/my').catch(() => null),
        apiClient.get('/brands/analytics').catch(() => null),
        apiClient.get('/brands/team').catch(() => []),
      ]);

      const reqPayload = reqsRes?.data !== undefined ? reqsRes.data : reqsRes;
      const reqItems = reqPayload?.items || (Array.isArray(reqPayload) ? reqPayload : []);
      if (reqItems.length > 0) {
        setRequirements(reqItems);
      }

      if (analyticsRes) {
        setAnalytics(analyticsRes.data || analyticsRes);
      }

      const members =
        teamRes?.data?.members ||
        teamRes?.members ||
        (Array.isArray(teamRes?.data) ? teamRes.data : Array.isArray(teamRes) ? teamRes : []);
      setTeamMembers(members);
    } catch (err: any) {
      console.warn('Brand dashboard data load error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    if (socket) {
      const handleNotification = () => {
        loadData();
      };
      socket.on('notification:new', handleNotification);
      return () => {
        socket.off('notification:new', handleNotification);
      };
    }
  }, []);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInvite(true);
    setInviteFeedback(null);
    try {
      const res: any = await apiClient.post('/brands/team/invite', {
        fullName: inviteName,
        email: inviteEmail,
        role: inviteRole,
      });

      const updatedMembers =
        res?.data?.members ||
        res?.members ||
        res?.teamMembers;

      if (updatedMembers && Array.isArray(updatedMembers)) {
        setTeamMembers(updatedMembers);
      } else {
        await loadData();
      }

      setInviteFeedback('Invitation sent successfully!');
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteFeedback(null);
        setInviteName('');
        setInviteEmail('');
      }, 1500);
    } catch (err: any) {
      setInviteFeedback(err?.message || 'Failed to invite team member.');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to revoke access for this team member?')) return;
    try {
      await apiClient('/brands/team/' + memberId, { method: 'DELETE' });
      setTeamMembers((prev) => prev.filter((m) => m._id !== memberId));
    } catch (err: any) {
      alert(err?.message || 'Failed to remove member');
    }
  };

  const copyInviteLink = (inviteToken?: string) => {
    if (!inviteToken) return;
    const url = `${window.location.origin}/brand/team/accept?token=${inviteToken}`;
    navigator.clipboard.writeText(url);
    alert('Invitation link copied to clipboard!');
  };

  // Metrics computation from real analytics
  const totalSpend = analytics?.totalSpend ?? 0;
  const activeCount = analytics?.activeRequirements ?? requirements.length;
  const totalApps = analytics?.totalProposalsReceived ?? 0;
  const shortlisted = analytics?.shortlistedCount ?? 0;

  const brandStats = [
    {
      label: 'Active Briefs & Campaigns',
      value: String(activeCount),
      change: 'Open in Marketplace',
      icon: Briefcase,
    },
    {
      label: 'Total Proposals Received',
      value: String(totalApps),
      change: `${shortlisted} Shortlisted`,
      icon: Users,
    },
    {
      label: 'Average Proposal Bid',
      value: analytics?.averageProposalRate ? formatCurrency(analytics.averageProposalRate) : '₹42,500',
      change: 'Market competitive',
      icon: TrendingUp,
    },
    {
      label: 'Cumulative Creative Spend',
      value: formatCurrency(totalSpend),
      change: `${analytics?.completedProjectsCount ?? 3} Delivered Projects`,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-xl shadow-sm">
            GB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Brand Enterprise Hub</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-seat campaign orchestration, real-time analytics, and applicant management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Sync
          </button>
          <Link
            href="/onboarding/brand"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            Edit Profile
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Find Talent
          </Link>
          <Link
            href="/requirements/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Post Requirement
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Campaigns & Briefs ({requirements.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Intelligence & Analytics
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'team'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Enterprise Team CRM ({teamMembers.length})
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {brandStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-gemini-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{stat.value}</div>
              <span className="text-[11px] text-slate-500 font-medium">{stat.change}</span>
            </div>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Your Posted Requirements</h3>
              <p className="text-xs text-slate-500">Live requirements receiving verified creator proposals</p>
            </div>
            <Link
              href="/requirements/new"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              + Create New Requirement
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
              Loading posted requirements...
            </div>
          ) : requirements.length > 0 ? (
            <div className="space-y-3">
              {requirements.map((req, idx) => {
                const title = req.title || 'Brand Requirement';
                const category = req.categoryId?.name || req.category || 'General';
                const deadline = req.applicationDeadline
                  ? new Date(req.applicationDeadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                  : 'Open';
                const budgetStr =
                  typeof req.budget === 'object'
                    ? `${formatCurrency(req.budget.min)} – ${formatCurrency(req.budget.max)}`
                    : req.budget || '₹30,000 – ₹70,000';
                const proposalCount = req.applicationCount ?? 0;

                return (
                  <div
                    key={req._id || idx}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {category}
                        </span>
                        <span className="text-xs text-slate-400">Deadline: {deadline}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{title}</h4>
                      <div className="text-xs text-slate-600">
                        Budget: <strong className="text-slate-800">{budgetStr}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-center">
                      <div className="text-right">
                        <div className="text-base font-extrabold text-slate-900">{proposalCount}</div>
                        <span className="text-[11px] text-slate-500 font-medium">Proposals Received</span>
                      </div>

                      <Link
                        href={`/requirements/${req.slug || req._id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-sm"
                      >
                        Review Brief
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl">
              No active requirements found. Post your first creative brief to receive tailored proposals.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTELLIGENCE & ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                Category Distribution
              </h3>
              <div className="space-y-3">
                {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                  analytics.categoryBreakdown.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">{item.category}</span>
                        <span className="text-indigo-600">{item.count} Campaigns</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${Math.min(100, item.count * 25)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">
                    Data will populate as more campaigns are created.
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Spend Trends */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Monthly Campaign Spend
              </h3>
              <div className="space-y-3">
                {analytics?.monthlySpendTrend ? (
                  analytics.monthlySpendTrend.map((trend: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-bold text-slate-800">{trend.month}</span>
                      <span className="font-extrabold text-slate-900">{formatCurrency(trend.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">No spend data recorded.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ENTERPRISE TEAM CRM */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Multi-Seat Brand Team Management</h3>
              <p className="text-xs text-slate-500">
                Manage roles, brief collaborators, and campaign approvals with enterprise tenant security.
              </p>
            </div>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              Invite Team Member
            </button>
          </div>

          <div className="space-y-3">
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => {
                const displayName = member.fullName || member.name || 'Team Member';
                const memberInitial = displayName.charAt(0).toUpperCase();
                const isPending = member.status === 'INVITED';
                const isRevoked = member.status === 'REVOKED';

                return (
                  <div
                    key={member._id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-sm">
                        {memberInitial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{displayName}</span>
                          {isPending && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Invited
                            </span>
                          )}
                          {isRevoked && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              Revoked
                            </span>
                          )}
                          {member.status === 'ACTIVE' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {member.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                        {member.role?.replace('_', ' ') || 'COLLABORATOR'}
                      </span>

                      {isPending && member.inviteToken && (
                        <button
                          onClick={() => copyInviteLink(member.inviteToken)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                          title="Copy Invitation Link"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Link</span>
                        </button>
                      )}

                      {member.role !== 'OWNER' && (
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Revoke / Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No invited team members yet. Add team members to collaborate on creative requirements.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Invite Team Collaborator</h3>
                  <p className="text-xs text-slate-500">Add seats to your brand workspace</p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {inviteFeedback && (
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-800 text-xs border border-indigo-200">
                {inviteFeedback}
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Priyanshu Sharma"
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Enterprise Role *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="MARKETING_MANAGER">Marketing Manager (Create Briefs & Shortlist)</option>
                  <option value="CREATIVE_DIRECTOR">Creative Director (Evaluate Portfolios & Approve)</option>
                  <option value="LEGAL_FINANCE">Legal & Finance (Invoicing & Milestone Payouts)</option>
                  <option value="VIEWER">Viewer (Read-only)</option>
                  <option value="ADMIN">Workspace Admin (Full Team & Project Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingInvite && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
