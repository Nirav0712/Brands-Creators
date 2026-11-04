'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Search,
  PlusCircle,
  User,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  MessageSquare,
  Settings,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { UserAccountMenu } from './user-account-menu';
import { apiClient } from '../lib/api-client';
import { disconnectSocket } from '../lib/socket';

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    _id?: string;
    fullName?: string;
    username?: string;
    email?: string;
    roles?: string[];
    avatarUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Initial check from localStorage
    try {
      const stored = localStorage.getItem('bc_user');
      const token = localStorage.getItem('bc_access_token');
      if (stored) {
        setUser(JSON.parse(stored));
      }
      // If token exists, sync fresh profile from backend
      if (token) {
        apiClient
          .get('/auth/me')
          .then((res) => {
            const freshUser = res?.data || res;
            if (freshUser && freshUser.email) {
              setUser(freshUser);
              localStorage.setItem('bc_user', JSON.stringify(freshUser));
            }
          })
          .catch(() => {});
      }
    } catch (e) {}

    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  const handleMobileLogout = async () => {
    try {
      await apiClient.post('/auth/logout').catch(() => {});
    } finally {
      try {
        localStorage.removeItem('bc_access_token');
        localStorage.removeItem('bc_refresh_token');
        localStorage.removeItem('bc_user');
        localStorage.removeItem('bc_admin_token');
      } catch (e) {}
      disconnectSocket();
      setUser(null);
      setMobileMenuOpen(false);
      window.location.href = '/login';
    }
  };

  const navLinks = [
    { href: '/explore', label: 'Explore Talent' },
    { href: '/people', label: 'People' },
    { href: '/requirements', label: 'Requirements' },
    { href: '/projects', label: 'Projects' },
    { href: '/inbox', label: 'Messages' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-gemini-sm'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-gemini-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1">
                BRANDS <span className="text-indigo-600">&</span> CREATORS
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase -mt-1">
                B2B Creative SaaS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/70 p-1.5 rounded-full border border-slate-200/60 backdrop-blur-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-gemini-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/requirements/new"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-indigo-500" />
              Post Requirement
            </Link>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Authenticated Account Menu vs Public Login CTAs */}
            {user ? (
              <UserAccountMenu user={user} onLogoutSuccess={() => setUser(null)} />
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-gemini-sm shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all active:scale-95"
                >
                  Join as Creator
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle & Notification Bell */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-xl px-4 pt-2 pb-6 space-y-3">
          {user && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-2">
              <div className="font-bold text-sm text-slate-900">{user.fullName || user.username}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
              <div className="mt-2 flex items-center gap-2">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  View Profile
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  href="/profile?edit=1"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-slate-600 hover:underline"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          )}

          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                  pathname === link.href
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/requirements/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              Post Requirement
            </Link>

            {user ? (
              <button
                type="button"
                onClick={handleMobileLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold hover:bg-rose-100"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
              >
                Join Platform
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
