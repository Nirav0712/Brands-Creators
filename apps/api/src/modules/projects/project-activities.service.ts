import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProjectActivity, ProjectActivityDocument } from './schemas/project-activity.schema';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectActivitiesService {
  constructor(
    @InjectModel(ProjectActivity.name)
    private readonly activityModel: Model<ProjectActivityDocument>,
    private readonly projectsService: ProjectsService,
  ) {}

  async findAll(projectId: string, requestingUser: any): Promise<ProjectActivityDocument[]> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    return this.activityModel
      .find({ projectId: project._id })
      .populate('actorId', 'fullName email avatarUrl username')
      .sort({ createdAt: -1 })
      .limit(50);
  }
}
