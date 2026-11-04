import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';
import { BrandProfile, BrandProfileSchema } from '../brands/schemas/brand.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: BrandProfile.name, schema: BrandProfileSchema },
    ]),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
