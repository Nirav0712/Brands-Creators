import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';
import { Requirement, RequirementSchema } from '../requirements/schemas/requirement.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: Requirement.name, schema: RequirementSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
