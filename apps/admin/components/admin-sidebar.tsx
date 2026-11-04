'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  LayoutDashboard,
  Briefcase,
  Layers,
  Users,
  Building2,
  Video,
  ShieldCheck,
  CreditCard,
  Settings,
  History,
  ExternalLink,
  ChevronRight,
  Shield,
  FileText,
  Mail,
  LogOut,
  Coins,
  Receipt,
  Sliders,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();

  const navigationGroups: NavGroup[] = [
    {
      group: 'Core',
      items: [
        { href: '/', label: 'Overview', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Marketplace',
      items: [
        { href: '/marketplace/requirements', label: 'Requirements & Briefs', icon: Briefcase },
        { href: '/marketplace/applications', label: 'Applications & Proposals', icon: FileText },
        { href: '/marketplace/categories', label: 'Taxonomies & Categories', icon: Layers },
      ],
    },
    {
      group: 'People',
      items: [
        { href: '/people/creators', label: 'Creators & Talent', icon: Users },
        { href: '/people/production', label: 'Production Teams', icon: Video },
        { href: '/people/brands', label: 'Brands & Clients', icon: Building2 },
      ],
    },
    {
      group: 'Business & Finance',
      items: [
        { href: '/subscriptions/plans', label: 'Subscription Plans', icon: CreditCard },
        { href: '/tokens', label: 'Token Wallets & Ledger', icon: Coins },
        { href: '/payments/manual-requests', label: 'Manual Payments Queue', icon: Receipt },
        { href: '/payments/settings', label: 'Payment Settings', icon: Sliders },
        { href: '/payments', label: 'Payments & Revenue', icon: CreditCard },
      ],
    },
    {
      group: 'Trust & Safety',
      items: [
        { href: '/reviews', label: 'Reviews & Reports', icon: ShieldCheck },
        { href: '/moderation/verification', label: 'Verification Queue', icon: Shield, badge: '5' },
      ],
    },
    {
      group: 'System & Governance',
      items: [
        { href: '/system/audit-logs', label: 'Audit Logs', icon: History },
        { href: '/system/settings', label: 'Platform Settings', icon: Settings },
        { href: '/notifications/deliveries', label: 'Email & Alerts Queue', icon: Mail },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/85 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Top Brand */}
      <div>
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-slate-900">
              BRANDS & CREATORS
            </div>
            <div className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">
              Admin Backoffice
            </div>
          </div>
        </div>

        {/* Nav Sections */}
        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navigationGroups.map((grp, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                {grp.group}
              </span>
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-indigo-500 text-white' : 'bg-rose-100 text-rose-700'}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Logged-in Staff */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              SA
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-900 truncate">Super Admin</div>
              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" /> Full Authority
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={async () => {
                try {
                  const { apiClient } = await import('../lib/api-client');
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
              }}
              title="Sign Out of Admin"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              title="Open Public Marketplace"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
