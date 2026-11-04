'use client';

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface PaymentSettings {
  upiEnabled: boolean;
  upiId: string;
  upiDisplayName: string;
  qrCodeUrl?: string;
  bankTransferEnabled: boolean;
  bankAccountHolder: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  paymentInstructions: string;
  verificationPolicy: string;
  updatedAt?: string;
}

export default function AdminPaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings>({
    upiEnabled: true,
    upiId: '',
    upiDisplayName: '',
    qrCodeUrl: '',
    bankTransferEnabled: true,
    bankAccountHolder: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    paymentInstructions: '',
    verificationPolicy: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/admin/settings`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (data.data) {
        setSettings(data.data);
      }
    } catch (err: any) {
      setToast({ message: 'Failed to load payment settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/payments/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Payment settings saved successfully!', type: 'success' });
        if (data.data) setSettings(data.data);
      } else {
        setToast({ message: data.message || 'Failed to save settings', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: 'Error saving settings: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading payment settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manual Payment Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure UPI identifiers, dynamic QR codes, and institutional bank transfer credentials for manual subscription & token settlements.
        </p>
      </div>

      {toast && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center justify-between transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* UPI Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">UPI / QR Code Settlement</h2>
              <p className="text-xs text-slate-500 mt-0.5">Instant mobile banking via VPA & BHIM QR standard</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.upiEnabled}
                onChange={(e) => setSettings({ ...settings, upiEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-xs font-medium text-slate-700">
                {settings.upiEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Virtual Payment Address (VPA / UPI ID) *
              </label>
              <input
                type="text"
                required
                value={settings.upiId}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                placeholder="e.g. pay.brandscreators@icici"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Beneficiary Display Name *
              </label>
              <input
                type="text"
                required
                value={settings.upiDisplayName}
                onChange={(e) => setSettings({ ...settings, upiDisplayName: e.target.value })}
                placeholder="e.g. Brands & Creators Media Pvt Ltd"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Static Payment QR Code Image URL
              </label>
              <input
                type="text"
                value={settings.qrCodeUrl || ''}
                onChange={(e) => setSettings({ ...settings, qrCodeUrl: e.target.value })}
                placeholder="/images/payment-qr.png or https://cdn.yoursite.com/qr.png"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Transfer Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Direct Bank Transfer (NEFT / RTGS / IMPS)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Corporate institutional escrow and current account transfer details</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.bankTransferEnabled}
                onChange={(e) => setSettings({ ...settings, bankTransferEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-xs font-medium text-slate-700">
                {settings.bankTransferEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Holder Name *
              </label>
              <input
                type="text"
                required
                value={settings.bankAccountHolder}
                onChange={(e) => setSettings({ ...settings, bankAccountHolder: e.target.value })}
                placeholder="e.g. Brands & Creators Media Pvt Ltd"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                required
                value={settings.bankName}
                onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                placeholder="e.g. HDFC Bank"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Number *
              </label>
              <input
                type="text"
                required
                value={settings.accountNumber}
                onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                placeholder="e.g. 50200098765432"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IFSC Code *
              </label>
              <input
                type="text"
                required
                value={settings.ifscCode}
                onChange={(e) => setSettings({ ...settings, ifscCode: e.target.value.toUpperCase() })}
                placeholder="e.g. HDFC0001234"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch Location & Address
              </label>
              <input
                type="text"
                value={settings.branchName || ''}
                onChange={(e) => setSettings({ ...settings, branchName: e.target.value })}
                placeholder="e.g. Indiranagar 100ft Road Branch, Bengaluru, Karnataka"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Instructions & Policy */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 pb-3 border-b border-slate-100">
            User-Facing Guidelines & Verification Policy
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Instructions (Shown on Checkout Modal)
            </label>
            <textarea
              rows={3}
              value={settings.paymentInstructions}
              onChange={(e) => setSettings({ ...settings, paymentInstructions: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit & Anti-Fraud Verification Policy
            </label>
            <textarea
              rows={2}
              value={settings.verificationPolicy}
              onChange={(e) => setSettings({ ...settings, verificationPolicy: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-all shadow-sm"
          >
            {saving ? 'Saving Changes...' : 'Save Payment Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

