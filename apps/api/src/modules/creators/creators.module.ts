import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';
import { CreatorProfile, CreatorProfileSchema } from './schemas/creator.schema';
import { SocialAccount, SocialAccountSchema } from '../social/schemas/social-account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: SocialAccount.name, schema: SocialAccountSchema },
    ]),
  ],
  controllers: [CreatorsController],
  providers: [CreatorsService],
  exports: [CreatorsService],
})
export class CreatorsModule {}

