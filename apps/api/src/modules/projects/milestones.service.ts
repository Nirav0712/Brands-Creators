import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Milestone, MilestoneDocument } from './schemas/milestone.schema';
import { Project, ProjectDocument } from './schemas/project.schema';
import { ProjectsService } from './projects.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  MilestoneStatus,
  ProjectActivityType,
  NotificationType,
  UserRole,
} from '@brands-creators/types';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/create-milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(
    @InjectModel(Milestone.name)
    private readonly milestoneModel: Model<MilestoneDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly projectsService: ProjectsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(projectId: string, dto: CreateMilestoneDto, requestingUser: any): Promise<MilestoneDocument> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    let order = dto.order;
    if (!order) {
      const highestOrder = await this.milestoneModel
        .findOne({ projectId: project._id })
        .sort({ order: -1 });
      order = (highestOrder?.order || 0) + 1;
    }

    const milestone = new this.milestoneModel({
      projectId: project._id,
      title: dto.title,
      description: dto.description,
      order,
      status: MilestoneStatus.PENDING,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      progress: 0,
    });

    const saved = await milestone.save();

    await this.projectsService.logActivity(
      project._id as Types.ObjectId,
      new Types.ObjectId(reqUserId),
      ProjectActivityType.MILESTONE_CREATED,
      `Milestone created: "${saved.title}" (Order: ${saved.order})`,
      { milestoneId: saved._id, title: saved.title },
    );

    await this.projectsService.recalculateProgress(project._id as Types.ObjectId);

    const counterpartyId =
      project.brandId.toString() === reqUserId ? project.professionalId : project.brandId;
    await this.notificationsService.create({
      userId: counterpartyId,
      type: NotificationType.MILESTONE_ASSIGNED,
      title: 'New Milestone Created',
      message: `Milestone "${saved.title}" was added to project "${project.title}".`,
      link: `/projects/${project._id}`,
      metadata: { projectId: project._id, milestoneId: saved._id },
    });

    return saved;
  }

  async findAll(projectId: string, requestingUser: any): Promise<MilestoneDocument[]> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    return this.milestoneModel.find({ projectId: project._id }).sort({ order: 1 });
  }

  async update(
    milestoneId: string,
    dto: UpdateMilestoneDto,
    requestingUser: any,
  ): Promise<MilestoneDocument> {
    if (!Types.ObjectId.isValid(milestoneId)) {
      throw new BadRequestException('Invalid milestone ID');
    }

    const milestone = await this.milestoneModel.findById(milestoneId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      milestone.projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    if (dto.title !== undefined) milestone.title = dto.title;
    if (dto.description !== undefined) milestone.description = dto.description;
    if (dto.order !== undefined) milestone.order = dto.order;
    if (dto.dueDate !== undefined) milestone.dueDate = new Date(dto.dueDate);
    if (dto.progress !== undefined) milestone.progress = dto.progress;

    if (dto.status !== undefined) {
      const oldStatus = milestone.status;
      const newStatus = dto.status;

      // State machine validation
      const validTransitions: Record<MilestoneStatus, MilestoneStatus[]> = {
        [MilestoneStatus.PENDING]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.CANCELLED],
        [MilestoneStatus.IN_PROGRESS]: [MilestoneStatus.SUBMITTED, MilestoneStatus.IN_REVIEW, MilestoneStatus.CANCELLED],
        [MilestoneStatus.SUBMITTED]: [MilestoneStatus.IN_REVIEW, MilestoneStatus.APPROVED, MilestoneStatus.REVISION_REQUIRED, MilestoneStatus.COMPLETED],
        [MilestoneStatus.IN_REVIEW]: [MilestoneStatus.APPROVED, MilestoneStatus.REVISION_REQUIRED, MilestoneStatus.COMPLETED],
        [MilestoneStatus.REVISION_REQUIRED]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.SUBMITTED],
        [MilestoneStatus.APPROVED]: [MilestoneStatus.COMPLETED],
        [MilestoneStatus.COMPLETED]: [],
        [MilestoneStatus.CANCELLED]: [],
      };

      if (oldStatus !== newStatus && !validTransitions[oldStatus]?.includes(newStatus)) {
        throw new BadRequestException(`Invalid milestone status transition from ${oldStatus} to ${newStatus}`);
      }

      milestone.status = newStatus;

      if (newStatus === MilestoneStatus.COMPLETED || newStatus === MilestoneStatus.APPROVED) {
        milestone.completedAt = new Date();
        milestone.completedBy = new Types.ObjectId(reqUserId);
        milestone.progress = 100;
      }

      await this.projectsService.logActivity(
        project._id as Types.ObjectId,
        new Types.ObjectId(reqUserId),
        newStatus === MilestoneStatus.SUBMITTED
          ? ProjectActivityType.MILESTONE_SUBMITTED
          : ProjectActivityType.MILESTONE_UPDATED,
        `Milestone "${milestone.title}" status changed to ${newStatus}`,
        { milestoneId: milestone._id, oldStatus, newStatus },
      );
    }

    const updated = await milestone.save();
    await this.projectsService.recalculateProgress(project._id as Types.ObjectId);

    return updated;
  }
}
