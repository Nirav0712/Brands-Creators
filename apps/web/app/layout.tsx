import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';
import { Navbar } from '../components/navbar';
import { Footer } from '../components/footer';

export const metadata: Metadata = {
  title: 'Brands & Creators — B2B Creative Marketplace & Talent SaaS',
  description:
    'Connect with verified content creators, UGC specialists, cinematographers, production houses, and marketing professionals on Brands & Creators.',
  keywords: [
    'creator marketplace',
    'influencer marketing',
    'production house',
    'cinematographers',
    'UGC creators',
    'freelance creative talent',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased selection:bg-indigo-500 selection:text-white overflow-x-hidden w-full">
        <Providers>
          <div className="gemini-ambient-bg min-h-screen flex flex-col overflow-x-hidden w-full">
            <Navbar />
            <main className="flex-1 w-full overflow-x-hidden">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
