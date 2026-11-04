import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatorProfile, CreatorProfileDocument } from '../creators/schemas/creator.schema';
import { BrandProfile, BrandProfileDocument } from '../brands/schemas/brand.schema';
import { ProductionTeamProfile, ProductionTeamProfileDocument } from '../production-teams/schemas/production-team.schema';
import { Requirement, RequirementDocument } from '../requirements/schemas/requirement.schema';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { SocialAccount, SocialAccountDocument } from '../social/schemas/social-account.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditAction, VerificationStatus, RequirementStatus, NotificationType } from '@brands-creators/types';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CreatorProfile.name) private readonly creatorModel: Model<CreatorProfileDocument>,
    @InjectModel(BrandProfile.name) private readonly brandModel: Model<BrandProfileDocument>,
    @InjectModel(ProductionTeamProfile.name)
    private readonly prodModel: Model<ProductionTeamProfileDocument>,
    @InjectModel(Requirement.name) private readonly reqModel: Model<RequirementDocument>,
    @InjectModel(Application.name) private readonly appModel: Model<ApplicationDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(SocialAccount.name) private readonly socialModel: Model<SocialAccountDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDashboardMetrics() {
    const [
      totalUsers,
      totalCreators,
      totalBrands,
      totalProductionTeams,
      activeRequirements,
      totalApplications,
      totalCategories,
      pendingVerifications,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.creatorModel.countDocuments(),
      this.brandModel.countDocuments(),
      this.prodModel.countDocuments(),
      this.reqModel.countDocuments({ status: RequirementStatus.PUBLISHED }),
      this.appModel.countDocuments(),
      this.categoryModel.countDocuments({ isActive: true }),
      this.creatorModel.countDocuments({ verificationStatus: VerificationStatus.PENDING }),
    ]);

    return {
      totalUsers,
      totalCreators,
      totalBrands,
      totalProductionTeams,
      activeRequirements,
      totalApplications,
      totalCategories,
      pendingVerifications,
      revenueMetrics: {
        totalVolume: 2450000,
        platformEarnings: 245000,
        currency: 'INR',
      },
    };
  }

  async getVerificationQueue(): Promise<any[]> {
    const creators = await this.creatorModel
      .find({ verificationStatus: { $in: [VerificationStatus.PENDING, VerificationStatus.UNVERIFIED] } })
      .populate('userId', 'fullName username email avatarUrl createdAt phone')
      .populate('primaryCategoryId', 'name slug')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    // Query and attach connected social accounts
    const creatorUserIds = creators.map((c) => (c.userId as any)?._id || c.userId).filter(Boolean);
    const socialAccounts = await this.socialModel
      .find({ userId: { $in: creatorUserIds } })
      .select('-accessToken -refreshToken')
      .lean()
      .exec();

    const accountsByUser = new Map<string, any[]>();
    for (const acc of socialAccounts) {
      const uId = acc.userId.toString();
      if (!accountsByUser.has(uId)) accountsByUser.set(uId, []);
      accountsByUser.get(uId)?.push(acc);
    }

    return creators.map((c) => {
      const uId = ((c.userId as any)?._id || c.userId)?.toString();
      const accounts = accountsByUser.get(uId) || [];
      return {
        ...c,
        socialAccounts: accounts,
        portfolioCount: c.portfolio?.length || 0,
      };
    });
  }

  async verifyCreator(adminUser: UserDocument, creatorId: string, status: VerificationStatus, notes?: string) {
    const creator = await this.creatorModel.findById(creatorId).populate('userId');
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const now = new Date();
    creator.verificationStatus = status;
    if (status === VerificationStatus.VERIFIED) {
      creator.verifiedAt = now;
    }
    if (notes) {
      creator.verificationNotes = notes;
    }
    await creator.save();

    // Synchronize social accounts status
    const creatorUserId = (creator.userId as any)?._id || creator.userId;
    await this.socialModel.updateMany(
      { userId: creatorUserId },
      {
        $set: {
          verificationStatus: status,
          verifiedAt: status === VerificationStatus.VERIFIED ? now : undefined,
          verificationNotes: notes || '',
        },
      },
    );

    // Audit log
    await this.auditLogsService.logAction(
      adminUser._id.toString(),
      adminUser.fullName || adminUser.username,
      status === VerificationStatus.VERIFIED ? AuditAction.PROFILE_VERIFIED : AuditAction.PROFILE_REJECTED,
      'CreatorProfile',
      creatorId,
      `Verification status updated to ${status}. Notes: ${notes || 'None'}`,
    );

    // Send real-time notification to the creator
    const creatorUserIdStr = creatorUserId.toString();
    try {
      if (status === VerificationStatus.VERIFIED) {
        await this.notificationsService.create({
          userId: creatorUserIdStr,
          type: NotificationType.PROFILE_VERIFIED,
          title: 'Verified Pro Badge Approved! 🎉',
          message: 'Congratulations! Your creator profile and connected social accounts have been verified by the Brands & Creators team.',
          link: `/creators/${creator.slug}`,
        });
      } else {
        await this.notificationsService.create({
          userId: creatorUserIdStr,
          type: NotificationType.PROFILE_REJECTED,
          title: 'Verification Request Update',
          message: `Your verification request was reviewed. Feedback: ${notes || 'Please complete your portfolio with recent work and update your social handles before re-applying.'}`,
          link: '/dashboard/creator',
        });
      }
    } catch {
      // Notification dispatch failure should not block administrative state mutation
    }

    return { message: `Creator verification updated to ${status}`, creator };
  }
}
