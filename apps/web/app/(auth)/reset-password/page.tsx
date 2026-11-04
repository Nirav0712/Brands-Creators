'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setFeedback({ type: 'error', message: 'Password reset token is missing from the link.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match. Please verify.' });
      return;
    }

    if (newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res: any = await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });

      const data = res?.data || res;
      setFeedback({
        type: 'success',
        message: data?.message || 'Password successfully updated! You may now sign in.',
      });

      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to reset password. The link may have expired or is invalid.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/80 shadow-gemini-lg space-y-6">
      {/* Top Branding */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-500/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Set New Password</h1>
        <p className="text-xs text-slate-500">
          Create a secure, fresh password with a minimum of 8 characters
        </p>
      </div>

      {!token && (
        <div className="p-4 rounded-2xl text-xs bg-amber-50 text-amber-800 border border-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p>
            No reset token detected in URL. Please use the password reset link dispatched to your email address.
          </p>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            )}
            <div>
              <p>{feedback.message}</p>
              {feedback.type === 'success' && (
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 font-bold text-emerald-900 underline"
                  >
                    Go to Sign In now <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !token}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-98 transition-all disabled:opacity-50"
        >
          {isLoading ? 'Updating Password...' : 'Update Password & Sign In'}
        </button>
      </form>

      <div className="text-center pt-2">
        <Link href="/login" className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

