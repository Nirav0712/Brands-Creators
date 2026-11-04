'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; resetUrl?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      const res: any = await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const data = res?.data || res;
      setFeedback({
        type: 'success',
        message: data?.message || 'If that email is registered, password reset instructions have been dispatched.',
        resetUrl: data?.resetUrl,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Unable to process password reset request. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/80 shadow-gemini-lg space-y-6">
        {/* Top Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Account Recovery</h1>
          <p className="text-xs text-slate-500">
            Enter your registered email address to receive a secure password reset link
          </p>
        </div>

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
              <div className="space-y-2">
                <p>{feedback.message}</p>
                {feedback.resetUrl && (
                  <div className="pt-2 border-t border-emerald-200/60">
                    <span className="block text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-1">
                      Local Testing Reset Link:
                    </span>
                    <Link
                      href={feedback.resetUrl}
                      className="inline-block text-[11px] font-semibold text-indigo-700 underline break-all hover:text-indigo-900"
                    >
                      {feedback.resetUrl}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registered Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-98 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Processing Request...' : 'Send Reset Instructions'}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

