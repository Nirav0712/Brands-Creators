import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShortlistsController } from './shortlists.controller';
import { ShortlistsService } from './shortlists.service';
import { Shortlist, ShortlistSchema } from './schemas/shortlist.schema';
import { BrandProfile, BrandProfileSchema } from '../brands/schemas/brand.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shortlist.name, schema: ShortlistSchema },
      { name: BrandProfile.name, schema: BrandProfileSchema },
    ]),
  ],
  controllers: [ShortlistsController],
  providers: [ShortlistsService],
  exports: [ShortlistsService],
})
export class ShortlistsModule {}
