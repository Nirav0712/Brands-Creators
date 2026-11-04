import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProjectTask, ProjectTaskDocument } from './schemas/project-task.schema';
import { Project, ProjectDocument } from './schemas/project.schema';
import { ProjectsService } from './projects.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  TaskStatus,
  TaskPriority,
  ProjectActivityType,
  NotificationType,
  UserRole,
} from '@brands-creators/types';
import { CreateProjectTaskDto, UpdateProjectTaskDto } from './dto/create-task.dto';

@Injectable()
export class ProjectTasksService {
  constructor(
    @InjectModel(ProjectTask.name)
    private readonly taskModel: Model<ProjectTaskDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly projectsService: ProjectsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(projectId: string, dto: CreateProjectTaskDto, requestingUser: any): Promise<ProjectTaskDocument> {
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

    let assignedTo: Types.ObjectId | undefined;
    if (dto.assignedTo && Types.ObjectId.isValid(dto.assignedTo)) {
      assignedTo = new Types.ObjectId(dto.assignedTo);
    } else {
      assignedTo = project.professionalId;
    }

    const task = new this.taskModel({
      projectId: project._id,
      milestoneId,
      title: dto.title,
      description: dto.description,
      assignedTo,
      createdBy: new Types.ObjectId(reqUserId),
      priority: dto.priority || TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    const saved = await task.save();

    await this.projectsService.logActivity(
      project._id as Types.ObjectId,
      new Types.ObjectId(reqUserId),
      ProjectActivityType.TASK_CREATED,
      `Task created: "${saved.title}"`,
      { taskId: saved._id, assignedTo },
    );

    if (assignedTo && assignedTo.toString() !== reqUserId) {
      await this.notificationsService.create({
        userId: assignedTo,
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assigned',
        message: `You were assigned task "${saved.title}" in project "${project.title}".`,
        link: `/projects/${project._id}`,
        metadata: { projectId: project._id, taskId: saved._id },
      });
    }

    return saved;
  }

  async findAll(projectId: string, requestingUser: any): Promise<ProjectTaskDocument[]> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    return this.taskModel
      .find({ projectId: project._id })
      .populate('assignedTo', 'fullName email avatarUrl')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });
  }

  async update(
    taskId: string,
    dto: UpdateProjectTaskDto,
    requestingUser: any,
  ): Promise<ProjectTaskDocument> {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }

    const task = await this.taskModel.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      task.projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined) task.dueDate = new Date(dto.dueDate);
    if (dto.assignedTo && Types.ObjectId.isValid(dto.assignedTo)) {
      task.assignedTo = new Types.ObjectId(dto.assignedTo);
    }

    if (dto.status !== undefined) {
      task.status = dto.status;
      if (dto.status === TaskStatus.COMPLETED) {
        task.completedAt = new Date();
      }

      await this.projectsService.logActivity(
        project._id as Types.ObjectId,
        new Types.ObjectId(reqUserId),
        dto.status === TaskStatus.COMPLETED
          ? ProjectActivityType.TASK_COMPLETED
          : ProjectActivityType.TASK_UPDATED,
        `Task "${task.title}" status changed to ${dto.status}`,
        { taskId: task._id, status: dto.status },
      );
    }

    return task.save();
  }
}
