import React from 'react';
import Link from 'next/link';
import { Sparkles, Shield, CheckCircle2, Globe, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/80 pt-16 pb-12 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-slate-100">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                BRANDS <span className="text-indigo-600">&</span> CREATORS
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              The premier B2B creative marketplace connecting brands with top-tier creators, cinematographers, UGC specialists, and production houses.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400 pt-2">
              <span className="inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                Verified Portfolios
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                Official Social Sync
              </span>
            </div>
          </div>

          {/* Marketplace Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Marketplace</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/explore" className="hover:text-indigo-600 transition-colors">
                  Explore Talent
                </Link>
              </li>
              <li>
                <Link href="/requirements" className="hover:text-indigo-600 transition-colors">
                  Requirement Leads
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-indigo-600 transition-colors">
                  Creative Categories
                </Link>
              </li>
              <li>
                <Link href="/requirements/new" className="hover:text-indigo-600 transition-colors">
                  Post a Project
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Talent Domains</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/explore?category=influencers-creators" className="hover:text-indigo-600 transition-colors">
                  Influencers & Creators
                </Link>
              </li>
              <li>
                <Link href="/explore?category=videography-cinematography" className="hover:text-indigo-600 transition-colors">
                  Cinematographers
                </Link>
              </li>
              <li>
                <Link href="/explore?category=ugc-creators" className="hover:text-indigo-600 transition-colors">
                  UGC Ad Specialists
                </Link>
              </li>
              <li>
                <Link href="/explore?category=production-houses-studios" className="hover:text-indigo-600 transition-colors">
                  Production Houses
                </Link>
              </li>
              <li>
                <Link href="/explore?category=design-branding" className="hover:text-indigo-600 transition-colors">
                  Design & Branding
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-indigo-600 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-indigo-600 transition-colors">
                  Creator Registration
                </Link>
              </li>
              <li>
                <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                  Admin Backoffice
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Staff</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 Brands & Creators Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-slate-600">Privacy Policy</Link>
            <Link href="#" className="hover:text-slate-600">Terms of Service</Link>
            <Link href="#" className="hover:text-slate-600">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
