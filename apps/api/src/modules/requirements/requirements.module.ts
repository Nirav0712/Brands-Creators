import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Requirement, RequirementSchema } from './schemas/requirement.schema';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { BrandProfile, BrandProfileSchema } from '../brands/schemas/brand.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { MatchingModule } from '../matching/matching.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Requirement.name, schema: RequirementSchema },
      { name: BrandProfile.name, schema: BrandProfileSchema },
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    MatchingModule,
    NotificationsModule,
  ],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
