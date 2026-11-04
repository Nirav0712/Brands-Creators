'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  Settings,
  ShieldCheck,
  ChevronDown,
  LayoutDashboard,
  CheckCircle,
  Briefcase,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { disconnectSocket } from '../lib/socket';
import { resolveMediaUrl } from '../lib/utils';

export interface UserAccountMenuProps {
  user: {
    _id?: string;
    fullName?: string;
    username?: string;
    email?: string;
    roles?: string[];
    avatarUrl?: string | null;
    status?: string;
    isEmailVerified?: boolean;
  };
  onLogoutSuccess?: () => void;
}

export function UserAccountMenu({ user, onLogoutSuccess }: UserAccountMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or ESC key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Call backend logout endpoint
      await apiClient.post('/auth/logout').catch((err) => {
        console.warn('Backend logout failed or session already expired:', err?.message);
      });
    } catch (e) {
      console.warn('Logout network error:', e);
    } finally {
      // 1. Clear stored credentials
      try {
        localStorage.removeItem('bc_access_token');
        localStorage.removeItem('bc_refresh_token');
        localStorage.removeItem('bc_user');
        localStorage.removeItem('bc_admin_token');
      } catch (err) {}

      // 2. Disconnect socket
      try {
        disconnectSocket();
      } catch (err) {}

      setIsOpen(false);
      setIsLoggingOut(false);

      if (onLogoutSuccess) {
        onLogoutSuccess();
      }

      // 3. Redirect to login page
      router.push('/login');
    }
  };

  const isBrand = user.roles?.includes('BRAND');
  const isCreator = user.roles?.includes('CREATOR');
  const isProduction = user.roles?.includes('PRODUCTION_TEAM');
  const isAdmin = user.roles?.includes('ADMIN') || user.roles?.includes('SUPER_ADMIN');

  const roleLabel = isAdmin
    ? 'Admin'
    : isBrand
    ? 'Brand'
    : isProduction
    ? 'Studio'
    : isCreator
    ? 'Creator'
    : 'User';

  const roleBadgeColor = isAdmin
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : isBrand
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : isProduction
    ? 'bg-purple-50 text-purple-700 border-purple-200'
    : 'bg-indigo-50 text-indigo-700 border-indigo-200';

  const dashboardUrl = isAdmin
    ? 'http://localhost:3001'
    : isBrand
    ? '/dashboard/brand'
    : isProduction
    ? '/projects'
    : '/dashboard/creator';

  const initials = (user.fullName || user.username || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarSrc = user.avatarUrl
    ? resolveMediaUrl(user.avatarUrl)
    : null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Account Menu Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User Account Menu"
        className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-95"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shrink-0 ring-1 ring-white shadow-sm">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={user.fullName || 'User'}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initials on broken image
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        <div className="hidden sm:flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate leading-tight">
              {user.fullName || user.username || 'Account'}
            </span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 truncate max-w-[140px] leading-tight">
            {user.email}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Account Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-gemini-lg border border-slate-200/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Card */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 mb-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={user.fullName || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-slate-900 truncate">
                  {user.fullName || user.username || 'Account'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${roleBadgeColor}`}>
                    {roleLabel} Account
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>View My Profile</span>
            </Link>

            <Link
              href="/profile?edit=1"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Edit Profile & Photo</span>
            </Link>

            <Link
              href={dashboardUrl}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>{isAdmin ? 'Admin Backoffice' : 'Dashboard Workspace'}</span>
            </Link>
          </div>

          <div className="my-1.5 border-t border-slate-100" />

          {/* Logout Action Button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>{isLoggingOut ? 'Logging out...' : 'Sign Out'}</span>
            </div>
            {isLoggingOut && (
              <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

