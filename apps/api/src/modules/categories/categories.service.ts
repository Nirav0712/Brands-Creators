import { Injectable, OnModuleInit, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto, CreateSubCategoryDto, ReorderCategoriesDto } from './dto/category.dto';
import { CategoryStatus, CategoryType, UserRole } from '@brands-creators/types';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultCategories();
  }

  async findAll(includeInactive = false, type?: CategoryType) {
    const filter: any = {};
    if (!includeInactive) {
      filter.status = CategoryStatus.ACTIVE;
      filter.isActive = true;
    } else {
      filter.status = { $ne: CategoryStatus.ARCHIVED };
    }

    if (type && type !== CategoryType.ALL) {
      filter.$or = [{ type }, { type: CategoryType.ALL }];
    }

    return this.categoryModel.find(filter).sort({ sortOrder: 1, order: 1, name: 1 }).lean().exec();
  }

  async getCategoryTree(): Promise<any[]> {
    const allCategories = await this.categoryModel
      .find({ status: { $ne: CategoryStatus.ARCHIVED } })
      .sort({ sortOrder: 1, order: 1, name: 1 })
      .lean()
      .exec();

    // Separate root categories and nested children if parentId is used
    const rootCategories = allCategories.filter((cat) => !cat.parentId);
    const childMap = new Map<string, any[]>();

    allCategories.forEach((cat) => {
      if (cat.parentId) {
        const pId = cat.parentId.toString();
        if (!childMap.has(pId)) {
          childMap.set(pId, []);
        }
        childMap.get(pId)!.push(cat);
      }
    });

    return rootCategories.map((root) => ({
      ...root,
      children: childMap.get(root._id.toString()) || [],
    }));
  }

  async findByRole(role: UserRole) {
    return this.categoryModel
      .find({
        isActive: true,
        $or: [
          { supportedProfileTypes: role },
          { supportedProfileTypes: { $size: 0 } },
          { supportedProfileTypes: { $exists: false } },
        ],
      })
      .sort({ sortOrder: 1, order: 1, name: 1 })
      .lean()
      .exec();
  }

  async findOneBySlug(slug: string) {
    const category = await this.categoryModel.findOne({ slug: slug.toLowerCase().trim() }).lean().exec();
    if (!category) {
      throw new NotFoundException(`Category '${slug}' not found`);
    }
    return category;
  }

  async findOneById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid Category ID');
    }
    const category = await this.categoryModel.findById(id).lean().exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug.toLowerCase().trim();
    const existing = await this.categoryModel.findOne({ slug });
    if (existing) {
      throw new ConflictException(`Category with slug '${slug}' already exists`);
    }

    const highestSort = await this.categoryModel
      .findOne({})
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean()
      .exec();

    const nextOrder = (highestSort?.sortOrder || 0) + 1;

    const newCategory = new this.categoryModel({
      ...dto,
      slug,
      parentId: dto.parentId && Types.ObjectId.isValid(dto.parentId) ? new Types.ObjectId(dto.parentId) : null,
      level: dto.parentId ? 1 : (dto.level || 0),
      type: dto.type || CategoryType.ALL,
      status: dto.status || CategoryStatus.ACTIVE,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : nextOrder,
      order: dto.order !== undefined ? dto.order : nextOrder,
      seoTitle: dto.seoTitle || `${dto.name} — Creative Directory | Brands & Creators`,
      seoDescription: dto.seoDescription || dto.description || `Discover top verified ${dto.name} professionals, creators and services on Brands & Creators.`,
    });

    return newCategory.save();
  }

  async update(id: string, dto: UpdateCategoryDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid Category ID');
    }

    if (dto.slug) {
      const slug = dto.slug.toLowerCase().trim();
      const duplicate = await this.categoryModel.findOne({ slug, _id: { $ne: new Types.ObjectId(id) } });
      if (duplicate) {
        throw new ConflictException(`Category with slug '${slug}' already exists`);
      }
      dto.slug = slug;
    }

    const updateData: any = { ...dto };
    if (dto.parentId !== undefined) {
      updateData.parentId = dto.parentId && Types.ObjectId.isValid(dto.parentId) ? new Types.ObjectId(dto.parentId) : null;
      updateData.level = dto.parentId ? 1 : 0;
    }

    const category = await this.categoryModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async addSubCategory(categoryId: string, dto: CreateSubCategoryDto) {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new NotFoundException('Invalid Category ID');
    }

    const category = await this.categoryModel.findById(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const subSlug = dto.slug.toLowerCase().trim();
    if (category.subcategories.some((s) => s.slug === subSlug)) {
      throw new ConflictException(`Subcategory with slug '${subSlug}' already exists in this category`);
    }

    category.subcategories.push({
      name: dto.name,
      slug: subSlug,
      description: dto.description || '',
      iconName: dto.iconName || 'Tag',
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      order: dto.order !== undefined ? dto.order : category.subcategories.length + 1,
      specializations: dto.specializations || [],
    } as any);

    return category.save();
  }

  async updateSubCategory(categoryId: string, subSlug: string, dto: Partial<CreateSubCategoryDto>) {
    const category = await this.categoryModel.findById(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const sub = category.subcategories.find((s) => s.slug === subSlug);
    if (!sub) {
      throw new NotFoundException(`Subcategory '${subSlug}' not found`);
    }

    if (dto.name) sub.name = dto.name;
    if (dto.description !== undefined) sub.description = dto.description;
    if (dto.iconName) sub.iconName = dto.iconName;
    if (dto.isActive !== undefined) sub.isActive = dto.isActive;
    if (dto.order !== undefined) sub.order = dto.order;
    if (dto.specializations) sub.specializations = dto.specializations;

    return category.save();
  }

  async removeSubCategory(categoryId: string, subSlug: string) {
    const category = await this.categoryModel.findById(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.subcategories = category.subcategories.filter((s) => s.slug !== subSlug) as any;
    return category.save();
  }

  async reorder(dto: ReorderCategoriesDto) {
    const bulkOps = dto.items.map((item) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(item.id) },
        update: { $set: { sortOrder: item.sortOrder, order: item.sortOrder } },
      },
    }));

    if (bulkOps.length > 0) {
      await this.categoryModel.bulkWrite(bulkOps);
    }

    return { success: true, message: 'Categories reordered successfully' };
  }

  async archiveCategory(id: string) {
    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      { status: CategoryStatus.ARCHIVED, isActive: false },
      { new: true },
    );
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return { success: true, message: 'Category archived successfully' };
  }

  async deleteCategory(id: string) {
    const res = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!res) {
      throw new NotFoundException('Category not found');
    }
    return { success: true, message: 'Category permanently removed' };
  }

  private async seedDefaultCategories() {
    const count = await this.categoryModel.countDocuments();
    if (count > 0) {
      // Check if we need to sync/ensure all 10 taxonomy categories exist
      const influencerCat = await this.categoryModel.findOne({ slug: 'influencers' });
      if (influencerCat) return; // Already seeded with new structure
    }

    this.logger.log('Seeding Phase 02 initial taxonomy (10 master categories & subcategories)...');

    const taxonomy = [
      {
        name: 'INFLUENCERS',
        slug: 'influencers',
        description: 'Food, Fashion, Beauty, Fitness, Travel, Lifestyle, Tech, and Regional influencers',
        iconName: 'Sparkles',
        type: CategoryType.CREATOR,
        featured: true,
        sortOrder: 1,
        seoTitle: 'Hire Top Social Media Influencers | Brands & Creators',
        seoDescription: 'Discover and collaborate with verified influencers across Food, Fashion, Tech, Lifestyle and Fitness.',
        subcategories: [
          { name: 'Food', slug: 'food', iconName: 'Utensils', specializations: ['Recipe Creators', 'Restaurant Reviews', 'Street Food', 'Baking & Pastry', 'Healthy Cooking'] },
          { name: 'Fashion', slug: 'fashion', iconName: 'Shirt', specializations: ['Streetwear', 'Ethnic & Luxury', 'Sustainable Fashion', 'Styling Lookbooks'] },
          { name: 'Beauty', slug: 'beauty', iconName: 'Sparkles', specializations: ['Skincare Routine', 'Makeup Tutorials', 'Cosmetics Reviews', 'Hair Care'] },
          { name: 'Fitness', slug: 'fitness', iconName: 'Activity', specializations: ['Gym & Bodybuilding', 'Yoga & Pilates', 'Nutrition Coaches', 'Athletics'] },
          { name: 'Travel', slug: 'travel', iconName: 'Compass', specializations: ['Backpacking', 'Luxury Resorts', 'City Guides', 'Adventure & Outdoors'] },
          { name: 'Lifestyle', slug: 'lifestyle', iconName: 'Heart', specializations: ['Daily Vlogs', 'Home Decor & DIY', 'Productivity', 'Self-Improvement'] },
          { name: 'Technology', slug: 'technology', iconName: 'Smartphone', specializations: ['Smartphone Reviews', 'PC & Hardware', 'AI & Software', 'Gadgets'] },
          { name: 'Finance', slug: 'finance', iconName: 'TrendingUp', specializations: ['Personal Finance', 'Stock Investing', 'Crypto & Web3', 'Tax Planning'] },
          { name: 'Parenting', slug: 'parenting', iconName: 'Users', specializations: ['Motherhood', 'Baby Care', 'Child Education', 'Family Travel'] },
          { name: 'Local / City', slug: 'local-city', iconName: 'MapPin', specializations: ['Mumbai Creators', 'Delhi NCR', 'Bangalore Tech', 'Ahmedabad Culture'] },
        ],
      },
      {
        name: 'PRODUCTION',
        slug: 'production',
        description: 'End-to-end video production, direction, cinematography, editing, VFX, and cinema drones',
        iconName: 'Film',
        type: CategoryType.PRODUCTION_TEAM,
        featured: true,
        sortOrder: 2,
        seoTitle: 'Hire Video Production Houses & Cinematographers | Brands & Creators',
        seoDescription: 'Find full-service production companies, directors, colorists, and VFX artists.',
        subcategories: [
          { name: 'Production House', slug: 'production-house', iconName: 'Layers', specializations: ['Commercial Ad Films', 'Music Videos', 'Web Series', 'Corporate Films'] },
          { name: 'Video Production', slug: 'video-production', iconName: 'Video', specializations: ['Ad Shoots', 'Interviews', 'Brand Films', 'Live Events'] },
          { name: 'Cinematography', slug: 'cinematography', iconName: 'Camera', specializations: ['Director of Photography (DP)', 'Lighting Specialists', 'Gimbal Operators'] },
          { name: 'Direction', slug: 'direction', iconName: 'Award', specializations: ['Commercial Directors', 'Documentary Directors', 'Music Video Directors'] },
          { name: 'Video Editing', slug: 'video-editing', iconName: 'Scissors', specializations: ['Long-form YouTube', 'Documentary Pacing', 'Color Grading (DaVinci)', 'Sound Design'] },
          { name: 'Reel Editing', slug: 'reel-editing', iconName: 'Smartphone', specializations: ['Viral Hooks', 'Fast Cuts', 'CapCut & Premiere Pro', 'Dynamic Subtitles'] },
          { name: 'Motion Graphics', slug: 'motion-graphics', iconName: 'PlaySquare', specializations: ['2D Explainer Videos', 'Title Sequences', 'Logo Animations'] },
          { name: 'VFX', slug: 'vfx', iconName: 'Eye', specializations: ['CGI Commercials', 'Green Screen Compositing', '3D Product Rendering'] },
          { name: 'Drone', slug: 'drone', iconName: 'Navigation', specializations: ['FPV Cinematic Drone', 'Heavy Lifter Cinema Drone', 'Real Estate Aerials'] },
        ],
      },
      {
        name: 'PHOTOGRAPHY',
        slug: 'photography',
        description: 'Commercial, editorial, product, fashion, lifestyle, and event photographers',
        iconName: 'Camera',
        type: CategoryType.CREATOR,
        featured: true,
        sortOrder: 3,
        seoTitle: 'Hire Commercial, Fashion & Product Photographers | Brands & Creators',
        seoDescription: 'Connect with expert photographers for e-commerce, lookbooks, food, and high-fashion shoots.',
        subcategories: [
          { name: 'Fashion', slug: 'fashion-photography', iconName: 'Shirt', specializations: ['Lookbooks', 'Editorial Covers', 'High Fashion', 'Runway'] },
          { name: 'Product', slug: 'product-photography', iconName: 'Package', specializations: ['Amazon E-commerce', 'White Background', 'Creative Flat Lays', 'Hero Shots'] },
          { name: 'Food', slug: 'food-photography', iconName: 'Utensils', specializations: ['Menu Photography', 'Beverage & Cocktails', 'Packaging Stills'] },
          { name: 'Commercial', slug: 'commercial-photography', iconName: 'Briefcase', specializations: ['Billboards', 'Brand Campaigns', 'Industrial & Corporate'] },
          { name: 'Lifestyle', slug: 'lifestyle-photography', iconName: 'Sun', specializations: ['Outdoor Lifestyle', 'Family & Portraits', 'Brand Ambassadors'] },
          { name: 'Event', slug: 'event-photography', iconName: 'Calendar', specializations: ['Brand Launches', 'Conferences', 'Music Festivals', 'Weddings'] },
        ],
      },
      {
        name: 'TALENT',
        slug: 'talent',
        description: 'Professional models, actors, anchors, voice artists, and brand presenters',
        iconName: 'UserCheck',
        type: CategoryType.TALENT,
        featured: true,
        sortOrder: 4,
        seoTitle: 'Hire Models, Commercial Actors & Voice Artists | Brands & Creators',
        seoDescription: 'Verified actors, runway models, anchors, and voice talent for films, ads, and events.',
        subcategories: [
          { name: 'Model', slug: 'model', iconName: 'UserCheck', specializations: ['Fashion Runway', 'Commercial Print', 'Fitness Model', 'Parts & Hand Model'] },
          { name: 'Actor', slug: 'actor', iconName: 'Tv', specializations: ['Commercial TV Ads', 'OTT & Feature Films', 'Theatre', 'Improv'] },
          { name: 'Child Artist', slug: 'child-artist', iconName: 'Smile', specializations: ['Kids Fashion', 'Ad Campaigns', 'Acting'] },
          { name: 'Anchor', slug: 'anchor', iconName: 'Mic', specializations: ['Corporate Events', 'Award Shows', 'Live Webcasts'] },
          { name: 'Voice Artist', slug: 'voice-artist', iconName: 'Volume2', specializations: ['Ad Dubbing', 'Audiobooks', 'Radio Jingles', 'IVR & Animation'] },
          { name: 'Presenter', slug: 'presenter', iconName: 'Cast', specializations: ['YouTube Host', 'Product Demonstrator', 'TV Broadcaster'] },
        ],
      },
      {
        name: 'DESIGN',
        slug: 'design',
        description: 'Brand identity, UI/UX, graphic design, custom illustration, and packaging',
        iconName: 'Palette',
        type: CategoryType.CREATOR,
        featured: true,
        sortOrder: 5,
        seoTitle: 'Hire Top Graphic Designers & UI/UX Artists | Brands & Creators',
        seoDescription: 'Design stunning brand logos, mobile apps, marketing assets, and product packaging.',
        subcategories: [
          { name: 'Graphic Design', slug: 'graphic-design', iconName: 'Layout', specializations: ['Social Media Creatives', 'Marketing Posters', 'Pitch Decks', 'Banners'] },
          { name: 'Brand Design', slug: 'brand-design', iconName: 'Feather', specializations: ['Logo & Brand Guidelines', 'Typography', 'Visual Identity Systems'] },
          { name: 'UI/UX', slug: 'ui-ux', iconName: 'Monitor', specializations: ['Mobile App Design', 'Web Design (Figma)', 'Design Systems', 'User Research'] },
          { name: 'Illustration', slug: 'illustration', iconName: 'Edit3', specializations: ['Custom Digital Art', 'Vector Graphics', 'Character Design', 'Mascots'] },
          { name: 'Packaging', slug: 'packaging', iconName: 'Box', specializations: ['FMCG Packaging', 'Box Dielines', 'Label Design', 'Sustainable Pack'] },
        ],
      },
      {
        name: 'BEAUTY & FASHION',
        slug: 'beauty-fashion',
        description: 'Celebrity makeup artists, hair stylists, fashion stylists, and costume designers',
        iconName: 'Scissors',
        type: CategoryType.CREATOR,
        featured: true,
        sortOrder: 6,
        seoTitle: 'Hire Makeup Artists, Hair Stylists & Wardrobe Designers | Brands & Creators',
        seoDescription: 'Top fashion stylists, bridal & commercial makeup artists, and costume experts.',
        subcategories: [
          { name: 'Makeup Artist', slug: 'makeup-artist', iconName: 'Sparkles', specializations: ['Editorial & High Glam', 'Commercial HD Makeup', 'SFX & Prosthetics', 'Bridal'] },
          { name: 'Hair Stylist', slug: 'hair-stylist', iconName: 'Scissors', specializations: ['High Fashion Styling', 'Wig Design', 'Braids & Textures'] },
          { name: 'Fashion Stylist', slug: 'fashion-stylist', iconName: 'ShoppingBag', specializations: ['Celebrity Styling', 'Commercial Wardrobe', 'Personal Shopper'] },
          { name: 'Costume Designer', slug: 'costume-designer', iconName: 'Tag', specializations: ['Period Costumes', 'Sci-Fi & Fantasy', 'Film Productions'] },
        ],
      },
      {
        name: 'PERFORMERS',
        slug: 'performers',
        description: 'Dancers, choreographers, dance groups, and live stage performers',
        iconName: 'Activity',
        type: CategoryType.TALENT,
        featured: false,
        sortOrder: 7,
        seoTitle: 'Hire Dancers, Choreographers & Stage Performers | Brands & Creators',
        seoDescription: 'Find solo dancers, viral dance troupes, choreographers, and stage entertainers.',
        subcategories: [
          { name: 'Dancer', slug: 'dancer', iconName: 'Activity', specializations: ['Hip Hop & Street', 'Contemporary & Ballet', 'Classical & Folk', 'Latin & Ballroom'] },
          { name: 'Choreographer', slug: 'choreographer', iconName: 'Award', specializations: ['Music Video Choreography', 'Ad Hook Steps', 'Wedding & Sangeet', 'Film Routines'] },
          { name: 'Dance Group', slug: 'dance-group', iconName: 'Users', specializations: ['Flash Mobs', 'Stage Crews', 'Viral TikTok Troupes'] },
          { name: 'Performer', slug: 'performer', iconName: 'Star', specializations: ['Acrobats & Aerialists', 'Magicians & Illusionists', 'Live Fire Performers'] },
        ],
      },
      {
        name: 'MARKETING',
        slug: 'marketing',
        description: 'Social media growth, SEO, paid ads (Meta & Google), content marketing, copywriting & PR',
        iconName: 'TrendingUp',
        type: CategoryType.CREATOR,
        featured: true,
        sortOrder: 8,
        seoTitle: 'Hire Performance Marketers, Media Buyers & SEO Experts | Brands & Creators',
        seoDescription: 'Scale your brand with top-tier digital marketers, PPC managers, and copywriters.',
        subcategories: [
          { name: 'Social Media', slug: 'social-media', iconName: 'Share2', specializations: ['Organic Instagram Growth', 'LinkedIn Authority', 'Community Management'] },
          { name: 'SEO', slug: 'seo', iconName: 'Search', specializations: ['Technical SEO', 'E-commerce SEO', 'Programmatic SEO', 'Link Building'] },
          { name: 'Google Ads', slug: 'google-ads', iconName: 'Target', specializations: ['Search Ads', 'Performance Max (PMax)', 'YouTube Video Ads', 'Display Retargeting'] },
          { name: 'Meta Ads', slug: 'meta-ads', iconName: 'Zap', specializations: ['Facebook & IG Direct Response', 'Creative Testing', 'High-ROAS Scaling'] },
          { name: 'Content Marketing', slug: 'content-marketing', iconName: 'FileText', specializations: ['Blog Writing', 'Email Newsletters', 'Thought Leadership'] },
          { name: 'Copywriting', slug: 'copywriting', iconName: 'Edit2', specializations: ['Landing Page Copy', 'Ad Headlines', 'Email Funnels', 'Sales Scripts'] },
          { name: 'PR', slug: 'pr', iconName: 'Radio', specializations: ['Press Releases', 'Forbes/Inc Media Coverage', 'Crisis Management', 'Podcasts'] },
        ],
      },
      {
        name: 'AGENCIES',
        slug: 'agencies',
        description: 'Full-service digital marketing, influencer marketing, creative & production agencies',
        iconName: 'Briefcase',
        type: CategoryType.AGENCY,
        featured: false,
        sortOrder: 9,
        seoTitle: 'Partner with Leading Creative & Influencer Agencies | Brands & Creators',
        seoDescription: 'Find accredited agencies for 360-degree brand campaigns and influencer roster management.',
        subcategories: [
          { name: 'Digital Marketing Agency', slug: 'digital-marketing-agency', iconName: 'Globe', specializations: ['360 Digital Strategy', 'Performance Growth', 'Omnichannel'] },
          { name: 'Social Media Agency', slug: 'social-media-agency', iconName: 'MessageSquare', specializations: ['Social First Campaigns', 'Content Calendars', 'Community Growth'] },
          { name: 'Influencer Marketing Agency', slug: 'influencer-marketing-agency', iconName: 'Users', specializations: ['Creator Rosters', 'End-to-end Gifting', 'Brand Ambassadorships'] },
          { name: 'Creative Agency', slug: 'creative-agency', iconName: 'PenTool', specializations: ['Brand Strategy', 'Cannes-level Storytelling', 'Experiential Marketing'] },
          { name: 'Production Agency', slug: 'production-agency', iconName: 'Video', specializations: ['Commercial Scale Production', 'Global Shoots', 'Broadcast TVC'] },
        ],
      },
      {
        name: 'STUDIOS & RENTALS',
        slug: 'studios-rentals',
        description: 'Photo & video studios, sound stages, camera packages, lighting & audio gear rentals',
        iconName: 'Home',
        type: CategoryType.PRODUCTION_TEAM,
        featured: false,
        sortOrder: 10,
        seoTitle: 'Rent Photo Studios, Cinema Cameras & Lighting Gear | Brands & Creators',
        seoDescription: 'Rent high-end cameras (RED, ARRI, Sony FX), cyclorama studios, and lighting packages.',
        subcategories: [
          { name: 'Photo Studio', slug: 'photo-studio', iconName: 'Camera', specializations: ['Daylight Studios', 'Cyclorama Infinity Walls', 'Color Backdrops'] },
          { name: 'Video Studio', slug: 'video-studio', iconName: 'Video', specializations: ['Soundproof Sound Stages', 'Chroma Green Screen', 'Virtual LED Wall'] },
          { name: 'Equipment Rental', slug: 'equipment-rental', iconName: 'Package', specializations: ['Full Production Kits', 'Grip & Electric (G&E)', 'Generators'] },
          { name: 'Camera Rental', slug: 'camera-rental', iconName: 'Aperture', specializations: ['ARRI Alexa Mini', 'RED V-Raptor', 'Sony FX6/FX3', 'Anamorphic Lenses'] },
          { name: 'Lighting Rental', slug: 'lighting-rental', iconName: 'Sun', specializations: ['Aputure 1200d/600d', 'Nanlite Tubes', 'Profoto Flash Strobe Packs'] },
          { name: 'Sound Rental', slug: 'sound-rental', iconName: 'Mic', specializations: ['Wireless Sennheiser Lavs', 'Schoeps Boom Mics', 'Sound Devices Recorders'] },
        ],
      },
    ];

    for (const item of taxonomy) {
      const existing = await this.categoryModel.findOne({ slug: item.slug });
      if (!existing) {
        await this.categoryModel.create({
          ...item,
          level: 0,
          status: CategoryStatus.ACTIVE,
          isActive: true,
          order: item.sortOrder,
          subcategories: item.subcategories.map((sub, idx) => ({
            ...sub,
            isActive: true,
            order: idx + 1,
          })),
        });
      }
    }

    this.logger.log('Successfully initialized all 10 taxonomy categories & subcategories!');
  }
}

