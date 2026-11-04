import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Requirement, RequirementDocument } from './schemas/requirement.schema';
import {
  CreateRequirementDto,
  UpdateRequirementDto,
  RequirementFilterDto,
} from './dto/requirement.dto';
import { RequirementStatus, NotificationType, UserRole } from '@brands-creators/types';
import { BrandProfile, BrandProfileDocument } from '../brands/schemas/brand.schema';
import { CreatorProfile, CreatorProfileDocument } from '../creators/schemas/creator.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { MatchingService } from '../matching/matching.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RequirementsService {
  constructor(
    @InjectModel(Requirement.name)
    private readonly requirementModel: Model<RequirementDocument>,
    @InjectModel(BrandProfile.name)
    private readonly brandProfileModel: Model<BrandProfileDocument>,
    @InjectModel(CreatorProfile.name)
    private readonly creatorProfileModel: Model<CreatorProfileDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly matchingService: MatchingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${randomSuffix}`;
  }

  async create(userId: string, dto: CreateRequirementDto): Promise<any> {
    const brandProfile = await this.brandProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!brandProfile) {
      throw new BadRequestException('You must create a Brand profile before posting a requirement.');
    }

    const slug = dto.slug || this.generateSlug(dto.title);
    const location = dto.location || {
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      isRemote: true,
    };

    // Robust category resolution (handles ObjectId, slug, or category name)
    let resolvedCategoryId: Types.ObjectId | null = null;
    if (Types.ObjectId.isValid(dto.categoryId)) {
      resolvedCategoryId = new Types.ObjectId(dto.categoryId);
    } else {
      const foundCat = await this.categoryModel.findOne({
        $or: [
          { slug: dto.categoryId.toLowerCase() },
          { name: new RegExp(`^${dto.categoryId}$`, 'i') },
        ],
      });
      if (foundCat) {
        resolvedCategoryId = foundCat._id as Types.ObjectId;
      }
    }

    if (!resolvedCategoryId) {
      const defaultCat = await this.categoryModel.findOne({ isActive: true });
      if (defaultCat) {
        resolvedCategoryId = defaultCat._id as Types.ObjectId;
      } else {
        throw new BadRequestException(`Category '${dto.categoryId}' not found`);
      }
    }

    let resolvedSubcategoryId: Types.ObjectId | undefined = undefined;
    if (dto.subcategoryId && Types.ObjectId.isValid(dto.subcategoryId)) {
      resolvedSubcategoryId = new Types.ObjectId(dto.subcategoryId);
    }

    const resolvedSubcategoryIds = (dto.subcategoryIds || [])
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const requirement = new this.requirementModel({
      ...dto,
      location,
      brandId: brandProfile._id,
      categoryId: resolvedCategoryId,
      subcategoryId: resolvedSubcategoryId,
      subcategoryIds: resolvedSubcategoryIds,
      slug,
      status: dto.status || RequirementStatus.PUBLISHED,
      publishedAt: dto.status === RequirementStatus.PUBLISHED ? new Date() : undefined,
      applicationCount: 0,
      featured: false,
    });

    const saved = await requirement.save();

    // Increment active requirements count on brand
    await this.brandProfileModel.findByIdAndUpdate(brandProfile._id, {
      $inc: { activeRequirementsCount: 1 },
    });

    // Notify brand
    await this.notificationsService.create({
      userId,
      type: NotificationType.REQUIREMENT_PUBLISHED,
      title: 'Requirement Published',
      message: `Your opportunity "${saved.title}" is now active in the marketplace.`,
      link: `/requirements/${saved.slug}`,
      metadata: { requirementId: saved._id },
    });

    return saved;
  }

  async findAll(filter: RequirementFilterDto): Promise<any> {
    const query: any = {};

    // Default to published requirements for public listing; ALL returns all statuses
    if (filter.status && (filter.status as string) !== 'ALL') {
      query.status = filter.status;
    } else if (!filter.status) {
      query.status = RequirementStatus.PUBLISHED;
    }

    if (filter.q) {
      const cleanQ = decodeURIComponent(filter.q).replace(/\+/g, ' ').trim();
      const escapedRegex = cleanQ.split(/\s+/).filter(Boolean).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      query.$or = [
        { title: { $regex: escapedRegex, $options: 'i' } },
        { description: { $regex: escapedRegex, $options: 'i' } },
        { requiredSkills: { $in: [new RegExp(escapedRegex, 'i')] } },
      ];
    }

    if (filter.category) {
      query.categoryId = new Types.ObjectId(filter.category);
    }

    if (filter.subcategory) {
      query.subcategoryId = new Types.ObjectId(filter.subcategory);
    }

    if (filter.city) {
      query['location.city'] = { $regex: filter.city, $options: 'i' };
    }

    if (filter.remote !== undefined) {
      query['location.isRemote'] = filter.remote;
    }

    if (filter.minBudget) {
      query['budget.min'] = { $gte: filter.minBudget };
    }

    if (filter.maxBudget) {
      query['budget.max'] = { $lte: filter.maxBudget };
    }

    if (filter.industry) {
      query.targetIndustry = { $regex: filter.industry, $options: 'i' };
    }

    if (filter.platform) {
      query.targetPlatforms = { $in: [new RegExp(filter.platform, 'i')] };
    }

    const page = filter.page || 1;
    const limit = filter.limit || 12;
    const skip = (page - 1) * limit;

    let sortOption: any = { createdAt: -1 };
    if (filter.sort === 'BUDGET_HIGH') sortOption = { 'budget.max': -1 };
    if (filter.sort === 'BUDGET_LOW') sortOption = { 'budget.min': 1 };
    if (filter.sort === 'DEADLINE_SOON') sortOption = { applicationDeadline: 1 };

    const [items, total] = await Promise.all([
      this.requirementModel
        .find(query)
        .populate({
          path: 'brandId',
          select: 'companyName slug logoUrl verificationStatus industry location',
          populate: { path: 'userId', select: 'fullName avatarUrl' },
        })
        .populate('categoryId', 'name slug iconName')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.requirementModel.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySlug(slug: string): Promise<any> {
    const requirement = await this.requirementModel
      .findOne({ slug })
      .populate({
        path: 'brandId',
        select: 'companyName slug logoUrl coverImageUrl description verificationStatus industry location websiteUrl previousCampaigns',
        populate: { path: 'userId', select: 'fullName avatarUrl' },
      })
      .populate('categoryId', 'name slug iconName')
      .lean();

    if (!requirement) {
      throw new NotFoundException(`Requirement with slug "${slug}" not found.`);
    }

    return requirement;
  }

  async findById(id: string): Promise<any> {
    const requirement = await this.requirementModel
      .findById(id)
      .populate('brandId')
      .populate('categoryId')
      .lean();

    if (!requirement) {
      throw new NotFoundException(`Requirement not found.`);
    }

    return requirement;
  }

  async findBrandRequirements(userId: string, status?: string): Promise<any> {
    const brandProfile = await this.brandProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!brandProfile) {
      return { items: [], counts: { all: 0, draft: 0, published: 0, paused: 0, closed: 0, completed: 0 } };
    }

    const query: any = { brandId: brandProfile._id };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const [items, allCounts] = await Promise.all([
      this.requirementModel
        .find(query)
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .lean(),
      this.requirementModel.aggregate([
        { $match: { brandId: brandProfile._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts: Record<string, number> = {
      all: 0,
      draft: 0,
      published: 0,
      paused: 0,
      closed: 0,
      completed: 0,
    };

    allCounts.forEach((c) => {
      const key = (c._id || '').toLowerCase();
      counts[key] = c.count;
      counts.all += c.count;
    });

    return { items, counts, brandProfile };
  }

  async update(userId: string, id: string, dto: UpdateRequirementDto): Promise<any> {
    const brandProfile = await this.brandProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!brandProfile) {
      throw new ForbiddenException('Unauthorized.');
    }

    const requirement = await this.requirementModel.findById(id);
    if (!requirement) {
      throw new NotFoundException('Requirement not found.');
    }

    if (requirement.brandId.toString() !== brandProfile._id.toString()) {
      throw new ForbiddenException('You do not have permission to modify this requirement.');
    }

    Object.assign(requirement, dto);
    return requirement.save();
  }

  async updateStatus(userId: string, id: string, status: RequirementStatus, roles: string[] = []): Promise<any> {
    if (!status || !Object.values(RequirementStatus).includes(status)) {
      throw new BadRequestException(`Invalid requirement status "${status}".`);
    }

    const requirement = await this.requirementModel.findById(id).populate('brandId').exec();
    if (!requirement) {
      throw new NotFoundException('Requirement not found.');
    }

    const isAdmin = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
    if (!isAdmin) {
      const brandProfile = await this.brandProfileModel.findOne({
        userId: new Types.ObjectId(userId),
      });

      if (!brandProfile || requirement.brandId._id.toString() !== brandProfile._id.toString()) {
        throw new ForbiddenException('You do not have permission to modify this requirement.');
      }
    }

    requirement.status = status;
    if (status === RequirementStatus.PUBLISHED && !requirement.publishedAt) {
      requirement.publishedAt = new Date();
    }
    if (status === RequirementStatus.CLOSED || status === RequirementStatus.COMPLETED) {
      requirement.closedAt = new Date();
    }
    return requirement.save();
  }

  async duplicate(userId: string, id: string): Promise<any> {
    const brandProfile = await this.brandProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    const original = await this.requirementModel.findOne({
      _id: new Types.ObjectId(id),
      brandId: brandProfile?._id,
    });

    if (!original) {
      throw new NotFoundException('Original requirement not found.');
    }

    const doc = original.toObject();
    delete (doc as any)._id;
    delete (doc as any).createdAt;
    delete (doc as any).updatedAt;

    const duplicated = new this.requirementModel({
      ...doc,
      title: `${original.title} (Copy)`,
      slug: this.generateSlug(`${original.title}-copy`),
      status: RequirementStatus.DRAFT,
      applicationCount: 0,
    });

    return duplicated.save();
  }

  async getRecommendedForCreator(userId: string): Promise<any> {
    const creator = await this.creatorProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!creator) {
      return this.findAll({ page: 1, limit: 6 });
    }

    const requirements = await this.requirementModel
      .find({ status: RequirementStatus.PUBLISHED })
      .populate({
        path: 'brandId',
        select: 'companyName slug logoUrl verificationStatus industry location',
      })
      .populate('categoryId', 'name slug')
      .lean();

    const scored = requirements.map((req) => {
      const match = this.matchingService.calculateMatch(creator, req);
      return {
        ...req,
        matchScore: match.score,
        matchBreakdown: match.breakdown,
        matchReasons: match.reasons,
      };
    });

    scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return {
      items: scored.slice(0, 8),
      total: scored.length,
    };
  }

  async adminModerate(id: string, status: RequirementStatus, featured?: boolean): Promise<any> {
    const update: any = { status };
    if (featured !== undefined) update.featured = featured;

    const req = await this.requirementModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('brandId');

    if (!req) {
      throw new NotFoundException('Requirement not found.');
    }

    return req;
  }

  async remove(userId: string, id: string, roles: string[] = []): Promise<any> {
    const requirement = await this.requirementModel.findById(id).populate('brandId').exec();
    if (!requirement) {
      throw new NotFoundException('Requirement not found.');
    }

    const isAdmin = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
    const brandUser = (requirement.brandId as any)?.userId?.toString();

    if (!isAdmin && brandUser !== userId) {
      throw new ForbiddenException('You do not have permission to delete this requirement.');
    }

    if (requirement.status === RequirementStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete an already completed requirement.');
    }

    if (requirement.status === RequirementStatus.DRAFT || (requirement.applicationCount || 0) === 0) {
      await this.requirementModel.findByIdAndDelete(id).exec();
      return { success: true, message: 'Requirement successfully deleted.' };
    }

    requirement.status = RequirementStatus.CLOSED;
    await requirement.save();
    return { success: true, message: 'Requirement marked as closed due to existing applicant history.' };
  }
}
