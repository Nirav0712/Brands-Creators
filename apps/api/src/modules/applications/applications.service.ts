import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument } from './schemas/application.schema';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  ApplicationFilterDto,
} from './dto/application.dto';
import { BulkApplicationStatusDto } from './dto/bulk-application-status.dto';
import { ApplicationStatus, RequirementStatus, NotificationType, UserRole, AuditAction } from '@brands-creators/types';
import { Requirement, RequirementDocument } from '../requirements/schemas/requirement.schema';
import { CreatorProfile, CreatorProfileDocument } from '../creators/schemas/creator.schema';
import { BrandProfile, BrandProfileDocument } from '../brands/schemas/brand.schema';
import { MatchingService } from '../matching/matching.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    @InjectModel(Requirement.name)
    private readonly requirementModel: Model<RequirementDocument>,
    @InjectModel(CreatorProfile.name)
    private readonly creatorProfileModel: Model<CreatorProfileDocument>,
    @InjectModel(BrandProfile.name)
    private readonly brandProfileModel: Model<BrandProfileDocument>,
    private readonly matchingService: MatchingService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async apply(userId: string, dto: CreateApplicationDto): Promise<any> {
    const creator = await this.creatorProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!creator) {
      throw new BadRequestException('You must have a Creator / Professional profile to apply for opportunities.');
    }

    if (creator.visibilityStatus === 'SUSPENDED') {
      throw new ForbiddenException('Your creator account is currently suspended and cannot submit applications.');
    }

    const requirement = await this.requirementModel.findById(dto.requirementId);
    if (!requirement) {
      throw new NotFoundException('Requirement opportunity not found.');
    }

    if (requirement.status !== RequirementStatus.PUBLISHED) {
      throw new BadRequestException(`This requirement is ${requirement.status.toLowerCase()} and no longer accepting applications.`);
    }

    if (requirement.applicationDeadline && new Date(requirement.applicationDeadline) < new Date()) {
      throw new BadRequestException('The application deadline for this requirement has passed.');
    }

    // Check for duplicate application
    const existing = await this.applicationModel.findOne({
      requirementId: new Types.ObjectId(dto.requirementId),
      applicantId: new Types.ObjectId(userId),
    });

    if (existing) {
      throw new ConflictException('You have already submitted an application for this requirement.');
    }

    // Calculate deterministic match score
    const matchResult = this.matchingService.calculateMatch(creator, requirement);

    const proposal = (dto.proposal || dto.coverLetter || '').trim();
    if (!proposal) {
      throw new BadRequestException('Proposal pitch is required');
    }
    const offeredPrice =
      dto.offeredPrice !== undefined
        ? dto.offeredPrice
        : dto.bidAmount !== undefined
        ? dto.bidAmount
        : requirement.budget?.min || 0;
    const estimatedDelivery = dto.estimatedDelivery || dto.proposedTimeline || '7 Days';

    const application = new this.applicationModel({
      ...dto,
      proposal,
      offeredPrice,
      estimatedDelivery,
      requirementId: new Types.ObjectId(dto.requirementId),
      applicantId: new Types.ObjectId(userId),
      creatorProfileId: creator._id,
      matchScore: matchResult.score,
      status: ApplicationStatus.SUBMITTED,
    });

    const saved = await application.save();

    // Increment application count on requirement
    await this.requirementModel.findByIdAndUpdate(dto.requirementId, {
      $inc: { applicationCount: 1 },
    });

    // Notify brand owner
    const brand = await this.brandProfileModel.findById(requirement.brandId);
    if (brand && brand.userId) {
      await this.notificationsService.create({
        userId: brand.userId.toString(),
        type: NotificationType.APPLICATION_RECEIVED,
        title: 'New Application Received',
        message: `${creator.headline || 'A creator'} applied to "${requirement.title}" (Match: ${matchResult.score}%).`,
        link: `/brand/requirements/${requirement._id}/applicants`,
        metadata: { requirementId: requirement._id, applicationId: saved._id },
      });
    }

    return saved;
  }

  async getApplicantsForRequirement(brandUserId: string, requirementId: string, status?: string): Promise<any> {
    const brand = await this.brandProfileModel.findOne({
      userId: new Types.ObjectId(brandUserId),
    });

    const requirement = await this.requirementModel.findOne({
      _id: new Types.ObjectId(requirementId),
      brandId: brand?._id,
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found or access unauthorized.');
    }

    const query: any = { requirementId: new Types.ObjectId(requirementId) };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const applicants = await this.applicationModel
      .find(query)
      .populate({
        path: 'creatorProfileId',
        populate: { path: 'userId', select: 'fullName username email avatarUrl' },
      })
      .sort({ matchScore: -1, createdAt: -1 })
      .lean();

    return {
      requirement,
      applicants,
      totalCount: applicants.length,
    };
  }

  async getMyApplications(userId: string, status?: string): Promise<any[]> {
    const query: any = { applicantId: new Types.ObjectId(userId) };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    return this.applicationModel
      .find(query)
      .populate({
        path: 'requirementId',
        populate: [
          { path: 'brandId', select: 'companyName slug logoUrl verificationStatus' },
          { path: 'categoryId', select: 'name slug' },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async checkExistingApplication(userId: string, requirementId: string): Promise<any> {
    const app = await this.applicationModel.findOne({
      requirementId: new Types.ObjectId(requirementId),
      applicantId: new Types.ObjectId(userId),
    }).lean();

    return { hasApplied: !!app, application: app };
  }

  async updateStatus(
    brandUserId: string,
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<any> {
    const brand = await this.brandProfileModel.findOne({
      userId: new Types.ObjectId(brandUserId),
    });

    const application = await this.applicationModel
      .findById(applicationId)
      .populate('requirementId');

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    const reqBrandId = (application.requirementId as any)?.brandId?.toString();
    if (!brand || reqBrandId !== brand._id.toString()) {
      throw new ForbiddenException('You do not have permission to moderate this application.');
    }

    if (application.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Cannot modify a withdrawn application.');
    }

    application.status = dto.status;
    if (dto.brandNotes) {
      application.brandNotes = dto.brandNotes;
    }
    const updated = await application.save();

    let project: any = null;
    if (dto.status === ApplicationStatus.ACCEPTED) {
      try {
        project = await this.projectsService.findByApplicationId(application._id);
        if (!project) {
          project = await this.projectsService.createFromApplication(
            application._id.toString(),
            { userId: brandUserId, roles: [UserRole.BRAND] },
            { isAutoCreate: true } as any,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Auto project creation note: ${err?.message}`);
      }
    }

    // Send notifications to applicant on status transitions
    let notifType: NotificationType | null = null;
    let notifTitle = '';
    let notifMsg = '';

    const reqTitle = (application.requirementId as any)?.title || 'Requirement';

    if (dto.status === ApplicationStatus.SHORTLISTED) {
      notifType = NotificationType.APPLICATION_SHORTLISTED;
      notifTitle = 'Application Shortlisted! 🎉';
      notifMsg = `You have been shortlisted by ${brand.companyName} for "${reqTitle}".`;
    } else if (dto.status === ApplicationStatus.ACCEPTED) {
      notifType = NotificationType.APPLICATION_ACCEPTED;
      notifTitle = 'Application Accepted! 🤝';
      notifMsg = `Congratulations! ${brand.companyName} accepted your application for "${reqTitle}".`;
    } else if (dto.status === ApplicationStatus.REJECTED) {
      notifType = NotificationType.APPLICATION_REJECTED;
      notifTitle = 'Application Update';
      notifMsg = `Your application for "${reqTitle}" was not selected.`;
    }

    if (notifType) {
      await this.notificationsService.create({
        userId: application.applicantId.toString(),
        type: notifType,
        title: notifTitle,
        message: notifMsg,
        link: '/creator/applications',
        metadata: { applicationId: application._id, requirementId: application.requirementId },
      });
    }

    const updatedObj = (updated as any).toObject ? (updated as any).toObject() : updated;
    return project ? { ...updatedObj, project } : updatedObj;
  }

  async withdraw(userId: string, applicationId: string): Promise<any> {
    const application = await this.applicationModel.findOne({
      _id: new Types.ObjectId(applicationId),
      applicantId: new Types.ObjectId(userId),
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    application.status = ApplicationStatus.WITHDRAWN;
    const saved = await application.save();

    try {
      const requirement = await this.requirementModel.findById(application.requirementId);
      if (requirement) {
        let recipientUserId = requirement.brandId;
        const brand = await this.brandProfileModel.findById(requirement.brandId);
        if (brand && brand.userId) {
          recipientUserId = brand.userId;
        }
        await this.notificationsService.create({
          userId: recipientUserId.toString(),
          type: NotificationType.APPLICATION_WITHDRAWN,
          title: 'Application Withdrawn',
          message: `A creator has withdrawn their application for "${requirement.title}".`,
          link: `/brand/requirements/${requirement._id}/applicants`,
          metadata: { applicationId: application._id, requirementId: requirement._id },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch application withdrawal notification: ${err.message}`);
    }

    return saved;
  }

  async bulkUpdateStatus(
    userId: string,
    dto: BulkApplicationStatusDto,
    roles: UserRole[] = [UserRole.BRAND],
  ): Promise<any> {
    const isAdmin = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);

    let brand: any = null;
    if (!isAdmin) {
      brand = await this.brandProfileModel.findOne({
        userId: new Types.ObjectId(userId),
      });
      if (!brand) {
        throw new ForbiddenException('Only registered brands or platform administrators can moderate applications.');
      }
    }

    // Deduplicate input IDs
    const uniqueIds = Array.from(new Set(dto.applicationIds.map((id) => id?.trim()))).filter(Boolean);
    const results: Array<{
      applicationId: string;
      success: boolean;
      status?: ApplicationStatus;
      error?: string;
      note?: string;
    }> = [];

    let successCount = 0;
    let failCount = 0;

    for (const appId of uniqueIds) {
      if (!Types.ObjectId.isValid(appId)) {
        failCount++;
        results.push({
          applicationId: appId,
          success: false,
          error: 'Invalid application ID format',
        });
        continue;
      }

      try {
        const application = await this.applicationModel
          .findById(appId)
          .populate('requirementId');

        if (!application) {
          failCount++;
          results.push({
            applicationId: appId,
            success: false,
            error: 'Application not found',
          });
          continue;
        }

        // Tenant Isolation Check
        if (!isAdmin) {
          const reqBrandId = (application.requirementId as any)?.brandId?.toString();
          if (!reqBrandId || reqBrandId !== brand._id.toString()) {
            failCount++;
            results.push({
              applicationId: appId,
              success: false,
              error: 'Unauthorized: application belongs to another brand opportunity',
            });
            continue;
          }
        }

        // Lifecycle State Machine Checks
        if (application.status === dto.status) {
          successCount++;
          results.push({
            applicationId: appId,
            success: true,
            status: application.status,
            note: 'Already in target status',
          });
          continue;
        }

        if (application.status === ApplicationStatus.WITHDRAWN) {
          failCount++;
          results.push({
            applicationId: appId,
            success: false,
            error: 'Cannot modify a withdrawn application',
          });
          continue;
        }

        if (application.status === ApplicationStatus.ACCEPTED) {
          failCount++;
          results.push({
            applicationId: appId,
            success: false,
            error: 'Cannot bulk modify an already accepted application',
          });
          continue;
        }

        // Apply Status Mutation
        application.status = dto.status;
        if (dto.brandNotes || dto.reason) {
          application.brandNotes = (dto.brandNotes || dto.reason || '').trim();
        }
        await application.save();

        // Dispatch Targeted In-App Notification without duplicates
        const reqTitle = (application.requirementId as any)?.title || 'Requirement';
        const brandName = brand?.companyName || 'The Brand';

        if (dto.status === ApplicationStatus.SHORTLISTED) {
          await this.notificationsService.create({
            userId: application.applicantId.toString(),
            type: NotificationType.APPLICATION_SHORTLISTED,
            title: 'Application Shortlisted! 🎉',
            message: `You have been shortlisted by ${brandName} for "${reqTitle}".`,
            link: '/creator/applications',
            metadata: {
              applicationId: application._id,
              requirementId: application.requirementId,
            },
          });
        } else if (dto.status === ApplicationStatus.REJECTED) {
          await this.notificationsService.create({
            userId: application.applicantId.toString(),
            type: NotificationType.APPLICATION_REJECTED,
            title: 'Application Update',
            message: `Your application for "${reqTitle}" was not selected.`,
            link: '/creator/applications',
            metadata: {
              applicationId: application._id,
              requirementId: application.requirementId,
            },
          });
        }

        successCount++;
        results.push({
          applicationId: appId,
          success: true,
          status: dto.status,
        });
      } catch (err: any) {
        failCount++;
        results.push({
          applicationId: appId,
          success: false,
          error: err.message || 'Error updating application status',
        });
      }
    }

    // Persist Audit Log Trail for Administrative / Brand Governance
    if (successCount > 0) {
      try {
        await this.auditLogsService.logAction(
          userId,
          brand?.companyName || (isAdmin ? 'Admin' : 'Brand User'),
          AuditAction.APPLICATION_BULK_MODERATED,
          'Application',
          uniqueIds.join(','),
          `Bulk updated ${successCount} applicant(s) to ${dto.status} (${failCount} failed). Reason: ${dto.reason || 'None provided'}`,
        );
      } catch (auditErr: any) {
        this.logger.warn(`Failed to write bulk audit log: ${auditErr.message}`);
      }
    }

    return {
      total: uniqueIds.length,
      succeeded: successCount,
      failed: failCount,
      status: dto.status,
      results,
    };
  }

  async findAll(query?: any): Promise<any> {
    const filter: any = {};
    if (query?.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    const page = Math.max(1, parseInt(query?.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.applicationModel
        .find(filter)
        .populate('requirementId', 'title slug budget categoryId brandId')
        .populate('applicantId', 'stageName slug avatarUrl primaryCategory rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.applicationModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
