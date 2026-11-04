import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { Milestone, MilestoneDocument } from './schemas/milestone.schema';
import { Deliverable, DeliverableDocument } from './schemas/deliverable.schema';
import { ProjectTask, ProjectTaskDocument } from './schemas/project-task.schema';
import { ProjectFile, ProjectFileDocument } from './schemas/project-file.schema';
import { ProjectActivity, ProjectActivityDocument } from './schemas/project-activity.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import {
  ProjectStatus,
  ProjectRole,
  MilestoneStatus,
  DeliverableStatus,
  ProjectActivityType,
  NotificationType,
  ConversationType,
  UserRole,
} from '@brands-creators/types';
import {
  CreateProjectFromApplicationDto,
  UpdateProjectDto,
} from './dto/create-project.dto';
import {
  UpdateProjectStatusDto,
  CancelProjectDto,
  HoldProjectDto,
  CompleteProjectDto,
} from './dto/update-project-status.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Milestone.name)
    private readonly milestoneModel: Model<MilestoneDocument>,
    @InjectModel(Deliverable.name)
    private readonly deliverableModel: Model<DeliverableDocument>,
    @InjectModel(ProjectTask.name)
    private readonly taskModel: Model<ProjectTaskDocument>,
    @InjectModel(ProjectFile.name)
    private readonly fileModel: Model<ProjectFileDocument>,
    @InjectModel(ProjectActivity.name)
    private readonly activityModel: Model<ProjectActivityDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel('Application')
    private readonly applicationModel: Model<any>,
    @InjectModel('Requirement')
    private readonly requirementModel: Model<any>,
    @InjectModel('User')
    private readonly userModel: Model<any>,
    @InjectModel('BrandProfile')
    private readonly brandModel: Model<any>,
    @InjectModel('CreatorProfile')
    private readonly creatorModel: Model<any>,
    private readonly notificationsService: NotificationsService,
    private readonly messagingService: MessagingService,
  ) {}

  /**
   * Helper to verify if user is allowed to access/manage the project
   */
  async verifyProjectAccess(
    projectId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    userRole?: string,
  ): Promise<ProjectDocument> {
    const pId = typeof projectId === 'string' && Types.ObjectId.isValid(projectId)
      ? new Types.ObjectId(projectId)
      : projectId;

    const query = Types.ObjectId.isValid(projectId as any)
      ? { _id: pId }
      : { $or: [{ slug: projectId }, { projectNumber: projectId }] };

    const project = await this.projectModel.findOne(query);
    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }

    const uIdStr = userId.toString();
    const isBrand =
      project.brandId.toString() === uIdStr ||
      project.participants.some((p) => p.userId.toString() === uIdStr && (p.role === ProjectRole.OWNER || p.role === ProjectRole.CLIENT));
    const isProfessional =
      project.professionalId.toString() === uIdStr ||
      project.participants.some((p) => p.userId.toString() === uIdStr && p.role === ProjectRole.PROFESSIONAL);
    const isParticipant = project.participants.some(
      (p) => p.userId.toString() === uIdStr,
    );
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

    if (!isBrand && !isProfessional && !isParticipant && !isAdmin) {
      throw new ForbiddenException('You do not have permission to access this project workspace');
    }

    return project;
  }

  /**
   * Create a project from an accepted marketplace application
   */
  async createFromApplication(
    applicationId: string,
    requestingUser: any,
    dto?: CreateProjectFromApplicationDto,
  ): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(applicationId)) {
      throw new BadRequestException('Invalid application ID format');
    }

    const appObjId = new Types.ObjectId(applicationId);
    const application = await this.applicationModel.findById(appObjId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check duplicate project prevention
    const existingProject = await this.projectModel.findOne({ applicationId: appObjId });
    if (existingProject) {
      if (existingProject.metadata?.autoCreated && !existingProject.metadata?.explicitlyCreated) {
        if (dto?.title) existingProject.title = dto.title;
        if (dto?.description) existingProject.description = dto.description;
        existingProject.metadata = {
          ...existingProject.metadata,
          explicitlyCreated: true,
        };
        await existingProject.save();
        return existingProject;
      }
      throw new ConflictException('A project has already been created for this application');
    }

    const requirement = await this.requirementModel.findById(application.requirementId);
    if (!requirement) {
      throw new NotFoundException('Associated requirement not found');
    }

    // Resolve Brand Profile and User ID
    const rawBrandId = requirement.brandId?._id || requirement.brandId;
    let brandUserId = rawBrandId;
    const brandDoc = await this.brandModel.findById(rawBrandId);
    if (brandDoc && brandDoc.userId) {
      brandUserId = brandDoc.userId;
    }

    // Resolve Creator Profile and User ID
    const rawApplicantId = application.applicantId?._id || application.applicantId;
    let professionalUserId = rawApplicantId;
    const creatorDoc = await this.creatorModel.findById(rawApplicantId);
    if (creatorDoc && creatorDoc.userId) {
      professionalUserId = creatorDoc.userId;
    }

    // Verify Brand ownership
    const reqUserId = (requestingUser.userId || requestingUser._id?.toString() || requestingUser.id).toString();
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);
    const isBrandOwner = brandUserId.toString() === reqUserId || rawBrandId.toString() === reqUserId;

    if (!isBrandOwner && !isAdmin) {
      throw new ForbiddenException('Only the requirement owner or an admin can create a project');
    }

    // Generate human-readable unique project number (e.g. BC-2026-000001)
    const year = new Date().getFullYear();
    const latestProject = await this.projectModel
      .findOne({ projectNumber: new RegExp(`^BC-${year}-`) })
      .sort({ projectNumber: -1 })
      .lean();

    let seq = 1;
    if (latestProject && latestProject.projectNumber) {
      const match = latestProject.projectNumber.match(/^BC-\d{4}-(\d+)/);
      if (match && match[1]) {
        seq = parseInt(match[1], 10) + 1;
      }
    } else {
      const count = await this.projectModel.countDocuments();
      seq = count + 1;
    }

    let projectNumber = `BC-${year}-${String(seq).padStart(6, '0')}`;
    while (await this.projectModel.exists({ projectNumber })) {
      seq++;
      projectNumber = `BC-${year}-${String(seq).padStart(6, '0')}`;
    }

    // Generate unique slug
    const baseTitle = dto?.title || requirement.title || 'Brand Project';
    let baseSlug = baseTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'project';
    let slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Strict Budget Integrity: derived from accepted application offeredPrice or bidAmount
    const approvedBudget =
      application.offeredPrice ||
      (application as any).bidAmount ||
      requirement.budget?.max ||
      requirement.budget?.min ||
      0;
    const currency = requirement.budget?.currency || 'INR';

    // Link/Create Phase 04 Project Conversation
    let conversationId: Types.ObjectId | undefined;
    try {
      const existingConv = await this.conversationModel.findOne({
        $or: [
          { applicationId: appObjId },
          { projectId: projectNumber },
        ],
      });

      if (existingConv) {
        existingConv.type = ConversationType.PROJECT;
        existingConv.projectId = projectNumber;
        await existingConv.save();
        conversationId = existingConv._id as Types.ObjectId;
      } else {
        const newConv = new this.conversationModel({
          type: ConversationType.PROJECT,
          title: `Project: ${baseTitle}`,
          participants: [
            {
              userId: brandUserId,
              role: UserRole.BRAND,
              joinedAt: new Date(),
              muted: false,
              archived: false,
            },
            {
              userId: professionalUserId,
              role: application.applicantRole || UserRole.CREATOR,
              joinedAt: new Date(),
              muted: false,
              archived: false,
            },
          ],
          createdBy: new Types.ObjectId(reqUserId),
          requirementId: requirement._id,
          applicationId: appObjId,
          projectId: projectNumber,
          status: 'ACTIVE',
          messageCount: 0,
        });
        const savedConv = await newConv.save();
        conversationId = savedConv._id as Types.ObjectId;
      }
    } catch (err) {
      this.logger.warn(`Could not link project conversation: ${err.message}`);
    }

    const newProject = new this.projectModel({
      projectNumber,
      title: dto?.title || requirement.title,
      slug,
      description: dto?.description || requirement.description || 'Project deliverables and milestones.',
      status: ProjectStatus.CONFIRMED,
      brandId: brandUserId,
      professionalId: professionalUserId,
      professionalType: application.applicantRole || 'CREATOR',
      requirementId: requirement._id,
      applicationId: appObjId,
      conversationId,
      approvedBudget,
      currency,
      startDate: dto?.startDate ? new Date(dto.startDate) : new Date(),
      endDate: dto?.endDate ? new Date(dto.endDate) : requirement.timeline?.deadline,
      progress: 0,
      participants: [
        {
          userId: brandUserId,
          role: ProjectRole.OWNER,
          joinedAt: new Date(),
          status: 'ACTIVE',
        },
        {
          userId: professionalUserId,
          role: ProjectRole.PROFESSIONAL,
          joinedAt: new Date(),
          status: 'ACTIVE',
        },
      ],
      createdBy: new Types.ObjectId(reqUserId),
      metadata: {
        autoCreated: !!(dto as any)?.isAutoCreate,
        explicitlyCreated: !(dto as any)?.isAutoCreate,
      },
    });

    const savedProject = await newProject.save();

    // Create Initial Milestones if deliverables exist on requirement
    if (requirement.deliverables && Array.isArray(requirement.deliverables) && requirement.deliverables.length > 0) {
      let order = 1;
      for (const d of requirement.deliverables) {
        const milestone = new this.milestoneModel({
          projectId: savedProject._id,
          title: d.name || `Milestone ${order}`,
          description: d.description || `${d.quantity || 1}x ${d.type || 'Deliverable'}`,
          order: order++,
          status: MilestoneStatus.PENDING,
          progress: 0,
        });
        await milestone.save();
      }
    } else {
      // Default Initial Milestone
      const defaultMilestone = new this.milestoneModel({
        projectId: savedProject._id,
        title: 'Project Kickoff & Deliverable Submission',
        description: 'Complete project deliverables and upload files for Brand review.',
        order: 1,
        status: MilestoneStatus.PENDING,
        progress: 0,
      });
      await defaultMilestone.save();
    }

    // Log Activity
    await this.logActivity(
      savedProject._id as Types.ObjectId,
      new Types.ObjectId(reqUserId),
      ProjectActivityType.PROJECT_CREATED,
      `Project workspace ${projectNumber} created from accepted application`,
      { applicationId, requirementId: requirement._id },
    );

    // Send In-App Notifications
    await this.notificationsService.create({
      userId: professionalUserId,
      type: NotificationType.PROJECT_CREATED,
      title: 'New Project Workspace Created',
      message: `Brand created project workspace for "${savedProject.title}".`,
      link: `/projects/${savedProject._id}`,
      metadata: { projectId: savedProject._id, projectNumber },
    });

    return savedProject;
  }

  /**
   * Find projects accessible by user with search, filtering and pagination
   */
  async findAll(requestingUser: any, query: QueryProjectsDto): Promise<any> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    const filter: any = {};

    if (!isAdmin) {
      const uObjId = new Types.ObjectId(reqUserId);
      filter.$or = [
        { brandId: uObjId },
        { professionalId: uObjId },
        { 'participants.userId': uObjId },
      ];
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { title: searchRegex },
            { projectNumber: searchRegex },
            { slug: searchRegex },
          ],
        },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('brandId', 'fullName email avatarUrl username')
        .populate('professionalId', 'fullName email avatarUrl username')
        .populate('requirementId', 'title category budget')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.projectModel.countDocuments(filter),
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
   * Find project by ID or Slug or ProjectNumber
   */
  async findById(projectIdOrSlug: string, requestingUser: any): Promise<any> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const userRole = requestingUser.roles?.[0];

    const project = await this.verifyProjectAccess(projectIdOrSlug, reqUserId, userRole);

    const [populatedProject, milestones, deliverables, tasks, files, recentActivity] =
      await Promise.all([
        this.projectModel
          .findById(project._id)
          .populate('brandId', 'fullName email avatarUrl username')
          .populate('professionalId', 'fullName email avatarUrl username')
          .populate('requirementId', 'title slug category budget timeline deliverables')
          .populate('applicationId', 'proposal offeredPrice deliveryDays selectedPortfolio status')
          .lean(),
        this.milestoneModel.find({ projectId: project._id }).sort({ order: 1 }).lean(),
        this.deliverableModel.find({ projectId: project._id }).sort({ createdAt: -1 }).lean(),
        this.taskModel.find({ projectId: project._id }).sort({ createdAt: -1 }).lean(),
        this.fileModel.find({ projectId: project._id }).sort({ createdAt: -1 }).lean(),
        this.activityModel
          .find({ projectId: project._id })
          .populate('actorId', 'fullName email avatarUrl')
          .sort({ createdAt: -1 })
          .limit(30)
          .lean(),
      ]);

    return {
      ...populatedProject,
      milestones,
      deliverables,
      tasks,
      files,
      activity: recentActivity,
    };
  }

  /**
   * Update project status according to state machine rules
   */
  async updateStatus(
    projectId: string,
    dto: UpdateProjectStatusDto,
    requestingUser: any,
  ): Promise<ProjectDocument> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.verifyProjectAccess(projectId, reqUserId, requestingUser.roles?.[0]);

    const oldStatus = project.status;
    const newStatus = dto.status;

    // Check valid transitions
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      [ProjectStatus.DRAFT]: [ProjectStatus.CONFIRMED, ProjectStatus.CANCELLED],
      [ProjectStatus.CONFIRMED]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED, ProjectStatus.ON_HOLD],
      [ProjectStatus.IN_PROGRESS]: [ProjectStatus.ON_HOLD, ProjectStatus.IN_REVIEW, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED, ProjectStatus.DISPUTED],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
      [ProjectStatus.IN_REVIEW]: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED, ProjectStatus.DISPUTED],
      [ProjectStatus.COMPLETED]: [],
      [ProjectStatus.CANCELLED]: [],
      [ProjectStatus.DISPUTED]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED, ProjectStatus.COMPLETED],
    };

    if (oldStatus !== newStatus && !validTransitions[oldStatus]?.includes(newStatus)) {
      throw new BadRequestException(`Invalid project status transition from ${oldStatus} to ${newStatus}`);
    }

    // Role-specific constraints
    const isBrand = project.brandId.toString() === reqUserId;
    const isProfessional = project.professionalId.toString() === reqUserId;
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    if (newStatus === ProjectStatus.COMPLETED && !isBrand && !isAdmin) {
      throw new ForbiddenException('Only the Brand or an Admin can mark the project as completed');
    }

    if (newStatus === ProjectStatus.CANCELLED && !dto.reason) {
      throw new BadRequestException('A reason is required to cancel a project');
    }

    if (newStatus === ProjectStatus.ON_HOLD && !dto.reason) {
      throw new BadRequestException('A reason is required to place a project on hold');
    }

    project.status = newStatus;

    if (newStatus === ProjectStatus.IN_PROGRESS && !project.actualStartDate) {
      project.actualStartDate = new Date();
    }

    if (newStatus === ProjectStatus.COMPLETED) {
      project.completedAt = new Date();
      project.actualEndDate = new Date();
      project.progress = 100;
      if (dto.notes) project.completionNotes = dto.notes;
    }

    if (newStatus === ProjectStatus.CANCELLED) {
      project.cancelledAt = new Date();
      project.cancellationReason = dto.reason;
    }

    if (newStatus === ProjectStatus.ON_HOLD) {
      project.holdReason = dto.reason;
    }

    const updated = await project.save();

    // Log Activity
    const activityType =
      newStatus === ProjectStatus.COMPLETED
        ? ProjectActivityType.PROJECT_COMPLETED
        : newStatus === ProjectStatus.CANCELLED
        ? ProjectActivityType.PROJECT_CANCELLED
        : newStatus === ProjectStatus.ON_HOLD
        ? ProjectActivityType.PROJECT_ON_HOLD
        : ProjectActivityType.PROJECT_STATUS_CHANGED;

    await this.logActivity(
      project._id as Types.ObjectId,
      new Types.ObjectId(reqUserId),
      activityType,
      `Project status updated from ${oldStatus} to ${newStatus}${dto.reason ? `: ${dto.reason}` : ''}`,
      { oldStatus, newStatus, reason: dto.reason },
    );

    // Notify Counterparty
    const counterpartyId = isBrand ? project.professionalId : project.brandId;
    await this.notificationsService.create({
      userId: counterpartyId,
      type:
        newStatus === ProjectStatus.COMPLETED
          ? NotificationType.PROJECT_COMPLETED
          : newStatus === ProjectStatus.CANCELLED
          ? NotificationType.PROJECT_CANCELLED
          : NotificationType.PROJECT_STARTED,
      title: `Project Status: ${newStatus}`,
      message: `Project "${project.title}" is now ${newStatus}.`,
      link: `/projects/${project._id}`,
      metadata: { projectId: project._id, status: newStatus },
    });

    return updated;
  }

  /**
   * Complete project with validation
   */
  async complete(projectId: string, dto: CompleteProjectDto, requestingUser: any): Promise<ProjectDocument> {
    return this.updateStatus(
      projectId,
      { status: ProjectStatus.COMPLETED, notes: dto?.completionNotes },
      requestingUser,
    );
  }

  /**
   * Cancel project with mandatory reason
   */
  async cancel(projectId: string, dto: CancelProjectDto, requestingUser: any): Promise<ProjectDocument> {
    return this.updateStatus(
      projectId,
      { status: ProjectStatus.CANCELLED, reason: dto.reason },
      requestingUser,
    );
  }

  /**
   * Put project on hold with mandatory reason
   */
  async hold(projectId: string, dto: HoldProjectDto, requestingUser: any): Promise<ProjectDocument> {
    return this.updateStatus(
      projectId,
      { status: ProjectStatus.ON_HOLD, reason: dto.reason },
      requestingUser,
    );
  }

  /**
   * Recalculate deterministic project progress percentage based on milestones
   */
  async recalculateProgress(projectId: Types.ObjectId): Promise<number> {
    const milestones = await this.milestoneModel.find({ projectId });
    if (milestones.length === 0) return 0;

    const completedCount = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED || m.status === MilestoneStatus.APPROVED,
    ).length;

    const progress = Math.round((completedCount / milestones.length) * 100);
    await this.projectModel.findByIdAndUpdate(projectId, { progress });
    return progress;
  }

  /**
   * Helper to write structured audit activity
   */
  async logActivity(
    projectId: Types.ObjectId,
    actorId: Types.ObjectId,
    type: ProjectActivityType,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<ProjectActivityDocument> {
    const activity = new this.activityModel({
      projectId,
      actorId,
      type,
      description,
      metadata: metadata || {},
    });
    const saved = await activity.save();

    try {
      await this.activityModel.db.collection('projectactivities').insertOne({
        projectId: new Types.ObjectId(projectId.toString()),
        actorId: new Types.ObjectId(actorId.toString()),
        type,
        description,
        metadata: metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch {}

    return saved;
  }

  async findByApplicationId(applicationId: string | Types.ObjectId): Promise<ProjectDocument | null> {
    const appObjId = typeof applicationId === 'string' && Types.ObjectId.isValid(applicationId)
      ? new Types.ObjectId(applicationId)
      : applicationId;
    return this.projectModel.findOne({ applicationId: appObjId });
  }
}
