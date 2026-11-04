'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, Download, FileSpreadsheet, FileJson } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState<'csv' | 'json' | null>(null);
  const [logs, setLogs] = useState<any[]>([
    {
      id: 'log-01',
      admin: 'Nirav Patel (Super Admin)',
      action: 'PROFILE_VERIFIED',
      entity: 'CreatorProfile: Rohan Kapoor',
      details: 'Approved Verified Pro badge after identity & GST review.',
      timestamp: '2026-10-05 21:45:12',
      ip: '103.24.12.89',
    },
    {
      id: 'log-02',
      admin: 'Nirav Patel (Super Admin)',
      action: 'CATEGORY_CREATED',
      entity: 'Category: Drone & Aerial Operators',
      details: 'Created category with 3 initial subcategories.',
      timestamp: '2026-10-05 20:10:04',
      ip: '103.24.12.89',
    },
    {
      id: 'log-03',
      admin: 'Staff Moderator',
      action: 'REQUIREMENT_MODERATED',
      entity: 'Requirement: UGC Videos Skincare',
      details: 'Requirement approved for public marketplace listing.',
      timestamp: '2026-10-05 18:22:30',
      ip: '49.36.210.15',
    },
    {
      id: 'log-04',
      admin: 'System Worker',
      action: 'SETTINGS_UPDATED',
      entity: 'PlatformSetting: Commission',
      details: 'Default commission set to 10%.',
      timestamp: '2026-10-05 12:00:00',
      ip: '127.0.0.1',
    },
  ]);

  useEffect(() => {
    async function loadAuditLogs() {
      try {
        const res: any = await apiClient.get('/audit-logs?limit=50');
        const payload = res?.data !== undefined ? res.data : res;
        const items = payload?.items || (Array.isArray(payload) ? payload : []);
        if (items.length > 0) {
          const mapped = items.map((l: any) => ({
            id: l._id || l.id,
            admin: l.adminName || 'Admin User',
            action: l.action,
            entity: `${l.entityType || 'Entity'}: ${l.entityId || ''}`,
            details: typeof l.details === 'string' ? l.details : JSON.stringify(l.details || {}),
            timestamp: l.createdAt ? new Date(l.createdAt).toLocaleString() : 'Recent',
            ip: l.ipAddress || '127.0.0.1',
          }));
          setLogs(mapped);
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
    loadAuditLogs();
  }, []);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(format);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('bc_admin_token') || localStorage.getItem('bc_access_token')
          : null;
      const query = new URLSearchParams({ format });
      if (search) query.append('search', search);

      const res = await fetch(`${API_BASE_URL}/audit-logs/export?${query.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Export request failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <History className="w-3.5 h-3.5" />
            Governance & Compliance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            System Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit trail recording all administrative operations, moderation decisions, and role modifications.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting !== null}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {isExporting === 'csv' ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting !== null}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <FileJson className="w-4 h-4 text-amber-600" />
            {isExporting === 'json' ? 'Exporting...' : 'Export JSON'}
          </button>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/85 shadow-gemini-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs by admin name, action, or target entity..."
          className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/85 shadow-gemini-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-4">Admin / Operator</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-6">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6 text-slate-500">{log.timestamp}</td>
                  <td className="py-4 px-4 font-bold text-slate-900 font-sans">{log.admin}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-sans font-medium text-slate-800">{log.entity}</td>
                  <td className="py-4 px-4 font-sans text-slate-600 max-w-xs">{log.details}</td>
                  <td className="py-4 px-6 text-slate-400">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
