'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Calendar,
  IndianRupee,
  Layers,
  CheckSquare,
  FolderArchive,
  History,
  Send,
  Plus,
  RotateCcw,
  Check,
  X,
  Upload,
  User,
  ShieldCheck,
  Building,
  Eye,
  Download,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  XCircle,
  Star,
  CreditCard,
  Wallet,
  Percent,
  ThumbsUp,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  IProject,
  IMilestone,
  IDeliverable,
  IProjectTask,
  IProjectFile,
  IProjectActivity,
  ProjectStatus,
  MilestoneStatus,
  DeliverableStatus,
  TaskStatus,
  TaskPriority,
  DeliverableType,
  PaymentStatus,
  IPayment,
  IProjectReview,
} from '@brands-creators/types';

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.id as string) || '';

  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'MILESTONES' | 'DELIVERABLES' | 'TASKS' | 'FILES' | 'ACTIVITY' | 'PAYMENTS' | 'REVIEWS'
  >('OVERVIEW');

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  // Modals state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  const [submissionFiles, setSubmissionFiles] = useState<{ fileName: string; url: string }[]>([
    { fileName: '', url: '' },
  ]);
  const [submissionLinks, setSubmissionLinks] = useState<string>('');
  const [submissionNotes, setSubmissionNotes] = useState('');

  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');

  const [createDeliverableOpen, setCreateDeliverableOpen] = useState(false);
  const [newDeliverableTitle, setNewDeliverableTitle] = useState('');
  const [newDeliverableType, setNewDeliverableType] = useState<DeliverableType>(DeliverableType.VIDEO);
  const [newDeliverableMilestone, setNewDeliverableMilestone] = useState('');

  const [createMilestoneOpen, setCreateMilestoneOpen] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);

  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');

  // Phase 06 Commerce & Reviews states
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [reviews, setReviews] = useState<IProjectReview[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewCriteria, setReviewCriteria] = useState({
    quality: 5,
    communication: 5,
    timeliness: 5,
    professionalism: 5,
    value: 5,
  });
  const [reviewLoading, setReviewLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProjectData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projRes, payRes, revRes] = await Promise.all([
        apiClient(`/projects/${projectId}`),
        apiClient(`/payments?projectId=${projectId}`).catch(() => ({ data: { items: [] } })),
        apiClient(`/projects/${projectId}/reviews`).catch(() => ({ data: [] })),
      ]);

      if (projRes?.data) {
        setProject(projRes.data);
      } else {
        setError('Project workspace not found');
      }

      const pItems = payRes.data?.data?.items || payRes.data?.items || payRes.data || [];
      setPayments(Array.isArray(pItems) ? pItems : []);

      const rItems = revRes.data?.data || revRes.data || [];
      setReviews(Array.isArray(rItems) ? rItems : []);
    } catch (err: any) {
      setError(err?.message || 'Could not load project workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bc_user');
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch (e) {}

    fetchProjectData();
  }, [projectId]);

  const isBrand = project?.brandId?._id === currentUser?._id || project?.brandId === currentUser?._id;
  const isProfessional = project?.professionalId?._id === currentUser?._id || project?.professionalId === currentUser?._id;
  const isPaid = payments.some((p) => p.status === PaymentStatus.PAID);

  // Handle Payment Initiation
  const handleInitiatePayment = async () => {
    setPaymentLoading(true);
    try {
      const orderRes = await apiClient(`/payments/projects/${project._id}/order`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const orderData = orderRes.data?.data || orderRes.data;
      setPaymentOrder(orderData);
      setPaymentModalOpen(true);
    } catch (err: any) {
      showToast(err?.message || 'Failed to initiate payment order', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle Payment Verification Confirmation
  const handleConfirmPayment = async () => {
    if (!paymentOrder) return;
    setPaymentLoading(true);
    try {
      const fakePaymentId = `pay_${Date.now().toString(36)}`;
      const fakeSignature = `sig_${Date.now().toString(36)}`;

      await apiClient('/payments/razorpay/verify', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: paymentOrder.paymentId,
          razorpay_order_id: paymentOrder.providerOrderId,
          razorpay_payment_id: fakePaymentId,
          razorpay_signature: fakeSignature,
        }),
      });

      showToast('Payment confirmed and captured successfully!');
      setPaymentModalOpen(false);
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Payment verification failed', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      showToast('Please provide a comment for your review', 'error');
      return;
    }

    setReviewLoading(true);
    try {
      await apiClient(`/projects/${project._id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
          criteria: reviewCriteria,
        }),
      });

      showToast('Verified review submitted successfully!');
      setReviewModalOpen(false);
      setReviewTitle('');
      setReviewComment('');
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit review', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle Deliverable Submission
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliverable) return;

    try {
      const validFiles = submissionFiles.filter((f) => f.fileName && f.url);
      const validLinks = submissionLinks
        ? submissionLinks.split('\n').map((l) => l.trim()).filter(Boolean)
        : [];

      await apiClient(`/deliverables/${selectedDeliverable._id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          files: validFiles,
          links: validLinks,
          notes: submissionNotes,
        }),
      });

      showToast('Deliverable submitted successfully for Brand review!');
      setSubmitModalOpen(false);
      setSubmissionNotes('');
      setSubmissionFiles([{ fileName: '', url: '' }]);
      setSubmissionLinks('');
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit deliverable', 'error');
    }
  };

  // Handle Deliverable Revision Request
  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliverable || !revisionFeedback.trim()) return;

    try {
      await apiClient(`/deliverables/${selectedDeliverable._id}/revision`, {
        method: 'POST',
        body: JSON.stringify({ feedback: revisionFeedback }),
      });

      showToast('Revision request sent to creator.');
      setRevisionModalOpen(false);
      setRevisionFeedback('');
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to request revision', 'error');
    }
  };

  // Handle Deliverable Approval
  const handleApproveDeliverable = async (deliverableId: string) => {
    try {
      await apiClient(`/deliverables/${deliverableId}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      showToast('Deliverable approved!');
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to approve deliverable', 'error');
    }
  };

  // Handle Deliverable Creation
  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeliverableTitle.trim()) return;

    try {
      await apiClient(`/projects/${project._id}/deliverables`, {
        method: 'POST',
        body: JSON.stringify({
          title: newDeliverableTitle,
          type: newDeliverableType,
          milestoneId: newDeliverableMilestone || undefined,
        }),
      });

      showToast('New deliverable added to workspace.');
      setCreateDeliverableOpen(false);
      setNewDeliverableTitle('');
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create deliverable', 'error');
    }
  };

  // Handle Milestone Creation
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    try {
      await apiClient(`/projects/${project._id}/milestones`, {
        method: 'POST',
        body: JSON.stringify({
          title: newMilestoneTitle,
          description: newMilestoneDesc,
          dueDate: newMilestoneDate || undefined,
        }),
      });

      showToast('Milestone created.');
      setCreateMilestoneOpen(false);
      setNewMilestoneTitle('');
      setNewMilestoneDesc('');
      setNewMilestoneDate('');
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create milestone', 'error');
    }
  };

  // Handle Milestone Status Change
  const handleUpdateMilestoneStatus = async (milestoneId: string, status: MilestoneStatus) => {
    try {
      await apiClient(`/milestones/${milestoneId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(`Milestone marked as ${status}`);
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update milestone status', 'error');
    }
  };

  // Handle Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await apiClient(`/projects/${project._id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskTitle,
          priority: newTaskPriority,
        }),
      });

      showToast('Task added.');
      setCreateTaskOpen(false);
      setNewTaskTitle('');
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create task', 'error');
    }
  };

  // Handle Task Status Toggle
  const handleToggleTask = async (taskId: string, currentStatus: TaskStatus) => {
    try {
      const nextStatus =
        currentStatus === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
      await apiClient(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update task', 'error');
    }
  };

  // Handle Project Status Update
  const handleUpdateProjectStatus = async (newStatus: ProjectStatus, reason?: string) => {
    try {
      await apiClient(`/projects/${project._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reason }),
      });
      showToast(`Project status updated to ${newStatus}`);
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update project status', 'error');
    }
  };

  // Handle File Creation
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !newFileUrl.trim()) return;

    try {
      await apiClient(`/projects/${project._id}/files`, {
        method: 'POST',
        body: JSON.stringify({
          fileName: newFileName,
          url: newFileUrl,
        }),
      });
      showToast('File metadata recorded.');
      setCreateFileOpen(false);
      setNewFileName('');
      setNewFileUrl('');
      fetchProjectData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload file', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-500">Loading project workspace...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Workspace Unavailable</h2>
        <p className="text-xs text-slate-500">{error || 'Unable to load project workspace.'}</p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.IN_PROGRESS:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case ProjectStatus.IN_REVIEW:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case ProjectStatus.COMPLETED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case ProjectStatus.ON_HOLD:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case ProjectStatus.CANCELLED:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold text-white animate-in slide-in-from-bottom-5 ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-200" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          {toast.message}
        </div>
      )}

      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/projects" className="font-semibold hover:text-indigo-600 transition-colors">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-mono text-slate-700 font-bold">{project.projectNumber}</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {project.conversationId && (
            <Link
              href={`/inbox?conversationId=${project.conversationId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Project Conversation
            </Link>
          )}

          {project.status === ProjectStatus.CONFIRMED && (
            <button
              onClick={() => handleUpdateProjectStatus(ProjectStatus.IN_PROGRESS)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
            >
              <PlayCircle className="w-4 h-4" /> Start Project
            </button>
          )}

          {isBrand && project.status === ProjectStatus.IN_REVIEW && (
            <button
              onClick={() => handleUpdateProjectStatus(ProjectStatus.COMPLETED)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
            >
              <Check className="w-4 h-4" /> Complete Project
            </button>
          )}
        </div>
      </div>

      {/* Main Project Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {project.projectNumber}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-md border ${getStatusBadge(
                  project.status,
                )}`}
              >
                {project.status.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {project.title}
            </h1>

            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Budget & Progress Overview */}
          <div className="flex items-center gap-6 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/70 shrink-0">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Approved Budget</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {formatCurrency(project.approvedBudget)}
              </div>
            </div>

            <div className="w-px h-10 bg-slate-200" />

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Project Progress</span>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">
                {project.progress || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${project.progress || 0}%` }}
            />
          </div>
        </div>

        {/* Participant Strip & Timeline */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Brand Client</div>
              <div className="font-bold text-slate-800 truncate">
                {project.brandId?.fullName || 'Brand Client'}
              </div>
            </div>
          </div>

          {/* Professional */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Professional</div>
              <div className="font-bold text-slate-800 truncate">
                {project.professionalId?.fullName || 'Creative Partner'}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Start Date</div>
              <div className="font-bold text-slate-800">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Immediate'}
              </div>
            </div>
          </div>

          {/* Context Links */}
          <div className="flex items-center justify-start lg:justify-end gap-3">
            {project.requirementId?.slug && (
              <Link
                href={`/requirements/${project.requirementId.slug}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                Requirement Brief <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: Layers },
          { id: 'MILESTONES', label: `Milestones (${project.milestones?.length || 0})`, icon: Clock },
          { id: 'DELIVERABLES', label: `Deliverables (${project.deliverables?.length || 0})`, icon: FileText },
          { id: 'TASKS', label: `Tasks (${project.tasks?.length || 0})`, icon: CheckSquare },
          { id: 'FILES', label: `Files (${project.files?.length || 0})`, icon: FolderArchive },
          { id: 'PAYMENTS', label: `Payments (${payments.length})`, icon: IndianRupee },
          { id: 'REVIEWS', label: `Reviews (${reviews.length})`, icon: Star },
          { id: 'ACTIVITY', label: 'Activity Log', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Actionable Next Step Banner */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Current Milestone Focus
              </div>
              <h3 className="text-xl font-bold">
                {project.milestones?.[0]?.title || 'Submit Initial Project Deliverables'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {project.milestones?.[0]?.description ||
                  'Upload campaign files, video drafts, and high-res media for brand review and feedback.'}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('DELIVERABLES')}
                  className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-extrabold shadow-sm transition-all"
                >
                  Manage Deliverables
                </button>
                <button
                  onClick={() => setActiveTab('MILESTONES')}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
                >
                  View Milestones
                </button>
              </div>
            </div>

            {/* Deliverables Preview */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/85 space-y-4 shadow-gemini-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Deliverables Pipeline</h3>
                <button
                  onClick={() => setActiveTab('DELIVERABLES')}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  View All
                </button>
              </div>

              {project.deliverables?.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No deliverables added yet. Click Deliverables tab to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {project.deliverables?.slice(0, 3).map((d: any) => (
                    <div
                      key={d._id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{d.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Version {d.submissionVersion || 0} • {d.type}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700">
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/85 space-y-4 shadow-gemini-sm">
              <h3 className="text-sm font-bold text-slate-900">Project Metadata</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Project Ref</span>
                  <span className="font-mono font-bold text-slate-900">{project.projectNumber}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-slate-900">{project.status}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Total Milestones</span>
                  <span className="font-bold text-slate-900">{project.milestones?.length || 0}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Total Tasks</span>
                  <span className="font-bold text-slate-900">{project.tasks?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/85 space-y-3 shadow-gemini-sm text-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Quick Workspace Actions</h3>
              <button
                onClick={() => setCreateDeliverableOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-between transition-colors"
              >
                <span>Add Deliverable</span> <Plus className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => setCreateMilestoneOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-between transition-colors"
              >
                <span>Add Milestone</span> <Plus className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => setCreateTaskOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-between transition-colors"
              >
                <span>Add Task</span> <Plus className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: MILESTONES */}
      {activeTab === 'MILESTONES' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Project Milestones</h2>
            <button
              onClick={() => setCreateMilestoneOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Milestone
            </button>
          </div>

          {project.milestones?.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/85 text-xs text-slate-400 space-y-3">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p>No milestones created yet. Add your first milestone above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {project.milestones?.map((m: IMilestone) => (
                <div
                  key={m._id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/85 shadow-gemini-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                        #{m.order}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{m.title}</h4>
                        {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {m.status}
                      </span>

                      {m.status !== MilestoneStatus.COMPLETED && (
                        <button
                          onClick={() => handleUpdateMilestoneStatus(m._id, MilestoneStatus.COMPLETED)}
                          className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition-colors"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: DELIVERABLES */}
      {activeTab === 'DELIVERABLES' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Deliverables & Reviews</h2>
            <button
              onClick={() => setCreateDeliverableOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Deliverable
            </button>
          </div>

          {project.deliverables?.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/85 text-xs text-slate-400 space-y-3">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p>No deliverables registered yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {project.deliverables?.map((d: any) => (
                <div
                  key={d._id}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/85 shadow-gemini-sm space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {d.type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Version {d.submissionVersion || 0}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{d.title}</h4>
                      {d.description && <p className="text-xs text-slate-500 mt-1">{d.description}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                          d.status === DeliverableStatus.APPROVED
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : d.status === DeliverableStatus.REVISION_REQUIRED
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : d.status === DeliverableStatus.SUBMITTED
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {d.status}
                      </span>

                      {/* Action buttons based on status & role */}
                      {d.status !== DeliverableStatus.APPROVED && (
                        <button
                          onClick={() => {
                            setSelectedDeliverable(d);
                            setSubmitModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                        >
                          Submit Version
                        </button>
                      )}

                      {isBrand && d.status === DeliverableStatus.SUBMITTED && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedDeliverable(d);
                              setRevisionModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all"
                          >
                            Request Revision
                          </button>
                          <button
                            onClick={() => handleApproveDeliverable(d._id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                          >
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Feedback Banner if revision required */}
                  {d.feedback && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Revision Feedback from Brand:
                      </div>
                      <p className="text-amber-800 leading-relaxed">{d.feedback}</p>
                    </div>
                  )}

                  {/* Attached files preview */}
                  {d.files && d.files.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Uploaded Files:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {d.files.map((file: any, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs font-semibold text-slate-700 transition-colors"
                          >
                            <span className="truncate">{file.fileName || 'Download Asset'}</span>
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: TASKS */}
      {activeTab === 'TASKS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Project Tasks</h2>
            <button
              onClick={() => setCreateTaskOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          {project.tasks?.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/85 text-xs text-slate-400 space-y-3">
              <CheckSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p>No tasks created yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/85 shadow-gemini-sm divide-y divide-slate-100">
              {project.tasks?.map((task: IProjectTask) => {
                const isCompleted = task.status === TaskStatus.COMPLETED;
                return (
                  <div
                    key={task._id}
                    className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleTask(task._id, task.status)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-indigo-600'
                        }`}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <span
                        className={`text-xs font-semibold ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: FILES */}
      {activeTab === 'FILES' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Project Files Repository</h2>
            <button
              onClick={() => setCreateFileOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
            >
              <Upload className="w-4 h-4" /> Add File Link
            </button>
          </div>

          {project.files?.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/85 text-xs text-slate-400 space-y-3">
              <FolderArchive className="w-8 h-8 mx-auto text-slate-300" />
              <p>No project files uploaded yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/85 shadow-gemini-sm divide-y divide-slate-100">
              {project.files?.map((f: IProjectFile) => (
                <div
                  key={f._id}
                  className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-800 truncate">{f.fileName}</span>
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Open Asset <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: ACTIVITY */}
      {activeTab === 'ACTIVITY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900">Workspace Activity Audit Trail</h2>

          {project.activity?.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No activity recorded yet.</div>
          ) : (
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-6">
              {project.activity?.map((act: any) => (
                <div key={act._id} className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-sm" />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">{act.description}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(act.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: PAYMENTS */}
      {activeTab === 'PAYMENTS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Commercial Terms</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Project Budget & Settlement</h3>
              <p className="text-xs text-slate-500 mt-1">
                Approved project budget is protected. Payouts are held securely until project completion.
              </p>
            </div>
            {isBrand && !isPaid && project.status !== ProjectStatus.CANCELLED && (
              <button
                onClick={handleInitiatePayment}
                disabled={paymentLoading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all"
              >
                <CreditCard className="w-4 h-4" /> Deposit Project Payment ({formatCurrency(project.approvedBudget, project.currency || 'INR')})
              </button>
            )}
            {isPaid && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" /> Funds Deposited & Confirmed
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Payment Transactions</h4>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No payment transactions initiated yet for this project workspace.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {payments.map((p) => (
                  <div key={p._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{p.paymentNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === PaymentStatus.PAID
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Provider: <span className="font-semibold text-slate-700">{p.provider}</span> • Paid by:{' '}
                        <span className="font-semibold text-slate-700">{p.brand?.fullName || 'Brand'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatCurrency(p.totalAmount, p.currency || 'INR')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 8: REVIEWS */}
      {activeTab === 'REVIEWS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Reputation & Trust</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Verified Project Reviews</h3>
              <p className="text-xs text-slate-500 mt-1">
                Two-way ratings and verified testimonial feedback from completed project collaboration.
              </p>
            </div>
            {project.status === ProjectStatus.COMPLETED && (
              <button
                onClick={() => setReviewModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
              >
                <Star className="w-4 h-4" /> Leave Verified Review
              </button>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Star className="w-8 h-8 text-amber-300 mx-auto" />
                <p className="text-xs text-slate-500">
                  {project.status === ProjectStatus.COMPLETED
                    ? 'No reviews submitted yet. Leave a verified review above!'
                    : 'Reviews will become available once the project is marked COMPLETED.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((r) => (
                  <div key={r._id} className="p-5 rounded-2xl bg-slate-50/75 border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                          />
                        ))}
                        <span className="ml-1 font-bold text-xs text-slate-900">{r.rating}.0</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" /> Verified Project
                      </span>
                    </div>
                    {r.title && <h5 className="font-bold text-slate-900 text-xs">{r.title}</h5>}
                    <p className="text-xs text-slate-600 leading-relaxed">&ldquo;{r.comment}&rdquo;</p>
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>By {r.reviewer?.fullName || 'Project Participant'}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Make Payment */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Complete Project Payment</h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 space-y-2 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Project Budget:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(paymentOrder?.amount, paymentOrder?.currency || 'INR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Platform Fee (5%):</span>
                  <span className="text-slate-700 font-medium">{formatCurrency(paymentOrder?.platformFee, paymentOrder?.currency || 'INR')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Total Payable:</span>
                  <span className="font-extrabold text-indigo-600 text-sm">{formatCurrency(paymentOrder?.amount, paymentOrder?.currency || 'INR')}</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/75 rounded-xl border border-indigo-100 text-[11px] text-indigo-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" /> Secure Payment Gateway (Razorpay)
                </div>
                <p>Funds are deposited into secure project ledger and held until milestone approval.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={paymentLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  {paymentLoading ? 'Confirming...' : 'Pay & Confirm Deposit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Leave Verified Review */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Submit Verified Review</h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Overall Rating (1 to 5 Stars) *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="font-bold text-sm text-slate-900 ml-2">{reviewRating}.0 Stars</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Review Title</label>
                <input
                  type="text"
                  placeholder="e.g. Exceptional commercial direction & fast turnaround"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Detailed Feedback & Comments *</label>
                <textarea
                  rows={4}
                  placeholder="Share your collaboration experience, quality of deliverables, and communication..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20"
                >
                  {reviewLoading ? 'Publishing...' : 'Publish Verified Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit Deliverable Version */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Submit Deliverable: {selectedDeliverable?.title}
              </h3>
              <button
                onClick={() => setSubmitModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDeliverable} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">File Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Master_UGC_Reel_V1.mp4"
                  value={submissionFiles[0].fileName}
                  onChange={(e) =>
                    setSubmissionFiles([{ ...submissionFiles[0], fileName: e.target.value }])
                  }
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Asset URL / Drive Link</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/... or media URL"
                  value={submissionFiles[0].url}
                  onChange={(e) =>
                    setSubmissionFiles([{ ...submissionFiles[0], url: e.target.value }])
                  }
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Submission Notes for Brand</label>
                <textarea
                  rows={3}
                  placeholder="Describe the draft deliverables, hook choices, or specific timestamps..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm shadow-indigo-600/20"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Request Revision */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Request Revisions: {selectedDeliverable?.title}
              </h3>
              <button
                onClick={() => setRevisionModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestRevision} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Detailed Revision Feedback *</label>
                <textarea
                  rows={4}
                  placeholder="Explain exactly what adjustments are required (e.g. caption timing, logo placement, audio balance)..."
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRevisionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Send Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Deliverable */}
      {createDeliverableOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Add New Deliverable</h3>
            <form onSubmit={handleCreateDeliverable} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Deliverable Title</label>
                <input
                  type="text"
                  placeholder="e.g. 3x Vertical UGC Reels"
                  value={newDeliverableTitle}
                  onChange={(e) => setNewDeliverableTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Asset Type</label>
                <select
                  value={newDeliverableType}
                  onChange={(e) => setNewDeliverableType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                >
                  <option value={DeliverableType.VIDEO}>Video</option>
                  <option value={DeliverableType.IMAGE}>Image / Photo</option>
                  <option value={DeliverableType.DOCUMENT}>Document</option>
                  <option value={DeliverableType.DESIGN}>Design Asset</option>
                  <option value={DeliverableType.LINK}>Link</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateDeliverableOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Create Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Milestone */}
      {createMilestoneOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Add Project Milestone</h3>
            <form onSubmit={handleCreateMilestone} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Milestone Title</label>
                <input
                  type="text"
                  placeholder="e.g. Rough Cut Review"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Description</label>
                <input
                  type="text"
                  placeholder="Scope or expectations..."
                  value={newMilestoneDesc}
                  onChange={(e) => setNewMilestoneDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateMilestoneOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Task */}
      {createTaskOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Add Project Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Send product samples to creator"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateTaskOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add File */}
      {createFileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Add File Link</h3>
            <form onSubmit={handleCreateFile} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">File Name</label>
                <input
                  type="text"
                  placeholder="e.g. Brand_Guidelines_2026.pdf"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">File URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateFileOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
