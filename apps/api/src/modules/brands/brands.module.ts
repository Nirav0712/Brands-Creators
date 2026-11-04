import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { BrandProfile, BrandProfileSchema } from './schemas/brand.schema';
import { SocialAccount, SocialAccountSchema } from '../social/schemas/social-account.schema';
import { Requirement, RequirementSchema } from '../requirements/schemas/requirement.schema';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BrandProfile.name, schema: BrandProfileSchema },
      { name: SocialAccount.name, schema: SocialAccountSchema },
      { name: Requirement.name, schema: RequirementSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}

