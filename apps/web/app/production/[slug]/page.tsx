'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Film,
  ShieldCheck,
  MapPin,
  Camera,
  Layers,
  Send,
  Calendar,
  Eye,
  Bookmark,
  Share2,
  Sparkles,
  Award,
  DollarSign,
  Users,
} from 'lucide-react';
import { formatCurrency, resolveMediaUrl } from '../../../lib/utils';
import { apiClient } from '../../../lib/api-client';

export default function ProductionTeamProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [activeTab, setActiveTab] = useState<'portfolio' | 'equipment' | 'services' | 'clients'>('portfolio');
  const [teamData, setTeamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudio() {
      if (!slug) return;
      try {
        setLoading(true);
        const res = await apiClient<any>(`/production-teams/${slug}`);
        if (res?.data || res?.studioName) {
          setTeamData(res.data || res);
        }
      } catch (e) {
        console.warn('Production studio fetch fallback:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchStudio();
  }, [slug]);

  const studio = {
    studioName: teamData?.studioName || 'Horizon Cinema Works',
    tagline: teamData?.tagline || 'Full-Scale Commercial Ad Production & High-End Post-Production',
    description:
      teamData?.description ||
      'Horizon Cinema Works is a turnkey film and commercial production house based in Mumbai. We provide end-to-end commercial film direction, cinematography crews, sound stages, heavy-lifter cinema drones, and DaVinci color grading.',
    teamSize: teamData?.teamSize || 12,
    startingDayRate: teamData?.startingDayRate || 45000,
    city: teamData?.location?.city || 'Mumbai',
    country: teamData?.location?.country || 'India',
    serviceAreas: teamData?.serviceAreas?.length ? teamData?.serviceAreas : ['Mumbai', 'Delhi NCR', 'Goa', 'Global'],
    equipmentRoster: (teamData?.equipmentRoster?.length ? teamData.equipmentRoster : [
      '2x ARRI Alexa Mini LF Packages',
      'RED V-Raptor 8K VV Cinema Package',
      'Cooke Anamorphic /i Prime Lens Kit (25, 32, 50, 75, 100mm)',
      'Aputure 1200d & 600c Full G&E Lighting Truck Package',
      'DJI Inspire 3 & Heavy Lifter Cinema FPV Rig',
      'Sound Devices 833 8-Track Field Audio Package',
    ]),
    specialties: teamData?.specialties?.length ? teamData?.specialties : ['Commercial TVCs', 'Music Videos', 'Color Grading', 'Drone Aerials', 'VFX Compositing'],
    logoUrl: (teamData?.logoUrl || teamData?.userId?.avatarUrl) ? resolveMediaUrl(teamData?.logoUrl || teamData?.userId?.avatarUrl) : 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=400&q=80',
    coverImageUrl: teamData?.coverImageUrl ? resolveMediaUrl(teamData.coverImageUrl) : 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1400&q=80',
    portfolio: (teamData?.portfolio?.length ? teamData.portfolio : [
      {
        title: 'Audi India — RS e-tron GT Commercial Film',
        mediaType: 'VIDEO',
        mediaUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
        clientBrand: 'Audi',
      },
      {
        title: 'OnePlus 12 Launch Global Teaser',
        mediaType: 'VIDEO',
        mediaUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
        clientBrand: 'OnePlus',
      },
    ]),
    previousClients: (teamData?.previousClients?.length ? teamData.previousClients : [
      { name: 'Audi India', projectTitle: 'Night Velocity TVC' },
      { name: 'Red Bull', projectTitle: 'Urban Descent Series' },
      { name: 'Tata Motors', projectTitle: 'EV Commercials' },
      { name: 'Spotify India', projectTitle: 'Artist Spotlight' },
    ]),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Studio Header */}
      <div className="relative bg-white rounded-3xl border border-slate-200/80 shadow-gemini-md overflow-hidden">
        <div className="h-56 sm:h-72 w-full bg-slate-900 relative">
          <img src={studio.coverImageUrl} alt="Cover" className="w-full h-full object-cover opacity-85" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
        </div>

        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            <div className="flex items-end gap-5">
              <div className="relative">
                <img
                  src={studio.logoUrl}
                  alt={studio.studioName}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover ring-4 ring-white shadow-xl bg-white"
                />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 fill-indigo-100" />
                </div>
              </div>

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{studio.studioName}</h1>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Production House
                  </span>
                </div>
                <p className="text-sm font-semibold text-indigo-600 mt-1">{studio.tagline}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {studio.city}, {studio.country}
                  </span>
                  <span>•</span>
                  <span>{studio.teamSize} Crew Members</span>
                  <span>•</span>
                  <span>Starts at {formatCurrency(studio.startingDayRate)} / day</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
              <button
                onClick={() => alert('Direct studio booking inquiry')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                <Send className="w-4 h-4" /> Book Production Crew
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'portfolio' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Portfolio ({studio.portfolio.length})
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'equipment' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Equipment Roster ({studio.equipmentRoster.length})
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'clients' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Previous Clients ({studio.previousClients.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'portfolio' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {studio.portfolio.map((item: any, idx: number) => (
            <div key={idx} className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-gemini-sm space-y-3">
              <div className="relative h-60 w-full overflow-hidden bg-slate-100">
                <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-900">
                  {item.clientBrand}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-base text-slate-900">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-gemini-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Camera Packages, G&E & Sound Stages</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {studio.equipmentRoster.map((eq: string, idx: number) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3 text-xs font-semibold text-slate-800">
                <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{eq}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {studio.previousClients.map((client: any, idx: number) => (
            <div key={idx} className="p-5 rounded-3xl bg-white border border-slate-200/80 text-center space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">{client.name}</h4>
              <p className="text-[11px] text-slate-400">{client.projectTitle}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
