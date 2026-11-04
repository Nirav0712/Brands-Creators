'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Globe,
  User,
  LogOut,
  Settings,
  Shield,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { resolveMediaUrl } from '../lib/utils';

export function AdminHeader() {
  const [user, setUser] = useState<{
    _id?: string;
    fullName?: string;
    username?: string;
    email?: string;
    roles?: string[];
    avatarUrl?: string | null;
  } | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read cached or fetch live admin user profile
    try {
      const stored = localStorage.getItem('bc_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {}

    apiClient
      .get('/auth/me')
      .then((res) => {
        const data = res?.data || res;
        if (data && data.email) {
          setUser(data);
          try {
            localStorage.setItem('bc_user', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch(() => {
        // Fallback default admin metadata if offline
        setUser({
          fullName: 'Super Admin',
          username: 'superadmin',
          email: 'admin@brandsandcreators.com',
          roles: ['SUPER_ADMIN'],
        });
      });
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await apiClient.post('/auth/logout').catch(() => {});
    } finally {
      try {
        localStorage.removeItem('bc_admin_token');
        localStorage.removeItem('bc_access_token');
        localStorage.removeItem('bc_refresh_token');
        localStorage.removeItem('bc_user');
      } catch (e) {}
      window.location.href = 'http://localhost:3000/login';
    }
  };

  const displayName = user?.fullName || 'Super Admin';
  const displayEmail = user?.email || 'admin@brandsandcreators.com';
  const avatarSrc = user?.avatarUrl ? resolveMediaUrl(user.avatarUrl) : null;

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="flex items-center gap-2 w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search creators, brands, requirements, logs (⌘ + K)..."
            className="w-full bg-transparent focus:outline-none text-slate-800 placeholder-slate-400 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Production API Healthy
        </div>

        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
          title="Open Web Marketplace"
        >
          <Globe className="w-4 h-4" />
        </a>

        <button
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors relative"
          title="Verification Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        {/* Admin Account & Logout Menu */}
        <div className="relative inline-block text-left" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Admin Account Menu"
            className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors focus:outline-none"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>SA</span>
              )}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[100px] truncate">
              {displayName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-gemini-lg border border-slate-200/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span>SA</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-900 truncate">{displayName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{displayEmail}</div>
                    <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                      <Shield className="w-3 h-3" /> Super Admin Authority
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-0.5">
                <a
                  href="http://localhost:3000/profile"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile & Settings</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <a
                  href="/system/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Platform Settings</span>
                </a>
              </div>

              <div className="my-1.5 border-t border-slate-100" />

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign Out of Admin'}</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
