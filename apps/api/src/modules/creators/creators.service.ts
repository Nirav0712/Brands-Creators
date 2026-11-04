import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatorProfile, CreatorProfileDocument } from './schemas/creator.schema';
import { CreatorFilterDto, UpdateCreatorProfileDto, AddPortfolioItemDto, AddCollaborationDto } from './dto/creator.dto';
import {
  UserRole,
  VerificationStatus,
  ProfileVisibility,
  IProfileCompletionItem,
  IProfileCompletionResult,
} from '@brands-creators/types';
import { SocialAccount, SocialAccountDocument } from '../social/schemas/social-account.schema';

@Injectable()
export class CreatorsService {
  constructor(
    @InjectModel(CreatorProfile.name) private readonly creatorModel: Model<CreatorProfileDocument>,
    @InjectModel(SocialAccount.name) private readonly socialModel: Model<SocialAccountDocument>,
  ) {}

  private sanitizePublicLocation(profile: any) {
    if (!profile) return profile;
    if (profile.location && !profile.location.isPublicAddress) {
      const sanitized = { ...profile.location };
      delete sanitized.addressLine1;
      delete sanitized.addressLine2;
      delete sanitized.landmark;
      profile.location = sanitized;
    }
    return profile;
  }

  calculateCompletion(profile: any, user?: any, socialCount = 0): IProfileCompletionResult {
    const items: IProfileCompletionItem[] = [
      {
        key: 'avatar',
        label: 'Profile Photo / Avatar',
        completed: Boolean(user?.avatarUrl || profile?.coverImageUrl),
        weight: 10,
        tip: 'Upload a high-resolution professional headshot.',
      },
      {
        key: 'coverImage',
        label: 'Cover Banner Image',
        completed: Boolean(profile?.coverImageUrl),
        weight: 5,
        tip: 'Add a banner to showcase your brand aesthetics.',
      },
      {
        key: 'headline_bio',
        label: 'Professional Headline & Bio',
        completed: Boolean(profile?.headline && profile?.bio && profile.bio.length >= 20),
        weight: 10,
        tip: 'Craft a punchy headline and 2-3 sentence overview.',
      },
      {
        key: 'about',
        label: 'Detailed About & Story',
        completed: Boolean(profile?.about && profile.about.length >= 50),
        weight: 10,
        tip: 'Write a comprehensive story about your experience and process.',
      },
      {
        key: 'category_skills',
        label: 'Category & Skills',
        completed: Boolean(profile?.primaryCategoryId && profile?.skills?.length >= 3),
        weight: 15,
        tip: 'Select your primary category and add at least 3 relevant skills.',
      },
      {
        key: 'location_areas',
        label: 'Location & Service Areas',
        completed: Boolean(profile?.location?.city && (profile?.serviceAreas?.length > 0 || profile?.serviceMode)),
        weight: 10,
        tip: 'Specify your base city and remote/on-site service areas.',
      },
      {
        key: 'services_pricing',
        label: 'Services & Pricing',
        completed: Boolean(profile?.isCustomQuoteOnly || (profile?.services?.length > 0 || profile?.startingPrice > 0)),
        weight: 10,
        tip: 'Add at least 1 service package or set starting rates.',
      },
      {
        key: 'portfolio_1',
        label: 'Portfolio Showcase (1+ items)',
        completed: Boolean(profile?.portfolio?.length >= 1),
        weight: 15,
        tip: 'Add at least 1 portfolio project or video reel.',
      },
      {
        key: 'portfolio_rich',
        label: 'Rich Portfolio (3+ items)',
        completed: Boolean(profile?.portfolio?.length >= 3),
        weight: 5,
        tip: 'Add 3 or more projects to stand out to brand scouts.',
      },
      {
        key: 'social_account',
        label: 'Social Media Account',
        completed: Boolean(socialCount > 0),
        weight: 5,
        tip: 'Link your Instagram, YouTube, or portfolio website.',
      },
      {
        key: 'collaborations',
        label: 'Previous Brand Work',
        completed: Boolean(profile?.brandCollaborations?.length > 0),
        weight: 5,
        tip: 'Add past brands you have collaborated with.',
      },
    ];

    const score = items.reduce((acc, item) => (item.completed ? acc + item.weight : acc), 0);
    const recommendations = items.filter((i) => !i.completed).map((i) => i.tip || i.label);

    return {
      score: Math.min(100, score),
      isComplete: score >= 80,
      items,
      recommendations,
    };
  }

  async findAll(filter: CreatorFilterDto) {
    const query: any = {};

    // Default visibility is PUBLISHED unless filtering specifically (e.g. by admin)
    if (filter.visibilityStatus) {
      query.visibilityStatus = filter.visibilityStatus;
    } else {
      query.visibilityStatus = ProfileVisibility.PUBLISHED;
    }

    if (filter.category) {
      if (Types.ObjectId.isValid(filter.category)) {
        query.$or = [
          { primaryCategoryId: new Types.ObjectId(filter.category) },
          { additionalCategoryIds: new Types.ObjectId(filter.category) },
        ];
      }
    }

    if (filter.subcategory && Types.ObjectId.isValid(filter.subcategory)) {
      query.subcategoryIds = new Types.ObjectId(filter.subcategory);
    }

    if (filter.city) {
      query['location.city'] = { $regex: new RegExp(filter.city, 'i') };
    }

    if (filter.serviceArea) {
      query.$or = [
        { serviceAreas: { $regex: new RegExp(filter.serviceArea, 'i') } },
        { 'location.city': { $regex: new RegExp(filter.serviceArea, 'i') } },
      ];
    }

    if (filter.serviceMode) {
      query.serviceMode = filter.serviceMode;
    }

    if (filter.availability) {
      query.availability = filter.availability;
    }

    if (filter.pricingModel) {
      query.pricingModel = filter.pricingModel;
    }

    if (filter.experienceLevel) {
      query.experienceLevel = filter.experienceLevel;
    }

    if (filter.featured !== undefined) {
      query.featured = filter.featured;
    }

    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      query.startingPrice = {};
      if (filter.minPrice !== undefined) query.startingPrice.$gte = Number(filter.minPrice);
      if (filter.maxPrice !== undefined) query.startingPrice.$lte = Number(filter.maxPrice);
    }

    if (filter.minRating !== undefined) {
      query.averageRating = { $gte: Number(filter.minRating) };
    }

    if (filter.skills) {
      const skillList = filter.skills.split(',').map((s) => s.trim());
      query.skills = { $in: skillList.map((s) => new RegExp(s, 'i')) };
    }

    if (filter.verificationStatus) {
      query.verificationStatus = filter.verificationStatus;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      query.$or = [
        { headline: searchRegex },
        { bio: searchRegex },
        { about: searchRegex },
        { skills: searchRegex },
        { 'location.city': searchRegex },
        { serviceAreas: searchRegex },
      ];
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filter.limit) || 12));
    const skip = (page - 1) * limit;

    const sortOptions: any = {};
    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;
    sortOptions[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      this.creatorModel
        .find(query)
        .populate('userId', 'fullName username email avatarUrl')
        .populate('primaryCategoryId', 'name slug iconName')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.creatorModel.countDocuments(query),
    ]);

    const sanitizedItems = items.map((item) => this.sanitizePublicLocation(item));

    return {
      data: sanitizedItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string): Promise<any> {
    const query: any = Types.ObjectId.isValid(slug)
      ? { $or: [{ slug: slug.toLowerCase() }, { _id: new Types.ObjectId(slug) }] }
      : { slug: slug.toLowerCase() };

    const creator = await this.creatorModel
      .findOne(query)
      .populate('userId', 'fullName username email avatarUrl phone createdAt')
      .populate('primaryCategoryId', 'name slug iconName subcategories')
      .populate('additionalCategoryIds', 'name slug iconName')
      .lean()
      .exec();

    if (!creator) {
      throw new NotFoundException(`Creator profile '${slug}' not found`);
    }

    // Get social accounts for user
    const socialAccounts = await this.socialModel
      .find({ userId: (creator.userId as any)?._id || creator.userId })
      .lean()
      .exec();

    const completion = this.calculateCompletion(creator, creator.userId, socialAccounts.length);
    const sanitizedCreator = this.sanitizePublicLocation(creator);

    return {
      ...sanitizedCreator,
      socialAccounts,
      completion,
    };
  }

  async findByUserId(userId: string): Promise<any> {
    const creator = await this.creatorModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'fullName username email avatarUrl phone')
      .populate('primaryCategoryId', 'name slug iconName subcategories')
      .populate('additionalCategoryIds', 'name slug iconName')
      .lean()
      .exec();

    if (!creator) {
      return null;
    }

    const socialAccounts = await this.socialModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    const completion = this.calculateCompletion(creator, creator.userId, socialAccounts.length);

    return {
      ...creator,
      socialAccounts,
      completion,
    };
  }


  async saveDraft(userId: string, dto: Partial<UpdateCreatorProfileDto>) {
    let creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!creator) {
      // Generate slug from user or fallback
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedSlug = `creator-${randomSuffix}`;

      creator = new this.creatorModel({
        userId: new Types.ObjectId(userId),
        slug: generatedSlug,
        headline: dto.headline || 'Creative Professional',
        bio: dto.bio || '',
        primaryCategoryId: dto.primaryCategoryId && Types.ObjectId.isValid(dto.primaryCategoryId) ? new Types.ObjectId(dto.primaryCategoryId) : undefined,
        location: dto.location || { city: 'Mumbai', country: 'India' },
        visibilityStatus: ProfileVisibility.DRAFT,
      });
    }

    Object.assign(creator, dto);

    if (dto.primaryCategoryId && Types.ObjectId.isValid(dto.primaryCategoryId)) {
      creator.primaryCategoryId = new Types.ObjectId(dto.primaryCategoryId) as any;
    }

    if (dto.additionalCategoryIds && Array.isArray(dto.additionalCategoryIds)) {
      creator.additionalCategoryIds = dto.additionalCategoryIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id)) as any;
    }

    // Recalculate completion score
    const socialAccounts = await this.socialModel.find({ userId: new Types.ObjectId(userId) }).lean().exec();
    const completion = this.calculateCompletion(creator.toObject(), null, socialAccounts.length);
    creator.completionPercentage = completion.score;
    creator.completionChecklist = completion.items as any;

    return creator.save();
  }

  async updateProfile(userId: string, dto: UpdateCreatorProfileDto) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found for this user');
    }

    Object.assign(creator, dto);

    if (dto.primaryCategoryId && Types.ObjectId.isValid(dto.primaryCategoryId)) {
      creator.primaryCategoryId = new Types.ObjectId(dto.primaryCategoryId) as any;
    }

    if (dto.additionalCategoryIds && Array.isArray(dto.additionalCategoryIds)) {
      creator.additionalCategoryIds = dto.additionalCategoryIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id)) as any;
    }

    const socialAccounts = await this.socialModel.find({ userId: new Types.ObjectId(userId) }).lean().exec();
    const completion = this.calculateCompletion(creator.toObject(), null, socialAccounts.length);
    creator.completionPercentage = completion.score;
    creator.completionChecklist = completion.items as any;

    return creator.save();
  }

  async publishProfile(userId: string) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    creator.visibilityStatus = ProfileVisibility.PUBLISHED;
    return creator.save();
  }

  async pauseProfile(userId: string) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    creator.visibilityStatus = ProfileVisibility.PAUSED;
    return creator.save();
  }

  async addPortfolioItem(userId: string, dto: AddPortfolioItemDto) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const newItem = {
      ...dto,
      _id: new Types.ObjectId(),
      sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : creator.portfolio.length,
    };

    creator.portfolio.push(newItem as any);

    // Update completion
    const socialAccounts = await this.socialModel.find({ userId: new Types.ObjectId(userId) }).lean().exec();
    const completion = this.calculateCompletion(creator.toObject(), null, socialAccounts.length);
    creator.completionPercentage = completion.score;

    return creator.save();
  }

  async updatePortfolioItem(userId: string, itemId: string, dto: Partial<AddPortfolioItemDto>) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const itemIndex = creator.portfolio.findIndex((p: any) => p._id?.toString() === itemId);
    if (itemIndex === -1) {
      throw new NotFoundException('Portfolio item not found');
    }

    Object.assign(creator.portfolio[itemIndex], dto);
    return creator.save();
  }

  async removePortfolioItem(userId: string, itemId: string) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    creator.portfolio = creator.portfolio.filter((p: any) => p._id?.toString() !== itemId) as any;
    return creator.save();
  }

  async reorderPortfolio(userId: string, itemIds: string[]) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const portfolioMap = new Map(creator.portfolio.map((item: any) => [item._id.toString(), item]));
    const reordered: any[] = [];

    itemIds.forEach((id, idx) => {
      const item = portfolioMap.get(id);
      if (item) {
        item.sortOrder = idx;
        reordered.push(item);
        portfolioMap.delete(id);
      }
    });

    // Add any items not in the list to the end
    portfolioMap.forEach((item: any) => {
      item.sortOrder = reordered.length;
      reordered.push(item);
    });

    creator.portfolio = reordered;
    return creator.save();
  }

  async addCollaboration(userId: string, dto: AddCollaborationDto) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    creator.brandCollaborations.push(dto as any);
    return creator.save();
  }

  async removeCollaboration(userId: string, collabIndexOrId: string) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    creator.brandCollaborations = creator.brandCollaborations.filter(
      (c: any) => (c._id ? c._id.toString() !== collabIndexOrId : true),
    ) as any;
    return creator.save();
  }

  // Admin Moderation Methods
  async updateVerification(creatorId: string, status: VerificationStatus) {
    const update: any = { verificationStatus: status };
    if (status === VerificationStatus.VERIFIED) {
      update.verifiedAt = new Date();
    }
    return this.creatorModel.findByIdAndUpdate(creatorId, update, { new: true });
  }

  async suspendProfile(creatorId: string) {
    const profile = await this.creatorModel.findByIdAndUpdate(
      creatorId,
      { visibilityStatus: ProfileVisibility.SUSPENDED },
      { new: true },
    );
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }
    return profile;
  }

  async restoreProfile(creatorId: string) {
    const profile = await this.creatorModel.findByIdAndUpdate(
      creatorId,
      { visibilityStatus: ProfileVisibility.PUBLISHED },
      { new: true },
    );
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }
    return profile;
  }

  async toggleFeatured(creatorId: string) {
    const profile = await this.creatorModel.findById(creatorId);
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }
    profile.featured = !profile.featured;
    return profile.save();
  }

  async findNearby(params: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    category?: string;
    city?: string;
    limit?: number;
  }) {
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
    const radiusKm = Number(params.radiusKm) || 25;

    const query: any = {
      visibilityStatus: ProfileVisibility.PUBLISHED,
    };

    if (params.category && Types.ObjectId.isValid(params.category)) {
      query.primaryCategoryId = new Types.ObjectId(params.category);
    }

    if (params.lat !== undefined && params.lng !== undefined && !isNaN(params.lat) && !isNaN(params.lng)) {
      if (params.lat < -90 || params.lat > 90) {
        throw new BadRequestException('Latitude must be between -90 and 90 degrees.');
      }
      if (params.lng < -180 || params.lng > 180) {
        throw new BadRequestException('Longitude must be between -180 and 180 degrees.');
      }
      if (radiusKm <= 0 || radiusKm > 1000) {
        throw new BadRequestException('radiusKm must be positive and at most 1000 km.');
      }
      // 1 radian = 6378.1 km
      const radiusInRadians = radiusKm / 6378.1;
      query['location.geoPoint'] = {
        $geoWithin: {
          $centerSphere: [[Number(params.lng), Number(params.lat)], radiusInRadians],
        },
      };
    } else if (params.city) {
      query['location.city'] = new RegExp(`^${params.city.trim()}$`, 'i');
    }

    const items = await this.creatorModel
      .find(query)
      .populate('userId', 'fullName avatarUrl username email')
      .populate('primaryCategoryId', 'name slug')
      .limit(limit)
      .lean()
      .exec();

    return items.map((item) => this.sanitizePublicLocation(item));
  }
}

