import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { ReviewReport, ReviewReportDocument } from './schemas/review-report.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import {
  ReviewStatus,
  ReviewReportStatus,
  ProjectStatus,
  ProjectRole,
  ProjectActivityType,
  NotificationType,
  UserRole,
  IReputationSummary,
} from '@brands-creators/types';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReportReviewDto, RespondReviewDto } from './dto/report-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(ReviewReport.name)
    private readonly reportModel: Model<ReviewReportDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel('CreatorProfile')
    private readonly creatorModel: Model<any>,
    @InjectModel('BrandProfile')
    private readonly brandModel: Model<any>,
    private readonly notificationsService: NotificationsService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Helper to recalculate and sync averageRating and reviewCount on Creator & Brand profiles
   */
  async syncUserRating(userId: Types.ObjectId | string): Promise<void> {
    const uObjId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    const publishedReviews = await this.reviewModel.find({
      revieweeId: uObjId,
      status: ReviewStatus.PUBLISHED,
    });

    const totalReviews = publishedReviews.length;
    let averageRating = 0;
    if (totalReviews > 0) {
      const sum = publishedReviews.reduce((acc, r) => acc + r.rating, 0);
      averageRating = Math.round((sum / totalReviews) * 10) / 10;
    }

    await Promise.all([
      this.creatorModel.updateOne(
        { userId: uObjId },
        { averageRating, reviewCount: totalReviews },
      ),
      this.brandModel.updateOne(
        { userId: uObjId },
        { averageRating, reviewCount: totalReviews },
      ),
    ]);
  }

  /**
   * Submit two-way review for a completed project
   */
  async createProjectReview(
    projectId: string,
    dto: CreateReviewDto,
    requestingUser: any,
  ): Promise<ReviewDocument> {
    const reqUserId = (requestingUser.userId || requestingUser._id?.toString() || requestingUser.id).toString();
    const userRole = requestingUser.roles?.[0] || UserRole.BRAND;

    const project = await this.projectsService.verifyProjectAccess(projectId, reqUserId, userRole);

    // Rule: Reviews can ONLY be submitted for completed projects
    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException('Reviews can only be submitted for completed projects');
    }

    const isBrand =
      project.brandId.toString() === reqUserId ||
      project.participants?.some((p) => p.userId.toString() === reqUserId && (p.role === ProjectRole.OWNER || p.role === ProjectRole.CLIENT));
    const isProfessional =
      project.professionalId.toString() === reqUserId ||
      project.participants?.some((p) => p.userId.toString() === reqUserId && p.role === ProjectRole.PROFESSIONAL);

    if (!isBrand && !isProfessional) {
      throw new ForbiddenException('Only project participants can submit a review');
    }

    // Determine target reviewee
    const reviewerId = new Types.ObjectId(reqUserId);
    const revieweeId = isBrand ? project.professionalId : project.brandId;
    const reviewerRole = isBrand ? UserRole.BRAND : UserRole.CREATOR;

    // Rule: Self review rejected
    if (reviewerId.toString() === revieweeId.toString()) {
      throw new BadRequestException('You cannot review yourself');
    }

    // Rule: Duplicate review rejected
    const existing = await this.reviewModel.findOne({
      projectId: project._id,
      reviewerId,
      revieweeId,
    });
    if (existing) {
      throw new ConflictException('You have already submitted a review for this project');
    }

    // Rating validation
    if (dto.rating < 1 || dto.rating > 5 || isNaN(dto.rating)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const comment = dto.comment || dto.feedback || '';
    if (!comment.trim()) {
      throw new BadRequestException('Review comment or feedback is required');
    }

    const review = new this.reviewModel({
      projectId: project._id,
      reviewerId,
      revieweeId,
      reviewerRole,
      rating: dto.rating,
      title: dto.title,
      comment,
      criteria: dto.criteria || {},
      verifiedProject: true, // Server-enforced verified badge
      status: ReviewStatus.PUBLISHED,
    });

    const savedReview = await review.save();

    // Sync rating aggregates
    await this.syncUserRating(revieweeId);

    // Log Project Activity
    await this.projectsService.logActivity(
      project._id as Types.ObjectId,
      reviewerId,
      ProjectActivityType.PROJECT_STATUS_CHANGED,
      `Verified review submitted (${dto.rating}★) by ${reviewerRole}`,
      { reviewId: savedReview._id, rating: dto.rating },
    );

    // Send Notification to Reviewee
    await this.notificationsService.create({
      userId: revieweeId,
      type: NotificationType.REVIEW_RECEIVED,
      title: 'New Verified Review Received',
      message: `${isBrand ? 'Brand' : 'Creator'} left a ${dto.rating}★ review on project "${project.title}".`,
      link: `/projects/${project._id}`,
      metadata: { projectId: project._id, reviewId: savedReview._id, rating: dto.rating },
    });

    return savedReview;
  }

  /**
   * Update own review text or rating
   */
  async updateReview(
    reviewId: string,
    dto: UpdateReviewDto,
    requestingUser: any,
  ): Promise<ReviewDocument> {
    const reqUserId = (requestingUser.userId || requestingUser._id?.toString() || requestingUser.id).toString();

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewerId.toString() !== reqUserId) {
      throw new ForbiddenException('You can only edit your own review');
    }

    if (dto.rating !== undefined) {
      if (dto.rating < 1 || dto.rating > 5 || isNaN(dto.rating)) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }
      review.rating = dto.rating;
    }
    if (dto.title !== undefined) review.title = dto.title;
    if (dto.comment !== undefined) review.comment = dto.comment;
    if (dto.criteria !== undefined) review.criteria = dto.criteria as any;

    review.editedAt = new Date();
    const updated = await review.save();

    await this.syncUserRating(review.revieweeId);
    return updated;
  }

  /**
   * Report an inappropriate review to moderation
   */
  async reportReview(
    reviewId: string,
    dto: ReportReviewDto,
    requestingUser: any,
  ): Promise<ReviewReportDocument> {
    const reqUserId = (requestingUser.userId || requestingUser._id?.toString() || requestingUser.id).toString();

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const report = new this.reportModel({
      reviewId: review._id,
      reportedBy: new Types.ObjectId(reqUserId),
      reason: dto.reason,
      description: dto.description,
      status: ReviewReportStatus.PENDING,
    });

    return report.save();
  }

  /**
   * Reviewee response to public review
   */
  async respondReview(
    reviewId: string,
    dto: RespondReviewDto,
    requestingUser: any,
  ): Promise<ReviewDocument> {
    const reqUserId = (requestingUser.userId || requestingUser._id?.toString() || requestingUser.id).toString();

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.revieweeId.toString() !== reqUserId) {
      throw new ForbiddenException('Only the review recipient can respond to this review');
    }

    review.responseBy = new Types.ObjectId(reqUserId);
    review.responseText = dto.responseText;
    review.responseAt = new Date();

    return review.save();
  }

  /**
   * Admin moderation: update review status (PUBLISHED, HIDDEN, REMOVED)
   */
  async adminUpdateStatus(
    reviewId: string,
    status: ReviewStatus,
    requestingUser: any,
  ): Promise<ReviewDocument> {
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);
    if (!isAdmin) {
      throw new ForbiddenException('Admin permissions required');
    }

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.status = status;
    const saved = await review.save();

    // Re-sync rating aggregates (excludes HIDDEN or REMOVED reviews)
    await this.syncUserRating(review.revieweeId);

    return saved;
  }

  /**
   * Get deterministic reputation summary for a user
   */
  async getReputationSummary(userId: string): Promise<IReputationSummary> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }
    const uObjId = new Types.ObjectId(userId);

    const [publishedReviews, completedProjectsCount] = await Promise.all([
      this.reviewModel.find({
        revieweeId: uObjId,
        status: ReviewStatus.PUBLISHED,
      }),
      this.projectModel.countDocuments({
        $or: [{ professionalId: uObjId }, { brandId: uObjId }],
        status: ProjectStatus.COMPLETED,
      }),
    ]);

    const totalReviews = publishedReviews.length;
    const verifiedReviews = publishedReviews.filter((r) => r.verifiedProject).length;

    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;

    const criteriaSum = { quality: 0, communication: 0, timeliness: 0, professionalism: 0, value: 0 };
    const criteriaCount = { quality: 0, communication: 0, timeliness: 0, professionalism: 0, value: 0 };

    for (const r of publishedReviews) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
      totalScore += r.rating;

      if (r.criteria) {
        if (r.criteria.quality) { criteriaSum.quality += r.criteria.quality; criteriaCount.quality++; }
        if (r.criteria.communication) { criteriaSum.communication += r.criteria.communication; criteriaCount.communication++; }
        if (r.criteria.timeliness) { criteriaSum.timeliness += r.criteria.timeliness; criteriaCount.timeliness++; }
        if (r.criteria.professionalism) { criteriaSum.professionalism += r.criteria.professionalism; criteriaCount.professionalism++; }
        if (r.criteria.value) { criteriaSum.value += r.criteria.value; criteriaCount.value++; }
      }
    }

    const averageRating = totalReviews > 0 ? Math.round((totalScore / totalReviews) * 10) / 10 : 0;

    const criteriaBreakdown = {
      quality: criteriaCount.quality > 0 ? Math.round((criteriaSum.quality / criteriaCount.quality) * 10) / 10 : 5.0,
      communication: criteriaCount.communication > 0 ? Math.round((criteriaSum.communication / criteriaCount.communication) * 10) / 10 : 5.0,
      timeliness: criteriaCount.timeliness > 0 ? Math.round((criteriaSum.timeliness / criteriaCount.timeliness) * 10) / 10 : 5.0,
      professionalism: criteriaCount.professionalism > 0 ? Math.round((criteriaSum.professionalism / criteriaCount.professionalism) * 10) / 10 : 5.0,
      value: criteriaCount.value > 0 ? Math.round((criteriaSum.value / criteriaCount.value) * 10) / 10 : 5.0,
    };

    return {
      userId,
      averageRating,
      totalReviews,
      verifiedReviews,
      completedProjects: completedProjectsCount,
      criteriaBreakdown,
      ratingDistribution: ratingDistribution as any,
    };
  }

  /**
   * Get public reviews for a profile/user (sanitizes reviewer email to protect privacy)
   * Supports querying by direct user ObjectId or profile slug
   */
  async getPublicReviews(userId: string, query?: QueryReviewsDto): Promise<any> {
    let resolvedUserId = userId;

    if (!Types.ObjectId.isValid(userId)) {
      // Attempt lookup by creator slug or brand slug
      const [creator, brand]: [any, any] = await Promise.all([
        this.creatorModel.findOne({ slug: userId }).lean(),
        this.brandModel.findOne({ slug: userId }).lean(),
      ]);

      if (creator?.userId) {
        resolvedUserId = creator.userId.toString();
      } else if (brand?.userId) {
        resolvedUserId = brand.userId.toString();
      } else {
        const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
        return { items: [], total: 0, page: 1, limit, totalPages: 0 };
      }
    }

    const uObjId = new Types.ObjectId(resolvedUserId);

    const filter: any = {
      revieweeId: uObjId,
      status: ReviewStatus.PUBLISHED,
    };

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate('reviewerId', 'fullName avatarUrl username')
        .populate('projectId', 'title projectNumber slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reviewModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get reviews for a specific project
   */
  async getProjectReviews(projectId: string, requestingUser: any): Promise<any> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(projectId, reqUserId, requestingUser.roles?.[0]);

    return this.reviewModel
      .find({ projectId: project._id })
      .populate('reviewerId', 'fullName email avatarUrl username')
      .populate('revieweeId', 'fullName email avatarUrl username')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Admin list all reviews with filter & pagination
   */
  async adminListReviews(query: QueryReviewsDto, requestingUser: any): Promise<any> {
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);
    if (!isAdmin) {
      throw new ForbiddenException('Admin permissions required');
    }

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.userId && Types.ObjectId.isValid(query.userId)) filter.revieweeId = new Types.ObjectId(query.userId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate('reviewerId', 'fullName email username avatarUrl')
        .populate('revieweeId', 'fullName email username avatarUrl')
        .populate('projectId', 'title projectNumber slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reviewModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin list review moderation reports
   */
  async adminListReports(requestingUser: any): Promise<any> {
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);
    if (!isAdmin) {
      throw new ForbiddenException('Admin permissions required');
    }

    return this.reportModel
      .find()
      .populate({
        path: 'reviewId',
        populate: [
          { path: 'reviewerId', select: 'fullName email' },
          { path: 'revieweeId', select: 'fullName email' },
        ],
      })
      .populate('reportedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Admin resolve review report
   */
  async adminResolveReport(reportId: string, status: ReviewReportStatus, requestingUser: any): Promise<any> {
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);
    if (!isAdmin) {
      throw new ForbiddenException('Admin permissions required');
    }

    return this.reportModel.findByIdAndUpdate(
      reportId,
      { status, resolvedBy: new Types.ObjectId(requestingUser.userId || requestingUser.id), resolvedAt: new Date() },
      { new: true },
    );
  }
}
