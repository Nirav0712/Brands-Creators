import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deliverable, DeliverableDocument } from './schemas/deliverable.schema';
import { Milestone, MilestoneDocument } from './schemas/milestone.schema';
import { Project, ProjectDocument } from './schemas/project.schema';
import { ProjectsService } from './projects.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DeliverableStatus,
  MilestoneStatus,
  ProjectActivityType,
  NotificationType,
  ProjectRole,
  UserRole,
} from '@brands-creators/types';
import {
  CreateDeliverableDto,
  SubmitDeliverableDto,
  RequestRevisionDto,
  ApproveDeliverableDto,
} from './dto/create-deliverable.dto';

@Injectable()
export class DeliverablesService {
  constructor(
    @InjectModel(Deliverable.name)
    private readonly deliverableModel: Model<DeliverableDocument>,
    @InjectModel(Milestone.name)
    private readonly milestoneModel: Model<MilestoneDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly projectsService: ProjectsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(projectId: string, dto: CreateDeliverableDto, requestingUser: any): Promise<DeliverableDocument> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    let milestoneId: Types.ObjectId | undefined;
    if (dto.milestoneId && Types.ObjectId.isValid(dto.milestoneId)) {
      milestoneId = new Types.ObjectId(dto.milestoneId);
    }

    const deliverable = new this.deliverableModel({
      projectId: project._id,
      milestoneId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      status: DeliverableStatus.PENDING,
      submissionVersion: 0,
      files: [],
      links: [],
      versions: [],
    });

    return deliverable.save();
  }

  async findAll(projectId: string, requestingUser: any): Promise<DeliverableDocument[]> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    return this.deliverableModel.find({ projectId: project._id }).sort({ createdAt: -1 });
  }

  async submit(
    deliverableId: string,
    dto: SubmitDeliverableDto,
    requestingUser: any,
  ): Promise<DeliverableDocument> {
    if (!Types.ObjectId.isValid(deliverableId)) {
      throw new BadRequestException('Invalid deliverable ID');
    }

    const deliverable = await this.deliverableModel.findById(deliverableId);
    if (!deliverable) {
      throw new NotFoundException('Deliverable not found');
    }

    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      deliverable.projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    const isProfessional =
      project.professionalId.toString() === reqUserId ||
      project.participants.some((p) => p.userId.toString() === reqUserId && p.role === ProjectRole.PROFESSIONAL);
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    if (!isProfessional && !isAdmin) {
      throw new ForbiddenException('Only the assigned creator/professional can submit deliverables');
    }

    const newVersionNum = (deliverable.submissionVersion || 0) + 1;
    const files = dto.files || [];
    const links = dto.links || [];

    const versionEntry = {
      version: newVersionNum,
      files,
      links,
      description: dto.description,
      notes: dto.notes,
      submittedBy: new Types.ObjectId(reqUserId),
      submittedAt: new Date(),
      status: DeliverableStatus.SUBMITTED,
    };

    deliverable.submissionVersion = newVersionNum;
    deliverable.files = files as any;
    deliverable.links = links;
    deliverable.notes = dto.notes;
    deliverable.submittedBy = new Types.ObjectId(reqUserId);
    deliverable.submittedAt = new Date();
    deliverable.status = DeliverableStatus.SUBMITTED;
    deliverable.feedback = undefined;
    deliverable.versions.push(versionEntry as any);

    const saved = await deliverable.save();

    // Advance milestone if attached
    if (deliverable.milestoneId) {
      await this.milestoneModel.findByIdAndUpdate(deliverable.milestoneId, {
        status: MilestoneStatus.IN_REVIEW,
      });
    }

    await this.projectsService.logActivity(
      project._id as Types.ObjectId,
      new Types.ObjectId(reqUserId),
      ProjectActivityType.DELIVERABLE_SUBMITTED,
      `Deliverable submitted (Version ${newVersionNum}): "${deliverable.title}"`,
      { deliverableId: deliverable._id, version: newVersionNum },
    );

    // Notify Brand
    await this.notificationsService.create({
      userId: project.brandId,
      type: NotificationType.DELIVERABLE_SUBMITTED,
      title: 'Deliverable Submitted for Review',
      message: `New version submitted for "${deliverable.title}" in project "${project.title}".`,
      link: `/projects/${project._id}`,
      metadata: { projectId: project._id, deliverableId: deliverable._id },
    });

    return saved;
  }

  async requestRevision(
    deliverableId: string,
    dto: RequestRevisionDto,
    requestingUser: any,
  ): Promise<DeliverableDocument> {
    if (!Types.ObjectId.isValid(deliverableId)) {
      throw new BadRequestException('Invalid deliverable ID');
    }

    const deliverable = await this.deliverableModel.findById(deliverableId);
    if (!deliverable) {
      throw new NotFoundException('Deliverable not found');
    }

    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      deliverable.projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    const isBrand =
      project.brandId.toString() === reqUserId ||
      project.participants.some((p) => p.userId.toString() === reqUserId && (p.role === ProjectRole.OWNER || p.role === ProjectRole.CLIENT));
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    if (!isBrand && !isAdmin) {
      throw new ForbiddenException('Only the Brand or an Admin can request deliverable revisions');
    }

    if (!dto.feedback || !dto.feedback.trim()) {
      throw new BadRequestException('Feedback is required when requesting a revision');
    }

    deliverable.status = DeliverableStatus.REVISION_REQUIRED;
    deliverable.feedback = dto.feedback;
    deliverable.reviewedBy = new Types.ObjectId(reqUserId);
    deliverable.reviewedAt = new Date();

    if (deliverable.versions.length > 0) {
      const latest = deliverable.versions[deliverable.versions.length - 1];
      latest.status = DeliverableStatus.REVISION_REQUIRED;
      latest.feedback = dto.feedback;
      latest.reviewedBy = new Types.ObjectId(reqUserId);
      latest.reviewedAt = new Date();
    }

    const saved = await deliverable.save();

    if (deliverable.milestoneId) {
      await this.milestoneModel.findByIdAndUpdate(deliverable.milestoneId, {
        status: MilestoneStatus.REVISION_REQUIRED,
      });
    }

    await this.projectsService.logActivity(
      project._id as Types.ObjectId,
      new Types.ObjectId(reqUserId),
      ProjectActivityType.REVISION_REQUESTED,
      `Revision requested for deliverable: "${deliverable.title}". Feedback: ${dto.feedback}`,
      { deliverableId: deliverable._id, feedback: dto.feedback },
    );

    // Notify Professional
    await this.notificationsService.create({
      userId: project.professionalId,
      type: NotificationType.REVISION_REQUESTED,
      title: 'Revision Requested',
      message: `Brand requested revisions on "${deliverable.title}": "${dto.feedback}"`,
      link: `/projects/${project._id}`,
      metadata: { projectId: project._id, deliverableId: deliverable._id },
    });

    return saved;
  }

  async approve(
    deliverableId: string,
    dto: ApproveDeliverableDto,
    requestingUser: any,
  ): Promise<DeliverableDocument> {
    if (!Types.ObjectId.isValid(deliverableId)) {
      throw new BadRequestException('Invalid deliverable ID');
    }

    const deliverable = await this.deliverableModel.findById(deliverableId);
    if (!deliverable) {
      throw new NotFoundException('Deliverable not found');
    }

    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      deliverable.projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    const isBrand =
      project.brandId.toString() === reqUserId ||
      project.participants.some((p) => p.userId.toString() === reqUserId && (p.role === ProjectRole.OWNER || p.role === ProjectRole.CLIENT));
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    if (!isBrand && !isAdmin) {
      throw new ForbiddenException('Only the Brand or an Admin can approve deliverables');
    }

    deliverable.status = DeliverableStatus.APPROVED;
    deliverable.reviewedBy = new Types.ObjectId(reqUserId);
    deliverable.reviewedAt = new Date();

    if (deliverable.versions.length > 0) {
      const latest = deliverable.versions[deliverable.versions.length - 1];
      latest.status = DeliverableStatus.APPROVED;
      latest.reviewedBy = new Types.ObjectId(reqUserId);
      latest.reviewedAt = new Date();
    }

    const saved = await deliverable.save();

    // Check if milestone can be marked approved
    if (deliverable.milestoneId) {
      const remainingUnapproved = await this.deliverableModel.countDocuments({
        milestoneId: deliverable.milestoneId,
        status: { $ne: DeliverableStatus.APPROVED },
      });

      if (remainingUnapproved === 0) {
        await this.milestoneModel.findByIdAndUpdate(deliverable.milestoneId, {
          status: MilestoneStatus.APPROVED,
          progress: 100,
          completedAt: new Date(),
          completedBy: new Types.ObjectId(reqUserId),
        });
      }
    }

    await this.projectsService.logActivity(
      project._id as Types.ObjectId,
      new Types.ObjectId(reqUserId),
      ProjectActivityType.DELIVERABLE_APPROVED,
      `Deliverable approved: "${deliverable.title}"`,
      { deliverableId: deliverable._id },
    );

    await this.projectsService.recalculateProgress(project._id as Types.ObjectId);

    // Notify Professional
    await this.notificationsService.create({
      userId: project.professionalId,
      type: NotificationType.DELIVERABLE_APPROVED,
      title: 'Deliverable Approved!',
      message: `Brand approved your deliverable "${deliverable.title}"!`,
      link: `/projects/${project._id}`,
      metadata: { projectId: project._id, deliverableId: deliverable._id },
    });

    return saved;
  }
}
