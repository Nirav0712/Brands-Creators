'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowRight,
  Clock,
  Sparkles,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';
import { IBrandTeamInvitationPreview } from '@brands-creators/types';

function InvitationAcceptanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<IBrandTeamInvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('bc_access_token') : null;
    setIsLoggedIn(Boolean(accessToken));

    if (!token) {
      setError('No invitation token provided in the URL.');
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      try {
        setLoading(true);
        const res: any = await apiClient(`/brands/team/invitation/${token}`);
        const data = res.data || res;
        setInvitation(data);
      } catch (err: any) {
        setError(err?.message || 'Invalid or expired invitation token.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    setError(null);
    try {
      await apiClient('/brands/team/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ inviteToken: token }),
      });
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/brand');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to accept invitation. Please verify your session.');
      setIsAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Verifying team workspace invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Invitation Unavailable</h1>
            <p className="text-xs text-slate-500 mt-1">{error || 'This invitation is invalid or has expired.'}</p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Return to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-emerald-100 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Welcome to the Team!</h1>
            <p className="text-xs text-slate-600 mt-1.5">
              You are now an active collaborator on <strong>{invitation.companyName}</strong>. Redirecting to your workspace...
            </p>
          </div>
          <div className="pt-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Sparkles className="w-3.5 h-3.5" />
            Workspace Team Invitation
          </span>
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/20">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Join {invitation.companyName}
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You have been invited to collaborate as an enterprise workspace member on Brands & Creators.
          </p>
        </div>

        {/* Invitation Overview Card */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3.5 text-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Invited Email</span>
            <span className="font-bold text-slate-800">{invitation.email}</span>
          </div>
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Assigned Role</span>
            <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider text-[10px]">
              {invitation.role}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Invitation Status</span>
            {invitation.isExpired ? (
              <span className="font-bold text-rose-600">Expired</span>
            ) : invitation.isRevoked ? (
              <span className="font-bold text-rose-600">Revoked by Brand</span>
            ) : invitation.isAccepted ? (
              <span className="font-bold text-emerald-600">Already Accepted</span>
            ) : (
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active & Valid
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {invitation.valid ? (
            isLoggedIn ? (
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isAccepting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Joining Workspace...
                  </>
                ) : (
                  <>
                    Accept Invitation & Join Team
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-center text-slate-500 font-medium">
                  Please log in or register with <span className="font-bold text-slate-700">{invitation.email}</span> to accept.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/login?redirect=/brand/team/accept?token=${token}`}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Log In
                  </Link>
                  <Link
                    href={`/register?role=BRAND&email=${encodeURIComponent(invitation.email)}&redirect=/brand/team/accept?token=${token}`}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Register
                  </Link>
                </div>
              </div>
            )
          ) : (
            <div className="text-center p-4 bg-slate-100 rounded-xl text-xs text-slate-500">
              This invitation cannot be accepted because it has expired or was revoked.
            </div>
          )}

          <div className="text-center pt-2">
            <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              Decline & Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvitationAcceptancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-500">Loading invitation...</p>
          </div>
        </div>
      }
    >
      <InvitationAcceptanceContent />
    </Suspense>
  );
}
