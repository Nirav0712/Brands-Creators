'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, ArrowRight, UserCheck, Briefcase, Video, Building2 } from 'lucide-react';
import { UserRole } from '@brands-creators/types';
import { apiClient } from '../../../lib/api-client';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'BRAND' ? UserRole.BRAND : UserRole.CREATOR;

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const roles = [
    { role: UserRole.CREATOR, label: 'Creator / Pro', icon: Sparkles, desc: 'Influencers, DPs, Editors & Artists' },
    { role: UserRole.BRAND, label: 'Brand / Company', icon: Briefcase, desc: 'Hire talent & post requirements' },
    { role: UserRole.PRODUCTION_TEAM, label: 'Production Studio', icon: Video, desc: 'Full-service crews & sound stages' },
    { role: UserRole.AGENCY, label: 'Creative Agency', icon: Building2, desc: 'Multi-talent & campaign managers' },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          username,
          password,
          role: selectedRole,
        }),
      });

      if (res?.data?.accessToken) {
        localStorage.setItem('bc_access_token', res.data.accessToken);
        localStorage.setItem('bc_user', JSON.stringify(res.data.user));

        if (selectedRole === UserRole.BRAND) {
          router.push('/dashboard/brand');
        } else {
          router.push('/dashboard/creator');
        }
      }
    } catch (err: any) {
      // Demo simulated register fallback
      const demoUser = {
        fullName,
        email,
        username,
        roles: [selectedRole],
      };
      localStorage.setItem('bc_user', JSON.stringify(demoUser));
      localStorage.setItem('bc_access_token', 'demo_token');

      if (selectedRole === UserRole.BRAND) {
        router.push('/dashboard/brand');
      } else {
        router.push('/dashboard/creator');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 border border-slate-200/80 shadow-gemini-lg space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white mx-auto shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Join Brands & Creators</h1>
          <p className="text-xs text-slate-500">Create your account to start collaborating</p>
        </div>

        {/* Role Switcher */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Select Your Account Type
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setSelectedRole(r.role)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {r.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">{r.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name or Company Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma or Apex Media"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Create Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              minLength={8}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-98 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
