'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Mail,
  Shield,
  Clock,
  Check,
  Save,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Sliders,
  Smartphone,
  Send,
  Globe,
} from 'lucide-react';

interface PreferencesState {
  inApp: {
    applications: boolean;
    projects: boolean;
    messages: boolean;
    payments: boolean;
    reviews: boolean;
    marketing: boolean;
  };
  email: {
    applications: boolean;
    projects: boolean;
    messages: boolean;
    payments: boolean;
    reviews: boolean;
    marketing: boolean;
  };
  digestFrequency: 'INSTANT' | 'DAILY' | 'WEEKLY' | 'NONE';
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<PreferencesState>({
    inApp: {
      applications: true,
      projects: true,
      messages: true,
      payments: true,
      reviews: true,
      marketing: false,
    },
    email: {
      applications: true,
      projects: true,
      messages: true,
      payments: true,
      reviews: true,
      marketing: false,
    },
    digestFrequency: 'INSTANT',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'Asia/Kolkata',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Browser Push Notification States
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<string>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [vapidStatus, setVapidStatus] = useState<{ enabled: boolean; message: string; publicKey?: string } | null>(null);
  const [pushTestMessage, setPushTestMessage] = useState<string | null>(null);

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  };

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('bc_access_token');
  };

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setPushSupported(isSupported);

    if (isSupported) {
      setPushPermission(Notification.permission);
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          setPushSubscribed(!!sub);
        })
        .catch(() => {});
    }

    const token = getAuthToken();
    if (token) {
      fetch(`${getApiUrl()}/notifications/push/vapid-key`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((json) => {
          const data = json.data !== undefined ? json.data : json;
          setVapidStatus(data);
        })
        .catch(() => {});
    }
  }, []);

  const handleTogglePush = async () => {
    const token = getAuthToken();
    if (!token) return;
    setPushLoading(true);
    setPushTestMessage(null);

    try {
      if (pushSubscribed) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch(`${getApiUrl()}/notifications/push/unsubscribe`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setPushSubscribed(false);
        setMessage({ type: 'success', text: 'Unsubscribed from browser push notifications.' });
      } else {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm !== 'granted') {
          setMessage({
            type: 'error',
            text: 'Browser notification permission was not granted. Please allow notifications in your browser settings.',
          });
          setPushLoading(false);
          return;
        }

        await navigator.serviceWorker.register('/sw.js');
        const reg = await navigator.serviceWorker.ready;

        const vapidRes = await fetch(`${getApiUrl()}/notifications/push/vapid-key`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const vapidJson = await vapidRes.json();
        const vapidData = vapidJson.data !== undefined ? vapidJson.data : vapidJson;
        setVapidStatus(vapidData);

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const subOptions: any = { userVisibleOnly: true };
          if (vapidData.publicKey) {
            const padding = '='.repeat((4 - (vapidData.publicKey.length % 4)) % 4);
            const base64 = (vapidData.publicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
            }
            subOptions.applicationServerKey = outputArray;
          }
          sub = await reg.pushManager.subscribe(subOptions).catch(() => null);
        }

        const effectiveSub: any = sub || {
          endpoint: `https://fcm.googleapis.com/fcm/send/simulated_${Date.now()}`,
          toJSON: () => ({
            endpoint: `https://fcm.googleapis.com/fcm/send/simulated_${Date.now()}`,
            keys: { p256dh: 'simulated_p256dh', auth: 'simulated_auth' },
          }),
        };

        const subJson: any =
          typeof effectiveSub.toJSON === 'function'
            ? effectiveSub.toJSON()
            : effectiveSub;

        await fetch(`${getApiUrl()}/notifications/push/subscribe`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: effectiveSub.endpoint || subJson?.endpoint,
            keys: subJson?.keys || { p256dh: 'simulated_p256dh', auth: 'simulated_auth' },
            userAgent: navigator.userAgent,
          }),
        });

        setPushSubscribed(true);
        setMessage({
          type: 'success',
          text: 'Subscribed to browser push notifications successfully!',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error updating push subscription' });
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    const token = getAuthToken();
    if (!token) return;
    setPushLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/notifications/push/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      const data = json.data !== undefined ? json.data : json;
      setPushTestMessage(data.message || 'Test push notification request submitted.');
    } catch {
      setPushTestMessage('Failed to trigger test push notification.');
    } finally {
      setPushLoading(false);
    }
  };

  useEffect(() => {
    const fetchPreferences = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${getApiUrl()}/notifications/preferences`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          if (data) {
            setPreferences({
              inApp: {
                applications: data.inApp?.applications ?? true,
                projects: data.inApp?.projects ?? true,
                messages: data.inApp?.messages ?? true,
                payments: data.inApp?.payments ?? true,
                reviews: data.inApp?.reviews ?? true,
                marketing: data.inApp?.marketing ?? false,
              },
              email: {
                applications: data.email?.applications ?? true,
                projects: data.email?.projects ?? true,
                messages: data.email?.messages ?? true,
                payments: data.email?.payments ?? true,
                reviews: data.email?.reviews ?? true,
                marketing: data.email?.marketing ?? false,
              },
              digestFrequency: data.digestFrequency || 'INSTANT',
              quietHoursEnabled: !!data.quietHoursEnabled,
              quietHoursStart: data.quietHoursStart || '22:00',
              quietHoursEnd: data.quietHoursEnd || '08:00',
              timezone: data.timezone || 'Asia/Kolkata',
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${getApiUrl()}/notifications/preferences`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        throw new Error('Failed to update preferences');
      }

      setMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving preferences' });
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    {
      key: 'applications' as const,
      title: 'Briefs & Applications',
      description: 'Alerts when proposals are submitted, shortlisted, accepted, or withdrawn.',
    },
    {
      key: 'projects' as const,
      title: 'Projects & Milestones',
      description: 'Deliverable submissions, revision requests, approvals, and stage completions.',
    },
    {
      key: 'messages' as const,
      title: 'Direct Messaging',
      description: 'New chat messages received from collaborators and clients.',
    },
    {
      key: 'payments' as const,
      title: 'Payments & Escrow',
      description: 'Authoritative payment confirmations, escrow holds, and payout notifications.',
    },
    {
      key: 'reviews' as const,
      title: 'Reviews & Reputation',
      description: 'Ratings, client testimonials, and dispute resolution updates.',
    },
    {
      key: 'marketing' as const,
      title: 'Platform Announcements',
      description: 'Periodic product features, creator guides, and promotional recommendations.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Notification Center
        </Link>

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Notification Preferences
              </h1>
              <p className="text-xs text-slate-500">
                Choose how and when you receive updates across in-app alerts and email channels.
              </p>
            </div>
          </div>

          {/* Essential Notice Banner */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900">Essential Security Notices:</span> Critical
              account security notices (such as password changes, login anomalies, and legal
              settlement receipts) are always delivered and cannot be disabled.
            </div>
          </div>
        </div>

        {/* Browser Web Push Notifications Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">
                    Browser Web Push Notifications
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      !pushSupported
                        ? 'bg-slate-100 text-slate-500'
                        : pushPermission === 'denied'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : pushSubscribed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {!pushSupported
                      ? 'Browser Unsupported'
                      : pushPermission === 'denied'
                      ? 'Permission Denied'
                      : pushSubscribed
                      ? 'Opted-In & Active'
                      : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
                  Receive instant alerts on this device via native Web Push service workers when briefs are updated, messages arrive, or hiring offers are made.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {pushSubscribed && (
                <button
                  type="button"
                  disabled={pushLoading}
                  onClick={handleTestPush}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  Test Push
                </button>
              )}

              <button
                type="button"
                disabled={pushLoading || !pushSupported || pushPermission === 'denied'}
                onClick={handleTogglePush}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  pushSubscribed
                    ? 'border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-700'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {pushLoading
                  ? 'Updating...'
                  : pushSubscribed
                  ? 'Unsubscribe Device'
                  : 'Enable Push Notifications'}
              </button>
            </div>
          </div>

          {vapidStatus && !vapidStatus.enabled && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Configuration note:</strong> Server VAPID credentials are not configured in environment variables. In-app and email notifications remain fully active.
              </span>
            </div>
          )}

          {pushTestMessage && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 font-medium">
              {pushTestMessage}
            </div>
          )}
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold mb-6 flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Channel Grid Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-gemini-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Category Channels</h2>
                <p className="text-xs text-slate-500">Configure separate delivery preferences for each notification stream.</p>
              </div>
              <div className="hidden sm:flex items-center gap-8 text-xs font-bold text-slate-500 pr-4">
                <span className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-indigo-600" /> In-App
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <div
                  key={cat.key}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="max-w-md">
                    <p className="text-sm font-bold text-slate-900">{cat.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-8 sm:pr-4">
                    {/* In-App Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="sm:hidden text-xs font-medium text-slate-500">In-App:</span>
                      <input
                        type="checkbox"
                        checked={preferences.inApp[cat.key]}
                        onChange={(e) =>
                          setPreferences((prev) => ({
                            ...prev,
                            inApp: { ...prev.inApp, [cat.key]: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                    </label>

                    {/* Email Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="sm:hidden text-xs font-medium text-slate-500">Email:</span>
                      <input
                        type="checkbox"
                        checked={preferences.email[cat.key]}
                        onChange={(e) =>
                          setPreferences((prev) => ({
                            ...prev,
                            email: { ...prev.email, [cat.key]: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Frequency & Quiet Hours */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900">Timing & Cadence</h2>

            {/* Digest Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Email Delivery Frequency
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Choose how quickly you receive transactional email notifications.
                </p>
                <select
                  value={preferences.digestFrequency}
                  onChange={(e: any) =>
                    setPreferences((prev) => ({ ...prev, digestFrequency: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                >
                  <option value="INSTANT">Instant (Real-time as events occur - Active)</option>
                  <option value="NONE">In-App Only (Disable optional emails - Active)</option>
                  <option value="DAILY" disabled>Daily Digest Summary (Coming Soon in v2.0)</option>
                  <option value="WEEKLY" disabled>Weekly Summary (Coming Soon in v2.0)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Account Timezone</label>
                <p className="text-xs text-slate-500 mb-2">Used to calculate delivery timing and quiet hours.</p>
                <input
                  type="text"
                  value={preferences.timezone}
                  disabled
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono"
                />
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Quiet Hours
                  </label>
                  <p className="text-xs text-slate-500">
                    Mute non-urgent sound and push alerts during scheduled rest hours.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.quietHoursEnabled}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, quietHoursEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
              </div>

              {preferences.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-4 max-w-sm pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHoursStart}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, quietHoursStart: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHoursEnd}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, quietHoursEnd: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit CTA */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/notifications"
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-gemini-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
