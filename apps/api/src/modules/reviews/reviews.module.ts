import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './schemas/review.schema';
import { ReviewReport, ReviewReportSchema } from './schemas/review-report.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';
import { BrandProfile, BrandProfileSchema } from '../brands/schemas/brand.schema';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: ReviewReport.name, schema: ReviewReportSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: BrandProfile.name, schema: BrandProfileSchema },
    ]),
    NotificationsModule,
    forwardRef(() => ProjectsModule),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
