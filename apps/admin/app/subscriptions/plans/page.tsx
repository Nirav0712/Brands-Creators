'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Coins,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Search,
  Check,
  X,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/utils';
import { ISubscriptionPlan, SubscriptionPlanDuration, UserRole } from '@brands-creators/types';

export default function AdminSubscriptionPlansPage() {
  const [plans, setPlans] = useState<ISubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ISubscriptionPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    price: 0,
    duration: SubscriptionPlanDuration.MONTHLY,
    durationDays: 30,
    includedTokens: 10,
    entitlements: '',
    allowedRoles: [UserRole.CREATOR, UserRole.BRAND, UserRole.PRODUCTION_TEAM],
    isFree: true,
    isActive: true,
  });

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/subscriptions/admin/plans');
      const data = res?.data || res;
      if (Array.isArray(data)) setPlans(data);
    } catch (err: any) {
      console.error('Failed to load admin plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      duration: SubscriptionPlanDuration.MONTHLY,
      durationDays: 30,
      includedTokens: 10,
      entitlements: 'Marketplace Access, Project Collaboration, In-App Chat',
      allowedRoles: [UserRole.CREATOR, UserRole.BRAND, UserRole.PRODUCTION_TEAM],
      isFree: true,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (plan: ISubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      duration: plan.duration,
      durationDays: plan.durationDays,
      includedTokens: plan.includedTokens,
      entitlements: plan.entitlements ? plan.entitlements.join(', ') : '',
      allowedRoles: plan.allowedRoles || [UserRole.CREATOR, UserRole.BRAND],
      isFree: plan.isFree,
      isActive: plan.isActive,
    });
    setModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const entitlementsArray = formData.entitlements
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price) || 0,
        duration: formData.duration,
        durationDays: Number(formData.durationDays) || 30,
        includedTokens: Number(formData.includedTokens) || 0,
        entitlements: entitlementsArray,
        allowedRoles: formData.allowedRoles,
        isFree: Number(formData.price) === 0 || Boolean(formData.isFree),
        isActive: Boolean(formData.isActive),
      };

      if (editingPlan) {
        await apiClient.patch(`/subscriptions/admin/plans/${editingPlan._id}`, payload);
        setFeedback(`Plan '${payload.name}' updated successfully.`);
      } else {
        await apiClient.post('/subscriptions/admin/plans', payload);
        setFeedback(`Plan '${payload.name}' created successfully.`);
      }

      setModalOpen(false);
      await loadPlans();
    } catch (err: any) {
      alert(err?.message || 'Failed to save subscription plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (planId: string) => {
    try {
      await apiClient.patch(`/subscriptions/admin/plans/${planId}/toggle`);
      await loadPlans();
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle plan status.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            Subscription Plans Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure platform plans, pricing tiers, token allowances, and account entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Refresh plans"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Create Plan
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Plans Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-gemini-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading subscription plans...</div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">No subscription plans found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Plan Name</th>
                  <th className="py-3 px-4">Price (INR)</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Tokens Included</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {plans.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                      <div className="text-[11px] text-slate-400 max-w-xs truncate">{p.description}</div>
                    </td>
                    <td className="py-4 px-4 font-black text-slate-900">
                      {p.price === 0 ? (
                        <span className="text-emerald-600 font-bold">Free (₹0)</span>
                      ) : (
                        formatCurrency(p.price)
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-[11px] text-slate-700">
                        {p.duration} ({p.durationDays}d)
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-amber-600 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{p.includedTokens}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                        title="Edit Plan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(p._id)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold ${
                          p.isActive
                            ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={p.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {p.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Plan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-gemini-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Creator Pro Tier"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of plan benefits for public pricing cards"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: e.target.value,
                        isFree: Number(e.target.value) === 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Included Tokens</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.includedTokens}
                    onChange={(e) => setFormData({ ...formData, includedTokens: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration Cycle</label>
                  <select
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: e.target.value,
                        durationDays:
                          e.target.value === 'MONTHLY'
                            ? 30
                            : e.target.value === 'YEARLY'
                            ? 365
                            : e.target.value === 'LIFETIME'
                            ? 3650
                            : formData.durationDays,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="LIFETIME">Lifetime</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration Days</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Entitlements (Comma-separated checklist)
                </label>
                <input
                  type="text"
                  value={formData.entitlements}
                  onChange={(e) => setFormData({ ...formData, entitlements: e.target.value })}
                  placeholder="Priority search, 100 Tokens, Verified checkmark"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Publish as Active Plan</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

