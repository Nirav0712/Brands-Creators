'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Smartphone,
  Camera,
  Video,
  Film,
  Activity,
  Compass,
  Palette,
  UserCheck,
  Scissors,
  TrendingUp,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function CategoriesPage() {
  const categoriesList = [
    {
      name: 'Influencers & Creators',
      slug: 'influencers-creators',
      description: 'Macro, micro, and nano social media influencers, vloggers & public figures.',
      icon: Sparkles,
      subcategories: ['Lifestyle & Vlogs', 'Fashion & Beauty', 'Tech & Gadgets', 'Fitness & Health', 'Food & Culinary', 'Gaming'],
    },
    {
      name: 'UGC Creators',
      slug: 'ugc-creators',
      description: 'Authentic user-generated video reviews, unboxings, and direct response ad creatives.',
      icon: Smartphone,
      subcategories: ['Product Unboxing', 'Skincare Demos', 'App Walkthroughs', 'Direct Response Reels', 'Testimonials'],
    },
    {
      name: 'Photography',
      slug: 'photography',
      description: 'Commercial, editorial, product, fashion, and event photographers.',
      icon: Camera,
      subcategories: ['Commercial & Ad', 'E-commerce & Product', 'Fashion & Lookbook', 'Portraits', 'Events'],
    },
    {
      name: 'Videography & Cinematography',
      slug: 'videography-cinematography',
      description: 'High-end cinema, ad commercials, brand documentaries, and music videos.',
      icon: Video,
      subcategories: ['Cinematographers / DPs', 'Commercial Videographers', 'Music Videos', 'Documentaries'],
    },
    {
      name: 'Video & Reel Editors',
      slug: 'video-reel-editors',
      description: 'Fast-paced reel editing, documentary pacing, sound design, and color grading.',
      icon: Film,
      subcategories: ['Viral Reel Editors', 'YouTube Long-Form', 'Colorists & Finishing', 'Podcast Editors'],
    },
    {
      name: 'Motion Graphics & VFX',
      slug: 'motion-graphics-vfx',
      description: '3D animations, CGI commercials, visual effects, and logo reveals.',
      icon: Activity,
      subcategories: ['3D Motion Designers', '2D Explainers', 'CGI Product Ads', 'VFX Compositors'],
    },
    {
      name: 'Drone & Aerial Operators',
      slug: 'drone-aerial-operators',
      description: 'Licensed FPV and cinema drone pilots for landscape, real estate, and action sequences.',
      icon: Compass,
      subcategories: ['FPV Action Drone', 'Cinema Heavy-Lifters', 'Real Estate Aerials'],
    },
    {
      name: 'Design & Branding',
      slug: 'design-branding',
      description: 'Brand identity, UI/UX, graphic design, pitch decks, and illustrations.',
      icon: Palette,
      subcategories: ['Brand Identity', 'UI/UX Product Design', 'Graphic Design', 'Illustrators', 'Packaging'],
    },
    {
      name: 'Models & Actors',
      slug: 'models-actors',
      description: 'Commercial actors, fashion runway models, fit models, and voice artists.',
      icon: UserCheck,
      subcategories: ['Commercial Actors', 'Fashion Runway', 'Voice Artists & Anchors', 'Fitness Models'],
    },
    {
      name: 'Styling, Hair & Makeup',
      slug: 'styling-hair-makeup',
      description: 'Editorial makeup artists, fashion stylists, SFX makeup, and hair artists.',
      icon: Scissors,
      subcategories: ['Wardrobe Stylists', 'Editorial MUAs', 'Hair Stylists', 'SFX Prosthetics'],
    },
    {
      name: 'Performance Marketing & Ads',
      slug: 'performance-growth-marketing',
      description: 'Meta Ads, Google PPC, SEO, copywriters, and digital media buyers.',
      icon: TrendingUp,
      subcategories: ['Meta Ads Specialists', 'Google Ads / PPC', 'SEO Strategists', 'Copywriters', 'SMM'],
    },
    {
      name: 'Production Houses & Studios',
      slug: 'production-houses-studios',
      description: 'Full-service production teams, film directors, sound stages, and equipment rental.',
      icon: Layers,
      subcategories: ['Ad Film Houses', 'Commercial Directors', 'Sound Stages', 'Equipment Rentals', 'Event AV'],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          Dynamic Taxonomy
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Creative & Production Disciplines
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Discover vetted professionals across all 30+ dynamic admin-managed categories.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoriesList.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-gemini-sm hover:shadow-gemini-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1">{cat.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{cat.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {cat.subcategories.map((sub, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href={`/explore?category=${encodeURIComponent(cat.name)}`}
                className="inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-indigo-50 text-xs font-semibold text-slate-800 hover:text-indigo-600 border border-slate-200 transition-colors"
              >
                <span>Browse {cat.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
