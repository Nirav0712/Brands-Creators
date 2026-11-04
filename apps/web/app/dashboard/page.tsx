'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';

export default function DashboardIndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        const user = res.data || res;
        if (!user || !user.email) {
          router.replace('/login');
          return;
        }

        // If user hasn't finished onboarding, route to wizard
        if (user.onboardingCompleted === false) {
          router.replace('/onboarding');
          return;
        }

        // Route by role
        if (user.roles?.includes('BRAND') || user.roles?.includes('AGENCY')) {
          router.replace('/dashboard/brand');
        } else {
          router.replace('/dashboard/creator');
        }
      } catch (err) {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold text-slate-500">Preparing your personalized dashboard...</p>
    </div>
  );
}

