import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AdminSidebar } from '../components/admin-sidebar';
import { AdminHeader } from '../components/admin-header';

export const metadata: Metadata = {
  title: 'Brands & Creators — Admin Backoffice Panel',
  description: 'Enterprise moderation, taxonomy management, and system auditing for Brands & Creators SaaS.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased flex h-screen overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          <AdminHeader />
          <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
