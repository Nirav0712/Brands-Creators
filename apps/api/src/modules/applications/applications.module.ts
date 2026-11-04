import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { Requirement, RequirementSchema } from '../requirements/schemas/requirement.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';
import { BrandProfile, BrandProfileSchema } from '../brands/schemas/brand.schema';
import { MatchingModule } from '../matching/matching.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Requirement.name, schema: RequirementSchema },
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: BrandProfile.name, schema: BrandProfileSchema },
    ]),
    MatchingModule,
    NotificationsModule,
    forwardRef(() => ProjectsModule),
    AuditLogsModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
