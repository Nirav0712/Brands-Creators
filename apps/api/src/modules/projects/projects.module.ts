import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Milestone, MilestoneSchema } from './schemas/milestone.schema';
import { Deliverable, DeliverableSchema } from './schemas/deliverable.schema';
import { ProjectTask, ProjectTaskSchema } from './schemas/project-task.schema';
import { ProjectFile, ProjectFileSchema } from './schemas/project-file.schema';
import { ProjectActivity, ProjectActivitySchema } from './schemas/project-activity.schema';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { Requirement, RequirementSchema } from '../requirements/schemas/requirement.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MilestonesService } from './milestones.service';
import { DeliverablesService } from './deliverables.service';
import { ProjectTasksService } from './project-tasks.service';
import { ProjectFilesService } from './project-files.service';
import { ProjectActivitiesService } from './project-activities.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';

import { BrandProfile, BrandProfileSchema } from '../brands/schemas/brand.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Milestone.name, schema: MilestoneSchema },
      { name: Deliverable.name, schema: DeliverableSchema },
      { name: ProjectTask.name, schema: ProjectTaskSchema },
      { name: ProjectFile.name, schema: ProjectFileSchema },
      { name: ProjectActivity.name, schema: ProjectActivitySchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Requirement.name, schema: RequirementSchema },
      { name: User.name, schema: UserSchema },
      { name: 'BrandProfile', schema: BrandProfileSchema },
      { name: 'CreatorProfile', schema: CreatorProfileSchema },
    ]),
    NotificationsModule,
    MessagingModule,
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    MilestonesService,
    DeliverablesService,
    ProjectTasksService,
    ProjectFilesService,
    ProjectActivitiesService,
  ],
  exports: [
    ProjectsService,
    MilestonesService,
    DeliverablesService,
    ProjectTasksService,
    ProjectFilesService,
    ProjectActivitiesService,
  ],
})
export class ProjectsModule {}
