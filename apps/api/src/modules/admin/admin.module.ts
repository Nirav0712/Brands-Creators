import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';
import { BrandProfile, BrandProfileSchema } from '../brands/schemas/brand.schema';
import { ProductionTeamProfile, ProductionTeamProfileSchema } from '../production-teams/schemas/production-team.schema';
import { Requirement, RequirementSchema } from '../requirements/schemas/requirement.schema';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { SocialAccount, SocialAccountSchema } from '../social/schemas/social-account.schema';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: BrandProfile.name, schema: BrandProfileSchema },
      { name: ProductionTeamProfile.name, schema: ProductionTeamProfileSchema },
      { name: Requirement.name, schema: RequirementSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Category.name, schema: CategorySchema },
      { name: SocialAccount.name, schema: SocialAccountSchema },
    ]),
    AuditLogsModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
