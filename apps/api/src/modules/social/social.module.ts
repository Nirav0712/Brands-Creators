import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { SocialAccount, SocialAccountSchema } from './schemas/social-account.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';

import { InstagramGraphAdapter } from './adapters/instagram-graph.adapter';
import { YouTubeDataAdapter } from './adapters/youtube-data.adapter';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SocialAccount.name, schema: SocialAccountSchema },
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
    ]),
  ],
  controllers: [SocialController],
  providers: [SocialService, InstagramGraphAdapter, YouTubeDataAdapter],
  exports: [SocialService, InstagramGraphAdapter, YouTubeDataAdapter],
})
export class SocialModule {}
