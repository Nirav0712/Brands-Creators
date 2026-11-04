'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Shield, DollarSign, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

export default function AdminSettingsPage() {
  const [commissionRate, setCommissionRate] = useState(10);
  const [maxProposalsPerDay, setMaxProposalsPerDay] = useState(15);
  const [autoApproveCreators, setAutoApproveCreators] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/settings');
      const items = res?.data !== undefined ? res.data : res;
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          if (item.key === 'PLATFORM_COMMISSION_PERCENTAGE') {
            setCommissionRate(Number(item.value));
          } else if (item.key === 'MAX_PROPOSALS_PER_DAY_CREATOR') {
            setMaxProposalsPerDay(Number(item.value));
          } else if (item.key === 'AUTO_APPROVE_CREATORS') {
            setAutoApproveCreators(Boolean(item.value));
          } else if (item.key === 'MAINTENANCE_MODE') {
            setMaintenanceMode(Boolean(item.value));
          }
        });
      }
    } catch (err) {
      console.warn('Failed to load settings from API, using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        apiClient.put('/settings/PLATFORM_COMMISSION_PERCENTAGE', { value: commissionRate }),
        apiClient.put('/settings/MAX_PROPOSALS_PER_DAY_CREATOR', { value: maxProposalsPerDay }),
        apiClient.put('/settings/AUTO_APPROVE_CREATORS', { value: autoApproveCreators }),
        apiClient.put('/settings/MAINTENANCE_MODE', { value: maintenanceMode }),
      ]);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.warn('Failed to persist settings to API:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Settings className="w-3.5 h-3.5" />
            Runtime SaaS Controls
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Platform Settings & Business Rules
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure marketplace fees, proposal limits, verification policies, and maintenance states.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSettings}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Platform settings successfully saved and propagated across active nodes!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Fee & Monetization */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            Marketplace Monetization & Fees
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Platform Service Fee (%)
              </label>
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                min={0}
                max={50}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Deducted upon milestone payout release.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Daily Proposals (Free Tier)
              </label>
              <input
                type="number"
                value={maxProposalsPerDay}
                onChange={(e) => setMaxProposalsPerDay(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Protects brands from proposal spamming.</span>
            </div>
          </div>
        </div>

        {/* Moderation Policies */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/85 shadow-gemini-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            Trust & Safety Policies
          </h3>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900">Auto-Approve New Creators</div>
              <p className="text-xs text-slate-500 mt-0.5">
                When enabled, new creator profiles are instantly listed in public search without admin verification.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoApproveCreators(!autoApproveCreators)}
              className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                autoApproveCreators ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  autoApproveCreators ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900">Global Maintenance Mode</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Temporarily show maintenance notice to public visitors while preserving admin access.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                maintenanceMode ? 'bg-rose-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Settings...' : 'Save Platform Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
