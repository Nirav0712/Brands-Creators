'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck, Mail, Lock, UserCheck } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          login: loginIdentifier,
          password: password,
        }),
      });

      if (res?.data?.accessToken) {
        localStorage.setItem('bc_access_token', res.data.accessToken);
        localStorage.setItem('bc_user', JSON.stringify(res.data.user));

        if (res.data.user?.roles?.includes('SUPER_ADMIN') || res.data.user?.roles?.includes('ADMIN')) {
          window.location.href = 'http://localhost:3001';
        } else if (res.data.user?.roles?.includes('BRAND')) {
          router.push('/dashboard/brand');
        } else {
          router.push('/dashboard/creator');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid email/username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (role: 'CREATOR' | 'BRAND') => {
    if (role === 'CREATOR') {
      setLoginIdentifier('creator@demo.com');
      setPassword('Password@123');
    } else {
      setLoginIdentifier('brand@demo.com');
      setPassword('Password@123');
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-xs text-slate-500">Sign in to manage your marketplace requirements and portfolio</p>
        </div>

        {/* Demo Quick Logins */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 block text-center uppercase tracking-wider">
            Quick 1-Click Demo Logins
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('CREATOR')}
              className="py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
            >
              Demo Creator
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('BRAND')}
              className="py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
            >
              Demo Brand
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-100">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="name@company.com or username"
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-[11px] font-medium text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
