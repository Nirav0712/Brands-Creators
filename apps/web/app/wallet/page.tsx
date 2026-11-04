'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  CreditCard,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  RefreshCw,
  Gift,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  X,
  Upload,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '../../lib/utils';
import { ITokenWallet, ITokenLedgerEntry, ISubscriptionPlan, IUserSubscription } from '@brands-creators/types';

export default function TokenWalletPage() {
  const [wallet, setWallet] = useState<ITokenWallet | null>(null);
  const [subscription, setSubscription] = useState<IUserSubscription | null>(null);
  const [plans, setPlans] = useState<ISubscriptionPlan[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [ledger, setLedger] = useState<ITokenLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual payment modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<{
    type: 'SUBSCRIPTION' | 'TOKEN_PACKAGE';
    planId?: string;
    packageId?: string;
    title: string;
    amount: number;
    tokens: number;
  } | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [senderIdentifier, setSenderIdentifier] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [walletRes, subRes, plansRes, packagesRes, ledgerRes, settingsRes] = await Promise.all([
        apiClient.get('/tokens/wallet').catch(() => null),
        apiClient.get('/subscriptions/my-subscription').catch(() => null),
        apiClient.get('/subscriptions/plans').catch(() => ({ data: [] })),
        apiClient.get('/payments/token-packages').catch(() => ({ data: [] })),
        apiClient.get('/tokens/ledger?limit=15').catch(() => ({ data: { items: [] } })),
        apiClient.get('/payments/settings').catch(() => null),
      ]);

      const wData = walletRes?.data || walletRes;
      if (wData && wData.balance !== undefined) setWallet(wData);

      const sData = subRes?.data || subRes;
      setSubscription(sData || null);

      const pData = plansRes?.data || plansRes;
      if (Array.isArray(pData)) setPlans(pData);

      const pkgData = packagesRes?.data || packagesRes;
      if (Array.isArray(pkgData)) setPackages(pkgData);

      const lData = ledgerRes?.data?.items || ledgerRes?.items || [];
      if (Array.isArray(lData)) setLedger(lData);

      const settsData = settingsRes?.data || settingsRes;
      if (settsData) setPaymentSettings(settsData);
    } catch (err: any) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenCheckout = (target: {
    type: 'SUBSCRIPTION' | 'TOKEN_PACKAGE';
    planId?: string;
    packageId?: string;
    title: string;
    amount: number;
    tokens: number;
  }) => {
    setCheckoutTarget(target);
    setTransactionRef('');
    setSenderIdentifier('');
    setCheckoutModalOpen(true);
  };

  const handleSubmitManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTarget) return;
    if (!transactionRef.trim()) {
      alert('Please enter your transaction reference number (UTR).');
      return;
    }

    setSubmittingPayment(true);
    try {
      const payload: any = {
        targetType: checkoutTarget.type,
        amount: checkoutTarget.amount,
        paymentMethod,
        transactionReference: transactionRef.trim(),
        senderIdentifier: senderIdentifier.trim(),
      };

      if (checkoutTarget.type === 'SUBSCRIPTION') {
        payload.targetPlanId = checkoutTarget.planId;
      } else {
        payload.tokenPackageId = checkoutTarget.packageId;
        payload.tokenPackageQuantity = checkoutTarget.tokens;
      }

      const res = await apiClient.post('/payments/manual-request', payload);
      setFeedback({
        type: 'success',
        message: `Manual payment submitted successfully! Order #${res.data?.orderNumber || 'created'}. Verification usually completes within 1-2 hours.`,
      });
      setCheckoutModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit manual payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSubscribeFree = async (planId: string) => {
    try {
      setActionLoading(planId);
      setFeedback(null);
      const res = await apiClient.post('/subscriptions/subscribe-free', { planId });
      setFeedback({
        type: 'success',
        message: res?.message || 'Free Starter Plan activated with 10 bonus tokens!',
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to activate free plan.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading your token wallet & subscriptions...</p>
      </div>
    );
  }

  const tokenRate = wallet?.currencyReferenceRate || 10;
  const balanceInInr = (wallet?.balance || 0) * tokenRate;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Coins className="w-8 h-8 text-amber-500" />
            Token Wallet & Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your marketplace spending balance, active plan entitlements, and token ledger.
          </p>
        </div>
        <button
          onClick={loadData}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-gemini-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between text-indigo-200 text-xs font-semibold mb-3">
            <span>Available Token Balance</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold">
              1 Token = {formatCurrency(tokenRate)}
            </span>
          </div>
          <div className="text-4xl sm:text-5xl font-black tracking-tight mb-2 flex items-baseline gap-2">
            <span>{(wallet?.balance || 0).toLocaleString()}</span>
            <span className="text-base font-semibold text-amber-400">Tokens</span>
          </div>
          <p className="text-xs text-indigo-200/80 mb-6">
            Approximate Value: <span className="font-bold text-white">{formatCurrency(balanceInInr)}</span>
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
            <div>
              <span className="text-indigo-300 block text-[10px] uppercase font-bold">Lifetime Received</span>
              <span className="font-bold text-white">{wallet?.totalReceived || 0} Tokens</span>
            </div>
            <div>
              <span className="text-indigo-300 block text-[10px] uppercase font-bold">Lifetime Spent</span>
              <span className="font-bold text-white">{wallet?.totalSpent || 0} Tokens</span>
            </div>
          </div>
        </div>

        {/* Active Subscription Status Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Subscription</span>
              {subscription ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                  No Active Plan
                </span>
              )}
            </div>

            {subscription ? (
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">
                  {(subscription.planId as any)?.name || 'Custom Plan'}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {(subscription.planId as any)?.description}
                </p>
                <div className="pt-2 text-xs text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Expires:{' '}
                    {subscription.expiresAt
                      ? new Date(subscription.expiresAt).toLocaleDateString()
                      : 'Lifetime'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Choose a Subscription Plan</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Subscribe to unlock recurring token allocations, priority marketplace placement, and verified badges.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <a
              href="#plans"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              View available plans & pricing <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Quick Top-Up Notice Card */}
        <div className="bg-amber-50/60 rounded-3xl p-6 border border-amber-200/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
              <Zap className="w-4 h-4 text-amber-600" /> Need Extra Tokens?
            </div>
            <p className="text-xs text-amber-800 leading-relaxed mb-4">
              Token allocations can be used for posting campaigns, unlocking verified creator contacts, or spotlighting collaborations.
            </p>
            <div className="space-y-2">
              {packages.length > 0 ? (
                packages.slice(0, 3).map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between text-xs text-amber-950 font-medium bg-amber-100/40 px-3 py-1.5 rounded-xl">
                    <span>{pkg.name} ({pkg.tokensCount} Tokens)</span>
                    <button
                      onClick={() =>
                        handleOpenCheckout({
                          type: 'TOKEN_PACKAGE',
                          packageId: pkg.id,
                          title: pkg.name,
                          amount: pkg.priceInr,
                          tokens: pkg.tokensCount,
                        })
                      }
                      className="font-bold text-amber-700 hover:text-amber-900 hover:underline"
                    >
                      ₹{pkg.priceInr} →
                    </button>
                  </div>
                ))
              ) : (
                <div className="space-y-1.5 text-xs text-amber-900/90 font-medium">
                  <div className="flex items-center justify-between">
                    <span>50 Token Pack</span>
                    <span className="font-bold">₹500</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>150 Token Pack</span>
                    <span className="font-bold">₹1,350</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              const defaultPkg = packages[0] || { id: 'starter', name: 'Starter Pack', priceInr: 500, tokensCount: 50 };
              handleOpenCheckout({
                type: 'TOKEN_PACKAGE',
                packageId: defaultPkg.id,
                title: defaultPkg.name,
                amount: defaultPkg.priceInr,
                tokens: defaultPkg.tokensCount,
              });
            }}
            className="mt-4 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all text-center"
          >
            Buy Token Packages
          </button>
        </div>
      </div>

      {/* Subscription Plans Section */}
      <div id="plans" className="space-y-4 pt-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Marketplace Subscription Plans</h2>
          <p className="text-xs text-slate-500">
            Select a plan that fits your growth and production requirements. Unused tokens carry forward in your wallet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent =
              subscription &&
              ((subscription.planId as any)?._id === plan._id || (subscription.planId as any) === plan._id);

            return (
              <div
                key={plan._id}
                className={`rounded-3xl p-6 border transition-all flex flex-col justify-between bg-white ${
                  isCurrent
                    ? 'border-indigo-600 shadow-gemini-md ring-2 ring-indigo-600/10'
                    : 'border-slate-200/80 shadow-gemini-sm hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{plan.duration}</span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1.5 my-3">
                    <span className="text-3xl font-black text-slate-900">
                      {plan.price === 0 ? 'Free' : formatCurrency(plan.price)}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/{plan.duration.toLowerCase()}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{plan.description}</p>

                  <div className="p-3 bg-slate-50 rounded-2xl mb-4 text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span>Included Allocation:</span>
                    <span className="font-black text-amber-600">{plan.includedTokens} Tokens</span>
                  </div>

                  <div className="space-y-2 mb-6">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entitlements</span>
                    {plan.entitlements && plan.entitlements.length > 0 ? (
                      plan.entitlements.map((e, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{e}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Standard platform access</p>
                    )}
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed"
                    >
                      Active Plan
                    </button>
                  ) : plan.isFree ? (
                    <button
                      onClick={() => handleSubscribeFree(plan._id)}
                      disabled={actionLoading === plan._id}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      {actionLoading === plan._id ? 'Activating Plan...' : 'Activate Free Plan'}
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        handleOpenCheckout({
                          type: 'SUBSCRIPTION',
                          planId: plan._id,
                          title: plan.name,
                          amount: plan.price,
                          tokens: plan.includedTokens,
                        })
                      }
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Subscribe via Manual UPI / Bank
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Token Ledger History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-gemini-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">Token Transaction Ledger</h2>
            <p className="text-xs text-slate-500">Auditable history of all token grants, purchases, and spends.</p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{ledger.length} Recent Entries</span>
        </div>

        {ledger.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Coins className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No token transactions recorded yet. Subscribe to a plan or activate your Free Starter allocation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Reason / Details</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-right">Balance After</th>
                  <th className="pb-3 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {ledger.map((entry) => {
                  const isCredit = entry.direction === 'CREDIT';
                  return (
                    <tr key={entry._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="font-bold text-slate-800">{entry.type}</span>
                      </td>
                      <td className="py-3.5 max-w-xs truncate text-slate-600">{entry.reason}</td>
                      <td
                        className={`py-3.5 text-right font-black ${
                          isCredit ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {isCredit ? `+${entry.amount}` : `-${entry.amount}`}
                      </td>
                      <td className="py-3.5 text-right font-bold text-slate-800">{entry.balanceAfter}</td>
                      <td className="py-3.5 text-right text-slate-400 text-[11px]">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Manual Payment Checkout Modal */}
      {checkoutModalOpen && checkoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                Direct Manual Settlement
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">{checkoutTarget.title}</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-slate-900">₹{checkoutTarget.amount.toLocaleString()}</span>
                <span className="text-xs font-semibold text-amber-600">
                  Includes {checkoutTarget.tokens} Platform Tokens
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  paymentMethod === 'UPI'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                UPI / QR Code
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Bank Transfer (NEFT/IMPS)
              </button>
            </div>

            {/* Bank/UPI Information Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-6 text-xs space-y-3">
              {paymentMethod === 'UPI' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">UPI ID (VPA):</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                      <span>{paymentSettings?.upiId || 'pay.brandscreators@icici'}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentSettings?.upiId || 'pay.brandscreators@icici', 'upi')}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {copiedField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Beneficiary:</span>
                    <span className="font-semibold text-slate-900">
                      {paymentSettings?.upiDisplayName || 'Brands & Creators Media Pvt Ltd'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bank Name:</span>
                    <span className="font-semibold text-slate-900">{paymentSettings?.bankName || 'HDFC Bank'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Account Number:</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                      <span>{paymentSettings?.accountNumber || '50200098765432'}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentSettings?.accountNumber || '50200098765432', 'acc')}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">IFSC Code:</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                      <span>{paymentSettings?.ifscCode || 'HDFC0001234'}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentSettings?.ifscCode || 'HDFC0001234', 'ifsc')}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Beneficiary:</span>
                    <span className="font-semibold text-slate-900">
                      {paymentSettings?.bankAccountHolder || 'Brands & Creators Media Pvt Ltd'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmitManualPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unique Transaction Reference (UTR / UPI Ref ID) *
                </label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. 412356789012 or CMS2026103001"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Sender Account / UPI ID (Optional)
                </label>
                <input
                  type="text"
                  value={senderIdentifier}
                  onChange={(e) => setSenderIdentifier(e.target.value)}
                  placeholder="e.g. user@okaxis or John Doe"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                By submitting, your payment reference will be queued for administrator review. Credits and subscriptions are activated immediately upon verification.
              </p>

              <button
                type="submit"
                disabled={submittingPayment}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {submittingPayment ? 'Submitting Verification...' : 'Submit Payment for Verification'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
