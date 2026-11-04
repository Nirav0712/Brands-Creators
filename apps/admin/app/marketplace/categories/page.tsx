'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Sliders,
  Star,
  ArrowUp,
  ArrowDown,
  FolderTree,
  Tag,
  Globe,
  RefreshCw,
  Eye,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

interface SubCategory {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  status?: string;
  sortOrder?: number;
  featured?: boolean;
}

interface Category {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  featured: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  subcategories: SubCategory[];
}

const INITIAL_TAXONOMY: Category[] = [
  {
    name: 'INFLUENCERS',
    slug: 'influencers',
    description: 'Content creators, vloggers, and social media personalities across verticals.',
    icon: 'Sparkles',
    status: 'ACTIVE',
    featured: true,
    sortOrder: 1,
    seoTitle: 'Hire Top Social Media Influencers | Brands & Creators',
    seoDescription: 'Find and hire verified food, fashion, tech, and lifestyle influencers across India.',
    subcategories: [
      { name: 'Food', slug: 'food' },
      { name: 'Fashion', slug: 'fashion' },
      { name: 'Beauty', slug: 'beauty' },
      { name: 'Fitness', slug: 'fitness' },
      { name: 'Travel', slug: 'travel' },
      { name: 'Lifestyle', slug: 'lifestyle' },
      { name: 'Technology', slug: 'technology' },
      { name: 'Finance', slug: 'finance' },
      { name: 'Parenting', slug: 'parenting' },
      { name: 'Local/City', slug: 'local-city' },
    ],
  },
  {
    name: 'PRODUCTION',
    slug: 'production',
    description: 'End-to-end commercial film, video production, cinematography, editing & VFX.',
    icon: 'Video',
    status: 'ACTIVE',
    featured: true,
    sortOrder: 2,
    seoTitle: 'Commercial Video Production & DP Teams | Brands & Creators',
    seoDescription: 'Hire award-winning commercial directors, cinematographers, and VFX studios.',
    subcategories: [
      { name: 'Production House', slug: 'production-house' },
      { name: 'Video Production', slug: 'video-production' },
      { name: 'Cinematography', slug: 'cinematography' },
      { name: 'Direction', slug: 'direction' },
      { name: 'Video Editing', slug: 'video-editing' },
      { name: 'Reel Editing', slug: 'reel-editing' },
      { name: 'Motion Graphics', slug: 'motion-graphics' },
      { name: 'VFX', slug: 'vfx' },
      { name: 'Drone', slug: 'drone' },
    ],
  },
  {
    name: 'PHOTOGRAPHY',
    slug: 'photography',
    description: 'Commercial, editorial, product, and lifestyle professional photographers.',
    icon: 'Camera',
    status: 'ACTIVE',
    featured: true,
    sortOrder: 3,
    seoTitle: 'Professional Commercial & Fashion Photographers',
    seoDescription: 'Book studio photographers for lookbooks, product shoots, and brand campaigns.',
    subcategories: [
      { name: 'Fashion', slug: 'fashion' },
      { name: 'Product', slug: 'product' },
      { name: 'Food', slug: 'food' },
      { name: 'Commercial', slug: 'commercial' },
      { name: 'Lifestyle', slug: 'lifestyle' },
      { name: 'Event', slug: 'event' },
    ],
  },
  {
    name: 'TALENT',
    slug: 'talent',
    description: 'Professional models, actors, anchors, and voice artists.',
    icon: 'Users',
    status: 'ACTIVE',
    featured: true,
    sortOrder: 4,
    seoTitle: 'Models, Actors & Voiceover Artists',
    seoDescription: 'Hire on-screen and voice talent for ad films, commercials, and brand voiceovers.',
    subcategories: [
      { name: 'Model', slug: 'model' },
      { name: 'Actor', slug: 'actor' },
      { name: 'Child Artist', slug: 'child-artist' },
      { name: 'Anchor', slug: 'anchor' },
      { name: 'Voice Artist', slug: 'voice-artist' },
      { name: 'Presenter', slug: 'presenter' },
    ],
  },
  {
    name: 'DESIGN',
    slug: 'design',
    description: 'Brand identity, UI/UX, illustration, and packaging design studios.',
    icon: 'Palette',
    status: 'ACTIVE',
    featured: false,
    sortOrder: 5,
    seoTitle: 'Brand Identity & Packaging Designers',
    seoDescription: 'World-class graphic designers, 3D packaging specialists, and digital artists.',
    subcategories: [
      { name: 'Graphic Design', slug: 'graphic-design' },
      { name: 'Brand Design', slug: 'brand-design' },
      { name: 'UI/UX', slug: 'ui-ux' },
      { name: 'Illustration', slug: 'illustration' },
      { name: 'Packaging', slug: 'packaging' },
    ],
  },
  {
    name: 'BEAUTY & FASHION',
    slug: 'beauty-fashion',
    description: 'Professional makeup artists, hair stylists, and fashion costume designers.',
    icon: 'Scissors',
    status: 'ACTIVE',
    featured: false,
    sortOrder: 6,
    seoTitle: 'Hair, Makeup & Wardrobe Stylists for Commercial Shoots',
    seoDescription: 'Book celebrity makeup artists and wardrobe stylists for commercial campaigns.',
    subcategories: [
      { name: 'Makeup Artist', slug: 'makeup-artist' },
      { name: 'Hair Stylist', slug: 'hair-stylist' },
      { name: 'Fashion Stylist', slug: 'fashion-stylist' },
      { name: 'Costume Designer', slug: 'costume-designer' },
    ],
  },
  {
    name: 'PERFORMERS',
    slug: 'performers',
    description: 'Dancers, choreographers, dance troupes, and stage performers.',
    icon: 'Activity',
    status: 'ACTIVE',
    featured: false,
    sortOrder: 7,
    seoTitle: 'Choreographers & Dance Performers for Music Videos',
    seoDescription: 'Hire dancers and choreographers for viral hook steps, stage shows, and music videos.',
    subcategories: [
      { name: 'Dancer', slug: 'dancer' },
      { name: 'Choreographer', slug: 'choreographer' },
      { name: 'Dance Group', slug: 'dance-group' },
      { name: 'Performer', slug: 'performer' },
    ],
  },
  {
    name: 'MARKETING',
    slug: 'marketing',
    description: 'Performance marketing, social media growth, SEO, and PR specialists.',
    icon: 'TrendingUp',
    status: 'ACTIVE',
    featured: false,
    sortOrder: 8,
    seoTitle: 'Growth & Performance Marketing Specialists',
    seoDescription: 'Meta ads, Google ads, copywriting, and PR professionals.',
    subcategories: [
      { name: 'Social Media', slug: 'social-media' },
      { name: 'SEO', slug: 'seo' },
      { name: 'Google Ads', slug: 'google-ads' },
      { name: 'Meta Ads', slug: 'meta-ads' },
      { name: 'Content Marketing', slug: 'content-marketing' },
      { name: 'Copywriting', slug: 'copywriting' },
      { name: 'PR', slug: 'pr' },
    ],
  },
  {
    name: 'AGENCIES',
    slug: 'agencies',
    description: 'Full-service digital, influencer, creative, and production agencies.',
    icon: 'Briefcase',
    status: 'ACTIVE',
    featured: true,
    sortOrder: 9,
    seoTitle: 'B2B Creative & Influencer Marketing Agencies',
    seoDescription: 'Partner with top creative agencies for integrated 360 campaigns.',
    subcategories: [
      { name: 'Digital Marketing Agency', slug: 'digital-marketing-agency' },
      { name: 'Social Media Agency', slug: 'social-media-agency' },
      { name: 'Influencer Marketing Agency', slug: 'influencer-marketing-agency' },
      { name: 'Creative Agency', slug: 'creative-agency' },
      { name: 'Production Agency', slug: 'production-agency' },
    ],
  },
  {
    name: 'STUDIOS & RENTALS',
    slug: 'studios-rentals',
    description: 'Photo & video sound stages, camera rigs, lighting, and audio equipment rental.',
    icon: 'Home',
    status: 'ACTIVE',
    featured: true,
    sortOrder: 10,
    seoTitle: 'Photo & Video Sound Stages & Camera Rental Houses',
    seoDescription: 'Book cyclorama studios, sound stages, Red/Arri camera packages, and cinema lighting.',
    subcategories: [
      { name: 'Photo Studio', slug: 'photo-studio' },
      { name: 'Video Studio', slug: 'video-studio' },
      { name: 'Equipment Rental', slug: 'equipment-rental' },
      { name: 'Camera Rental', slug: 'camera-rental' },
      { name: 'Lighting Rental', slug: 'lighting-rental' },
      { name: 'Sound Rental', slug: 'sound-rental' },
    ],
  },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_TAXONOMY);
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    influencers: true,
    production: true,
    photography: true,
  });

  // Modal / Drawer state
  const [modalMode, setModalMode] = useState<'ADD_PARENT' | 'ADD_SUB' | 'EDIT' | null>(null);
  const [targetParentSlug, setTargetParentSlug] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('Sparkles');
  const [formSeoTitle, setFormSeoTitle] = useState('');
  const [formSeoDesc, setFormSeoDesc] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadTree() {
      try {
        const res = await fetch('http://localhost:4000/api/v1/categories/tree');
        if (res.ok) {
          const data = await res.json();
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            setCategories(data.data);
          }
        }
      } catch (err) {
        // Use default taxonomy if API is offline
      }
    }
    loadTree();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleExpand = (slug: string) => {
    setExpandedCats((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const toggleStatus = async (catIndex: number) => {
    const updated = [...categories];
    const current = updated[catIndex];
    current.status = current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setCategories(updated);
    showToast(`Category "${current.name}" is now ${current.status}`);
  };

  const toggleFeatured = (catIndex: number) => {
    const updated = [...categories];
    updated[catIndex].featured = !updated[catIndex].featured;
    setCategories(updated);
    showToast(`Category "${updated[catIndex].name}" featured status toggled.`);
  };

  const moveOrder = (index: number, direction: 'UP' | 'DOWN') => {
    const updated = [...categories];
    if (direction === 'UP' && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'DOWN' && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    // Update sortOrder values
    updated.forEach((c, idx) => (c.sortOrder = idx + 1));
    setCategories(updated);
    showToast('Taxonomy order reordered successfully.');
  };

  const openAddParent = () => {
    setModalMode('ADD_PARENT');
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormIcon('Sparkles');
    setFormSeoTitle('');
    setFormSeoDesc('');
    setFormFeatured(false);
    setFormStatus('ACTIVE');
  };

  const openAddSub = (parentSlug: string) => {
    setModalMode('ADD_SUB');
    setTargetParentSlug(parentSlug);
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormFeatured(false);
    setFormStatus('ACTIVE');
  };

  const openEdit = (cat: Category) => {
    setModalMode('EDIT');
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDesc(cat.description || '');
    setFormIcon(cat.icon || 'Sparkles');
    setFormSeoTitle(cat.seoTitle || '');
    setFormSeoDesc(cat.seoDescription || '');
    setFormFeatured(cat.featured || false);
    setFormStatus(cat.status === 'ARCHIVED' ? 'INACTIVE' : cat.status);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const slugToUse = formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (modalMode === 'ADD_PARENT') {
      const newCat: Category = {
        name: formName.trim().toUpperCase(),
        slug: slugToUse,
        description: formDesc,
        icon: formIcon,
        status: formStatus,
        featured: formFeatured,
        sortOrder: categories.length + 1,
        seoTitle: formSeoTitle || `${formName} | Brands & Creators`,
        seoDescription: formDesc || `Discover top verified ${formName} professionals.`,
        subcategories: [],
      };
      setCategories([...categories, newCat]);
      showToast(`Master category "${newCat.name}" created!`);
    } else if (modalMode === 'ADD_SUB') {
      const updated = categories.map((c) => {
        if (c.slug === targetParentSlug) {
          const newSub: SubCategory = {
            name: formName.trim(),
            slug: slugToUse,
            description: formDesc,
            status: formStatus,
            featured: formFeatured,
          };
          return { ...c, subcategories: [...c.subcategories, newSub] };
        }
        return c;
      });
      setCategories(updated);
      showToast(`Subcategory "${formName}" added to taxonomy.`);
    } else if (modalMode === 'EDIT' && editingCategory) {
      const updated = categories.map((c) => {
        if (c.slug === editingCategory.slug) {
          return {
            ...c,
            name: formName.trim(),
            slug: slugToUse,
            description: formDesc,
            icon: formIcon,
            seoTitle: formSeoTitle,
            seoDescription: formSeoDesc,
            featured: formFeatured,
            status: formStatus,
          };
        }
        return c;
      });
      setCategories(updated);
      showToast(`Category "${formName}" updated successfully.`);
    }

    setModalMode(null);
  };

  const deleteCategory = (slug: string) => {
    if (confirm(`Are you sure you want to delete category "${slug}"?`)) {
      setCategories(categories.filter((c) => c.slug !== slug));
      showToast(`Category "${slug}" removed.`);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchParent = c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
    const matchSub = c.subcategories.some(
      (sub) => sub.name.toLowerCase().includes(q) || sub.slug.toLowerCase().includes(q),
    );
    return matchParent || matchSub;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" />
            Dynamic Taxonomy Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Categories & Subcategories Manager
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin-managed dynamic hierarchy. Add, edit, reorder, and configure SEO for all marketplace disciplines without code edits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCategories(INITIAL_TAXONOMY);
              showToast('Restored default 10-master taxonomy hierarchy.');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Reset Taxonomy
          </button>
          <button
            onClick={openAddParent}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Master Category
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/85 shadow-gemini-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by master category or subcategory name..."
            className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold shrink-0">
          {filteredCategories.length} Master Categories ({filteredCategories.reduce((acc, c) => acc + c.subcategories.length, 0)} Subcategories)
        </div>
      </div>

      {/* Categories Tree View */}
      <div className="space-y-4">
        {filteredCategories.map((cat, idx) => {
          const isExpanded = expandedCats[cat.slug] ?? false;
          return (
            <div
              key={cat.slug}
              className="bg-white rounded-3xl border border-slate-200/85 overflow-hidden shadow-gemini-sm transition-all hover:border-indigo-200"
            >
              {/* Category Header Row */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 via-white to-white">
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={() => toggleExpand(cat.slug)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center text-slate-500 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FolderTree className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">{cat.name}</h3>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">
                        /{cat.slug}
                      </span>
                      {cat.featured && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {/* Reorder Buttons */}
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 mr-1">
                    <button
                      onClick={() => moveOrder(idx, 'UP')}
                      disabled={idx === 0}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:pointer-events-none"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-200" />
                    <button
                      onClick={() => moveOrder(idx, 'DOWN')}
                      disabled={idx === categories.length - 1}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:pointer-events-none"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Featured Toggle */}
                  <button
                    onClick={() => toggleFeatured(idx)}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-colors ${
                      cat.featured
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                    }`}
                    title="Toggle Featured"
                  >
                    <Star className={`w-3.5 h-3.5 ${cat.featured ? 'fill-current' : ''}`} />
                  </button>

                  {/* Status Toggle */}
                  <button
                    onClick={() => toggleStatus(idx)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                      cat.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {cat.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Add Subcategory */}
                  <button
                    onClick={() => openAddSub(cat.slug)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Subcategory
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteCategory(cat.slug)}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Collapsible Subcategory Grid */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/40">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Subcategories ({cat.subcategories.length})
                  </div>

                  {cat.subcategories.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                      {cat.subcategories.map((sub, sIdx) => (
                        <div
                          key={sIdx}
                          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-gemini-sm flex items-center justify-between group hover:border-indigo-300 transition-all"
                        >
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-800 truncate">{sub.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">/{sub.slug}</div>
                          </div>
                          <button
                            onClick={() => {
                              const updated = [...categories];
                              updated[idx].subcategories = updated[idx].subcategories.filter((_, i) => i !== sIdx);
                              setCategories(updated);
                              showToast(`Subcategory "${sub.name}" removed.`);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-2">
                      No subcategories added yet. Click &quot;+ Subcategory&quot; to add one.
                    </div>
                  )}

                  {/* SEO Metadata Preview */}
                  {cat.seoTitle && (
                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-[11px] text-slate-500">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        SEO Meta: <strong className="text-slate-700 font-medium">{cat.seoTitle}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal / Drawer for Add / Edit */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900">
                {modalMode === 'ADD_PARENT' && 'Add Master Creative Category'}
                {modalMode === 'ADD_SUB' && `Add Subcategory to ${targetParentSlug}`}
                {modalMode === 'EDIT' && `Edit Category: ${editingCategory?.name}`}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formSlug || modalMode !== 'EDIT') {
                      setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  placeholder="e.g. CINEMATOGRAPHY"
                  required
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug *</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="cinematography"
                  required
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Short Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="High-end camera operators, directors of photography..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {modalMode !== 'ADD_SUB' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">SEO Title</label>
                      <input
                        type="text"
                        value={formSeoTitle}
                        onChange={(e) => setFormSeoTitle(e.target.value)}
                        placeholder="Best Cinematographers in India"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">SEO Meta Description</label>
                      <input
                        type="text"
                        value={formSeoDesc}
                        onChange={(e) => setFormSeoDesc(e.target.value)}
                        placeholder="Hire top DPs for commercial shoots..."
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formFeatured}
                        onChange={(e) => setFormFeatured(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-700">Feature on Homepage</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formStatus === 'ACTIVE'}
                        onChange={(e) => setFormStatus(e.target.checked ? 'ACTIVE' : 'INACTIVE')}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-700">Active Status</span>
                    </label>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
                >
                  Save to Taxonomy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
